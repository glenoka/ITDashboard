# Dashboard IT — System Monitoring & Asset

Aplikasi monitoring IT terpusat untuk tim IT Support: dashboard operasional, monitoring host, CCTV, UniFi, Ruijie, history downtime, SOP & policy, checklist IT, dan manajemen market list (PR/Order → Aset IT).

- **Frontend:** React 18 (Create React App) — `http://localhost:3005`
- **Backend:** Node.js + Express (monolith) — `http://localhost:3002`
- **Database:** SQLite via `sql.js` (file `backend/noc.db`)
- **Real-time:** WebSocket (`ws`) + polling fallback

---

## Daftar Library yang Dibutuhkan

### Prasyarat Sistem
| Software | Keterangan |
|----------|-----------|
| **Node.js 18+ (LTS)** | Runtime backend & build frontend |
| **npm** | Package manager (ikut terpasang bersama Node.js) |
| **ffmpeg** | Hanya untuk live stream CCTV (RTSP → HLS). Bisa di-skip jika CCTV tidak dipakai |

### Backend (`backend/package.json`)
| Library | Fungsi |
|---------|--------|
| `express` | Web server & REST API |
| `ws` | WebSocket real-time (host/bandwidth/system) |
| `sql.js` | Database SQLite (WebAssembly, disimpan ke `noc.db`) |
| `axios` | HTTP client — monitoring HTTP, integrasi UniFi/Ruijie/Telegram |
| `ping` | Monitoring ICMP (host down/up + latency) |
| `systeminformation` | Metrik CPU/RAM/disk untuk panel Sistem |
| `node-cron` | Job terjadwal (auto-sync, cleanup data lama) |
| `node-fetch` | Fallback HTTP request |
| `digest-fetch` | Autentikasi digest untuk snapshot CCTV |
| `cors` | CORS untuk request frontend |

### Frontend (`frontend/package.json`)
| Library | Fungsi |
|---------|--------|
| `react` + `react-dom` | UI framework |
| `react-scripts` | Build & dev server (CRA) |
| `axios` | Panggilan API ke backend (lewat interceptor auth) |
| `chart.js` + `react-chartjs-2` | Grafik latency/bandwidth |
| `lucide-react` | Ikon UI |
| TailwindCSS (via CDN) | Styling (tidak perlu di-install, dimuat dari `public/index.html`) |

---

## Dokumentasi Instalasi (dari Awal)

### 1. Install Node.js
1. Download Node.js LTS dari https://nodejs.org
2. Install dengan pengaturan default.
3. Verifikasi di terminal:
   ```bash
   node -v   # harus >= v18.x
   npm -v
   ```

### 2. Install ffmpeg (opsional — hanya untuk CCTV live stream)
**Windows:** download dari https://www.gyan.dev/ffmpeg/builds/ → ekstrak → tambahkan folder `bin` ke `PATH` sistem.
**Linux (Debian/Ubuntu):**
```bash
sudo apt install ffmpeg
```

Verifikasi:
```bash
ffmpeg -version
```

### 3. Clone / salin project
```bash
git clone <url-repo> dashboard-it
cd dashboard-it
```

### 4. Install semua dependensi
```bash
npm run install:all
```
Script ini menjalankan `npm install` di `backend/` dan `frontend/`. Database `backend/noc.db` beserta seluruh tabel dibuat **otomatis saat pertama kali backend dijalankan**.

### 5. Menjalankan aplikasi (development)

**Cara cepat (Windows):** jalankan `start.bat` — otomatis membuka backend di port 3002, frontend di port 3005, lalu browser.

**Manual:**
```bash
# Terminal 1 — Backend (port default 3001, atau set PORT)
cd backend
set PORT=3002 && node server.js     # Windows CMD
# atau: PORT=3002 node server.js    # Linux/macOS

# Terminal 2 — Frontend (dev server CRA)
cd frontend
npm start
```
> Frontend dev server memakai `"proxy": "http://localhost:3002"` di `frontend/package.json` — pastikan port backend sesuai (mis. `PORT=3002 node server.js`). Jika backend di port lain, sesuaikan proxy-nya.

