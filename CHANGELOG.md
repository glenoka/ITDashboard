# Changelog — Dashboard IT

Catatan perubahan & insiden. Entri terbaru di atas.

---

## 2026-10-15 — Pemulihan database korup + keandalan penulisan DB & Telegram

**Status:** selesai, sudah di-deploy ke server produksi (`it-dashboard`, `https://…`, backend port 3002).

### Ringkasan insiden

- `backend/noc.db` di server produksi mengalami **korupsi/oversized** sehingga proses
  backend crash dan **restart berulang** (systemd `NRestarts` sempat mencapai 8078).
- Dampak: dashboard tidak stabil, notifikasi/perintah Telegram terputus-putus
  (`ECONNABORTED` / `ECONNRESET`), backup harian berisiko tidak konsisten.
- Penyebab akar yang teridentifikasi:
  1. `sql.js` menulis **seluruh file DB** dengan `fs.writeFileSync(DB_PATH, …)` —
     **bukan atomik**. Jika proses mati / listrik hilang saat menulis, file bisa
     setengah tertulis → korup.
  2. `saveDB()` dipanggil pada **setiap cek host** (~12x/menit) untuk DB ±27 MB →
     event loop jenuh dan I/O disk berlebihan.
  3. Tidak ada penanganan error transien jaringan saat memanggil Telegram API.

### Tindakan pemulihan

- DB korup asli **diarsipkan sebagai bukti** (tidak ditimpa):
  `/home/itkbm/db-rescue-20261015-151418/`.
- DB live dipulihkan & diverifikasi sehat:
  - ukuran **4.550.656 byte**, `PRAGMA quick_check` → **ok**
  - isi: hosts 13, cctv 9, orders 18, assets 7, `status_events` 4.135, `monitoring_logs` 93.198
- Arsip baris monitoring lama dibuat sebelum retensi dipangkas:
  `backend/backups/monitoring_logs_archive_before_20261015.sql.gz` (dipakai kalau
  butuh detail history lama).
- Backup hari itu (`backups/noc-backup-2026-10-15.db.gz`, 917.112 byte) diverifikasi
  utuh: `gzip` ok, `quick_check` ok, hosts 13, orders 18, logs 93.177.

### Perubahan kode — `backend/server.js`

**1. Penulisan DB atomik**

```js
function writeDB() {
  const data = db.export();
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(data));
  fs.renameSync(tmp, DB_PATH);   // rename = atomik, noc.db tak pernah setengah tertulis
}
```

`saveDB()` sekarang memakai `writeDB()` dan membatalkan jadwal tunda yang tertunda
(agar data bisnis selalu langsung ke disk tanpa menulis dua kali).

**2. Penulisan tertunda / koalesensi untuk log bervolume tinggi**

- `saveDBDeferred()` — menulis disk **maksimal 1x per 20 detik** (`SAVE_DEFER_MS`).
- `dbRun(sql, params, opts)` — opsi `opts.defer`.
- Insert `monitoring_logs` (tiap cek host) memakai `{ defer: true }`.
- Data bisnis (order, checklist, settings, dsb.) tetap **langsung** ditulis.

**3. Flush saat proses berhenti**

- `flushAndExit()` membatalkan timer tunda lalu menulis DB sinkron.
- Dipasang di handler `SIGINT`, `SIGTERM`, dan `process.on('exit')` (jaring pengaman
  terakhir, termasuk saat `/restart` dan uncaught exception) → tidak ada baris
  monitoring yang hilang saat restart.

**4. Retry panggilan Telegram API**

- `withTelegramRetry(label, factory, attempts = 3)` — retry dengan backoff
  `1500 * (i + 1)` ms, hanya untuk error transien.
- `isTransientTelegramError()` → `HTTP 5xx` atau kode:
  `ECONNABORTED`, `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`, `EHOSTUNREACH`,
  `ENETUNREACH`, `EAI_AGAIN`, `ENOTFOUND`, `EPIPE`, `ERR_NETWORK`.
- Dipakai oleh `telegramApi()` (semua method), `telegramSendDocument()`, dan
  `telegramSendPhoto()`.
- Paksa **IPv4** (`family: 4`) di semua request Telegram — server punya IPv6 ULA
  tanpa rute yang membuat koneksi flaky.
- Log error diperkaya: menyertakan `e.code` bila ada.

**5. Retensi & VACUUM**

- `monitoring_logs`: **14 hari** (sebelumnya 90 hari) — tabel ini ±90% ukuran file DB
  dan bertambah ~10 ribu baris/hari. Detail lama ada di file arsip.
- `status_events`: 90 hari. `bandwidth_logs` / `system_metrics` / `speedtest_logs`: 30 hari.
- `cleanupLogs()` menjalankan `VACUUM` **hanya bila** `PRAGMA freelist_count > 1000`
  halaman, agar ruang benar-benar kembali ke OS tanpa boros I/O.

### Verifikasi pasca-deploy

| Item | Hasil |
|------|-------|
| md5 `backend/server.js` (live = lokal) | `954e8f0f8700a6a747ad035d06fe7352` |
| systemd `dashboard-it` | `active`, MainPID 239483, start 16:12:10 |
| Latensi HTTP lokal | 0,8–7,6 ms |
| Koneksi Telegram | `ESTAB` ke `149.154.166.110:443` |
| `sendMessage` / `sendDocument` / `sendPhoto` | ok (919 ms / 1485 ms / 379 ms) |
| Retry bekerja (journal) | `[telegram] sendMessage gagal (ECONNABORTED), coba lagi dalam 1500ms`, `getUpdates gagal (ECONNRESET), … 3000ms` |
| DB live | `quick_check: ok`, 4.550.656 byte |

- Rollback tersedia: `backend/server.js.bak-20261015-161205` (dan `…160647`, `…155648`).
- Bersih-bersih file uji sementara di server selesai; disk 5,9 GB bebas (58% terpakai).

### Catatan operasional (produksi)

- **Restart service:** `kill -9 <MainPID>` (unit `Restart=on-failure`). **Jangan**
  SIGTERM — keluar bersih tidak di-restart otomatis.
- Unit: `User=itkbm`, `WorkingDirectory=/home/itkbm/dashboard-it/backend`,
  `PORT=3002`, `Restart=on-failure`, `RestartSec=5`.
- Frontend disajikan **nginx (:80)** dari `frontend/build`; backend (:3002)
  melayani `/api/*`, `/hls/*`, `/ws` dan **tidak** menyajikan UI.
- `systemctl restart dashboard-it` gagal ("Interactive authentication required");
  tidak ada sudo tanpa password.

### Dokumentasi diperbarui

- `README.md` — bagian *Data Retention* disesuaikan (monitoring logs 14 hari).
- `AGENTS.md` — catatan retensi & penulisan DB diperbarui.
