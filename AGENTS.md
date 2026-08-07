# Dashboard IT — Agent Guide

## Quick start

```bash
# Install everything
npm run install:all

# Start backend (port 3001) + frontend dev server (port 3000)
npm run start:backend   # or: cd backend && node server.js
npm run start:frontend  # or: cd frontend && npm start

# Build frontend for production
npm run build:frontend  # or: cd frontend && npm run build
```

Frontend dev server proxies `/api/*` and WebSocket to `localhost:3001` via CRA's `"proxy"` field.

## Architecture

| Layer | Dir | Entry | Port |
|-------|-----|-------|------|
| Backend | `backend/` | `server.js` (monolith) | 3001 |
| Frontend | `frontend/` | `src/index.js` → `App.js` | 3000 (CRA) |

- **Database:** SQLite via `sql.js` at `backend/noc.db` — no migrations, no ORM. Schema is created on startup if missing.
- **Real-time:** WebSocket (native `ws`) on the same HTTP server. HTTP polling fallback (hosts 5s, system 5s, bandwidth 1s).
- **Auth:** Single-admin. Password default `admin` (env `ADMIN_PASSWORD`), token via `crypto.randomBytes(32)` di memory-map `authTokens`, TTL 24 jam. `requireAuth` melindungi semua `/api/*` kecuali `/api/auth/login`. Token bisa lewat header `Authorization: Bearer` atau query `?token=` (untuk `<img>` snapshot / HLS). WebSocket pakai `?token=` di URL query.
- **Telegram bot:** Notifikasi DOWN/RECOVERED (host/CCTV/UniFi/Ruijie) + perintah 2 arah via long polling `getUpdates` (tanpa webhook). Config di tabel `telegram_settings` (id=1), endpoint `GET/PUT /api/notifications/telegram/settings` + `POST .../test`. Perintah: `/cctv`, `/cctv <id|nama>` (kirim snapshot via `captureCameraSnapshot()`), `/procurement`, `/checklist`, `/project`, `/project_add <judul>`, `/order_add`, `/ping <ip>`, `/status`, `/stats`, `/cancel`, `/help`. Polling dimulai saat boot jika `enabled`, auto-restart saat settings diubah, stop jika token invalid. Hanya merespons `chat_id` terdaftar. **Inline keyboard** (`TG_KEYBOARD_MAIN` + `procurementKeyboard()`/`orderActionKeyboard()`/`cctvKeyboard()`) diproses di `handleTelegramCallback` (callback `callback_query`); tombol menjalankan handler yang sama seperti perintah `/`. Pesan `/start`/`/help` & `⚙️ Bantuan` di-`pin` via `telegramPinMessage` supaya menu selalu tampil di atas. **Tambah order** (`/order_add` atau tombol) = guided 2-langkah via state `telegramOrderState` (Map per `chat_id`: `waiting_pr` → `waiting_item`), timeout 10 menit, `/cancel` membatalkan; hasil `INSERT INTO it_orders` + broadcast `order_added`.
- **Language:** Indonesian (UI labels, SOP docs, checklist items, error messages, comments).
- **UI:** TailwindCSS (loaded via CDN in `public/index.html` — no build-time purging) + custom dark theme in `index.css`.

## Project conventions

- **No tests, no linter, no formatter, no typecheck** configured. Verify with `node --check server.js` and `npm run build` (frontend).
- **Backend is a single file.** Do not split `server.js` without explicit request.
- **Frontend uses JSX** across all components (CRA default). Some older pages use `React.createElement` — don't follow that pattern for new code.
- **No JS framework routing** — `activePage` state in `App.js` switches between page components.
- **No env file** — backend uses `PORT` env var (default 3001) and `ADMIN_PASSWORD`; frontend uses `REACT_APP_API_URL` in production.
- **Axios calls** go through the interceptor in `src/context/AuthContext.js` (auto-adds token). For `<img>`/HLS use `authUrl(path)` from `src/api.js` to append `?token=`.
- **Market List IT:** `initProcurementTable()` in `server.js`; CRUD `/api/orders`, `/api/assets`, `POST /api/orders/:id/arrive` (auto-create asset per qty).
- **Hide tab:** preferensi tampil/sembunyi tab disimpan di `localStorage` (key `dashboard_it_hidden_tabs`, daftar id yang di-hide), dikelola via `SettingsModal` (ikon gear). `ALL_TABS` di `src/utils/tabs.js`; tab Dashboard selalu tampil. Jika halaman aktif di-hide, `App.js` otomatis pindah ke dashboard.
- **Dashboard:** System & Bandwidth panel (datanya tetap di-poll di `App.js`) dirender di bagian bawah `DashboardPage` (section "Monitoring Server"); halaman Host Connection hanya berisi NotificationBanner, SummaryCards, MonitoringTable, ChartsPanel.
- **Restart perangkat:** tombol Restart di halaman UniFi/Ruijie (`POST /api/unifi/reboot`, `/api/ruijie/reboot`) dengan `ConfirmModal`; event `RESTART` tercatat di history.

## Notable quirks

- **HLS streaming** for CCTV requires `ffmpeg` on the system PATH (invoked as subprocess).
- **UniFi / Ruijie integrations** communicate over HTTPS with `rejectUnauthorized: false`.
- **Topology Map & Mikrotik sudah dihapus** — jangan buat ulang endpoint/komponen terkait.
- **Backup files present** (`backend/server - Copy.js`, `backend/noc.db (2).bak`) — avoid editing them; work with the live files.
- **Data retention:** monitoring logs & status events kept 90 days, bandwidth & system metrics 30 days (hard-coded in `server.js`).
- **Dev runtime:** backend lama mungkin masih jalan di port 3001/3002 → uji backend baru pakai `PORT` lain yang bebas (cek `Get-NetTCPConnection` bila perlu). **Jangan jalankan 2 instance backend di port yang sama** — akan `EADDRINUSE`. Kalau user mengelola backend sendiri, agent tidak boleh spawn instance kedua di port 3002.
