# Dashboard IT — System Monitoring & Asset

Aplikasi monitoring IT terpusat untuk tim IT Support: dashboard operasional, monitoring host, CCTV, UniFi, Ruijie, history downtime, SOP & policy, checklist IT, dan manajemen market list (PR/Order → Aset IT).

## Fitur

- ✅ Monitoring host real-time (ICMP + HTTP) dengan WebSocket
- ✅ Charts latency + uptime % (SQLite persistence)
- ✅ Alert toast real-time saat host down/recovered + notifikasi browser
- ✅ CCTV monitoring dengan snapshot & live stream (RTSP → HLS, butuh ffmpeg)
- ✅ Integrasi UniFi Controller (status perangkat, klien)
- ✅ Integrasi Ruijie Cloud
- ✅ History downtime terpusat (host / CCTV / UniFi / Ruijie), filter & export Markdown
- ✅ Dashboard operasional: ringkasan down list (Jaringan/CCTV/UniFi/Ruijie), PR lama > 2 minggu, checklist project
- ✅ SOP & Policy IT — dokumen dinamis, tambah/edit/hapus via UI (tersimpan di database)
- ✅ Checklist IT (harian/mingguan/bulanan/tahunan/event) — kelola definisi tugas via UI
- ✅ Checklist project (task dinamis buatan user, quick-add dari dashboard)
- ✅ Market List IT: PR/Order → tombol "TIBA → ASET" otomatis buat aset per qty
- ✅ Inventaris Aset IT (nama barang, brand, pembelian, lokasi)
- ✅ Export Markdown untuk daftar order/aset/history
- ✅ Login single-admin (password env `ADMIN_PASSWORD`, default `admin`) + ubah password via UI
- ✅ Notifikasi & perintah **Telegram 2 arah**: alert DOWN/RECOVERED (host/CCTV/UniFi/Ruijie) + `/cctv`, `/cctv <id|nama>` (kirim snapshot), `/status`, `/stats`, `/help`
- ✅ Tab bisa disembunyikan/ditampilkan (ikon gear → Pengaturan), tersimpan di browser
- ✅ Restart perangkat UniFi/Ruijie langsung dari UI (dengan konfirmasi, tercatat di history sebagai RESTART)
- ✅ Dark/light theme, responsive

## Stack

- **Frontend**: React 18 (CRA), TailwindCSS via CDN, Chart.js
- **Backend**: Node.js, Express 4, WebSocket (`ws`)
- **Storage**: SQLite via `sql.js` (`backend/noc.db`)
- **Monitoring**: `ping`, `axios`, `systeminformation`
- **Integrasi**: `digest-fetch` (CCTV), UniFi API, Ruijie API
- **Streaming**: ffmpeg (subprocess) untuk CCTV live

## Quick Start

### Prerequisites
- Node.js 18+
- ffmpeg (untuk live stream CCTV)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start the backend

```bash
npm run start:backend
# Runs on http://localhost:3001
```

### 3. Start the frontend (development)

```bash
npm run start:frontend
# Runs on http://localhost:3000
```

### 4. Production build

```bash
npm run build:frontend
# Output: frontend/build/
```

## Konfigurasi

### Environment Variables

Backend:
```
PORT=3001             # Backend port (default: 3001)
ADMIN_PASSWORD=admin  # Password login (default: admin)
```

Frontend:
```
REACT_APP_API_URL=http://your-server:3001   # Backend URL (untuk production)
```

### Login

- Halaman login muncul sebelum dashboard terbuka.
- Password default: `admin` (bisa diubah via env `ADMIN_PASSWORD`; dibuat di tabel `app_settings` saat first-run).
- Password bisa diubah dari dalam aplikasi lewat tombol **Settings** (ikon ⚙ di header) → *Ubah Password*.
- Token tersimpan di `localStorage` (key `dashboard_it_token`), TTL 24 jam.
- Semua endpoint `/api/*` dilindungi `requireAuth` (header `Authorization: Bearer <token>` atau query `?token=` untuk `<img>`/snapshot).

### Notifikasi & Perintah Telegram

1. Buat bot di Telegram: cari **@BotFather** → `/newbot` → simpan **Bot Token**.
2. Tekan **Start** pada bot, lalu cek **Chat ID** via **@userinfobot** (atau dari `getUpdates`).
3. Di dashboard: ikon ⚙ → **Pengaturan** → **Notifikasi Telegram** → isi token + chat id, aktifkan, klik **Kirim Uji Coba**.
4. Setelah aktif, bot mengirim alert otomatis saat host/CCTV/UniFi/Ruijie down/recover, dan bisa dipanggil 2 arah:

| Perintah | Aksi |
|----------|------|
| `/cctv` | Daftar kamera CCTV + status |
| `/cctv <id/nama>` | Kirim snapshot terbaru kamera |
| `/status` | Ringkasan host & CCTV |
| `/stats` | Ringkasan CPU/RAM/Disk & bandwidth |
| `/help` | Daftar perintah |

- Implementasi: long polling `getUpdates` di backend (tanpa webhook), tabel `telegram_settings` (id=1), endpoint `GET/PUT /api/notifications/telegram/settings` + `POST .../test`. Bot hanya merespons `chat_id` yang terdaftar. Setiap deployment harus memakai bot token sendiri (satu token = satu server polling).

### Nginx (Production)

```nginx
server {
    listen 80;
    root /path/to/dashboard-it/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3001;
    }

    location /hls/ {
        proxy_pass http://localhost:3001;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

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

## Data Retention

- Monitoring logs & status events: 90 hari
- Bandwidth & system metrics: 30 hari

## Catatan

- Backup file lama (`backend/server - Copy.js`, `noc.db (2).bak`) tidak dipakai — jangan diedit.
- `Topology Map` dan integrasi `Mikrotik` sudah dihapus.