### 6. Login pertama
1. Buka `http://localhost:3005` (atau `http://localhost:3000`).
2. Login: username `admin`, password default `admin`.
3. Ganti password lewat ikon ⚙ di header → **Ubah Password** (atau set env `ADMIN_PASSWORD` sebelum run pertama).

### 7. Build production & deploy
```bash
npm run build:frontend
# Output: frontend/build/  — siap disajikan via nginx (contoh config di bawah)
```

---

## Konfigurasi

### Environment Variables

Backend:
```
PORT=3001             # Backend port (default: 3001)
ADMIN_PASSWORD=admin  # Password login (default: admin)
```

Frontend:
```
REACT_APP_API_URL=http://your-server:3002   # Backend URL (untuk production)
```

### Login

- Halaman login muncul sebelum dashboard terbuka.
- Password default: `admin` (bisa diubah via env `ADMIN_PASSWORD`; dibuat di tabel `app_settings` saat first-run).
- Password bisa diubah dari dalam aplikasi lewat tombol **Settings** (ikon ⚙ di header) → *Ubah Password*.
- Token tersimpan di `localStorage` (key `dashboard_it_token`), TTL 24 jam.
- Semua endpoint `/api/*` dilindungi `requireAuth` (header `Authorization: Bearer <token>` atau query `?token=` untuk `<img>`/snapshot).

---

## Notifikasi & Perintah Telegram

### Cara Membuat Bot Telegram

1. Buka aplikasi **Telegram**, cari akun resmi **@BotFather** (username `@BotFather`, bercentang).
2. Ketik perintah:
   ```
   /newbot
   ```
3. Ikuti pertanyaan BotFather:
   - **Name** — nama bot yang tampil di chat, mis. `IT Alert Dashboard`.
   - **Username** — harus diakhiri `bot`, mis. `dashboard_it_alert_bot`.
4. BotFather mengirim **Bot Token**, contoh:
   ```
   123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Simpan token ini — token inilah satu-satunya "password" untuk mengontrol bot.

### Mendapatkan Chat ID

Bot hanya bisa mengirim pesan ke akun/group yang sudah "menekan Start". Untuk mendapatkan Chat ID:

1. Buka bot yang baru dibuat → tekan **Start** (bisa kirim pesan apa saja).
2. Buka **@userinfobot** → tekan Start → ia akan menampilkan ID angka Anda.
3. Chat ID bisa lebih dari satu (dipisah koma) jika ingin notifikasi ke beberapa akun/group.

> Alternatif: Chat ID juga bisa dibaca dari respons `getUpdates` Telegram API:
> ```bash
> curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
> ```
> Cari field `message.chat.id`.

### Menghubungkan Bot ke Dashboard

1. Login ke dashboard → klik ikon ⚙ (header) → **Pengaturan** → **Notifikasi Telegram**.
2. Isi:
   - **Bot Token** — token dari @BotFather.
   - **Chat ID** — ID dari @userinfobot (bisa beberapa, dipisah koma).
3. Centang/aktifkan **Aktifkan Bot Telegram**.
4. Klik **Kirim Uji Coba** — pesan uji harus muncul di Telegram Anda.
5. Simpan. Polling bot otomatis berjalan; restart otomatis saat settings diubah; berhenti jika token tidak valid.

### Fitur yang Didapat

- **Alert otomatis** DOWN/RECOVERED untuk host, CCTV, UniFi, dan Ruijie.
- **Perintah 2 arah** dari chat Telegram:

| Perintah | Aksi |
|----------|------|
| `/cctv` | Daftar kamera CCTV + status |
| `/cctv <id atau nama>` | Kirim snapshot terbaru kamera |
| `/procurement` | List barang PR/Order yang belum datang |
| `/checklist` | Checklist project yang belum selesai (tekan ✅ untuk menandai selesai) |
| `/project` | List project yang masih pending (tekan ✅ untuk menandai selesai) |
| `/project_add <judul>` | Tambah project task baru |
| `/order_add` | Tambah order baru (guided input: kode PR → nama item) |
| `/ping <ip>` | Ping host/IP |
| `/status` | Ringkasan host & CCTV |
| `/stats` | Ringkasan CPU/RAM/Disk & bandwidth |
| `/report` | Laporan harian (host, CCTV, order, checklist, project, sistem) |
| `/backup` | Kirim backup database ke Telegram sekarang |
| `/cancel` | Batalkan input yang sedang berjalan |
| `/help` | Daftar perintah |

**Menu inline:** pesan `/start`/`/help` menampilkan keyboard (CCTV, Status, PR/Order, Checklist, Project, Bantuan) yang di-*pin* agar selalu tampil di atas chat.

### Backup & Laporan Otomatis

- **Backup DB** setiap pukul **02:00** (waktu server): `noc.db` di-*gzip* → dikirim ke chat Telegram → disimpan di `backend/backups/` dengan **rotasi 14 file** terbaru. Perintah `/backup` untuk backup manual.
- **Laporan harian** setiap pukul **07:00**: ringkasan status host/CCTV, PR/Order pending, checklist/project belum selesai, serta CPU/RAM/Disk. Perintah `/report` untuk laporan on-demand.

### Cara Kerja & Catatan Penting

- Implementasi: **long polling `getUpdates`** di backend (tanpa webhook), tabel `telegram_settings` (id=1), endpoint `GET/PUT /api/notifications/telegram/settings` + `POST .../test`.
- Bot hanya merespons `chat_id` yang terdaftar di pengaturan.
- **Satu bot token hanya boleh dipakai satu server polling.** Jika project ini di-copy ke deployment lain, buat bot baru (langkah di atas) dan isi token barunya — jangan pakai token yang sama di dua server bersamaan.
- Snapshot CCTV dikirim sebagai foto via `sendPhoto` (butuh kamera yang dapat diakses backend).

---

## Nginx (Production)

```nginx
server {
    listen 80;
    root /path/to/dashboard-it/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3002;
    }

    location /hls/ {
        proxy_pass http://localhost:3002;
    }

    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Struktur Halaman

| Tab | Deskripsi |
|-----|-----------|
| DASHBOARD | Ringkasan operasional: checklist project, down list semua kategori, PR lama, Monitoring Server (sistem & bandwidth) |
| HOST CONNECTION | Status host real-time, charts, kelola host |
| CCTV | Grid kamera, snapshot, live stream |
| UNIFI | Perangkat UniFi Controller (status/klien/sync/restart) |
| RUIJIE | Perangkat Ruijie Cloud (AppID + Key, restart) |
| PR/ORDER | Market list IT — barang di-PR/di-order belum datang |
| ASET IT | Inventaris aset (auto-create saat order "TIBA") |
| SOP | SOP & policy IT — dokumen dinamis, editable via UI |
| CHECKLIST | Checklist harian/mingguan/bulanan/tahunan/event + kelola tugas + project |
| HISTORY | History downtime terpusat, filter (termasuk RESTART) & export |

> Tab bisa disembunyikan/ditampilkan: ikon ⚙ → **Pengaturan** → toggle per menu (tersimpan per browser; tab Dashboard selalu tampil).

---

## Data Retention

- Monitoring logs & status events: 90 hari
- Bandwidth & system metrics: 30 hari

---

## Catatan

- Backup file lama (`backend/server - Copy.js`, `noc.db (2).bak`) tidak dipakai — jangan diedit.
- `Topology Map` dan integrasi `Mikrotik` sudah dihapus.
- Verifikasi perubahan backend: `node --check backend/server.js`; frontend: `npm run build`.
