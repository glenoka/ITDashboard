# TODOLIST — Dashboard IT (Monitoring & Asset)

## Phase 0 — Setup Project
- [x] Copy project dari `C:\laragon\www\noc-dashboard2` → `D:\Project_ITDashboard\dashboard-it`
- [x] Hapus `NotificationManager.js`, `MikrotikPage.js`, `TopologyMap.js`
- [x] Buat `.gitignore` (node_modules, build, noc.db, backup)
- [x] npm install backend & frontend
- [x] Rebranding ke "Dashboard IT" / "DASHBOARD IT" / "SYSTEM MONITORING & ASSET" (index.html, package.json, Header, LoginPage)
- [x] Update `README.md` + `AGENTS.md`

## Phase 1/8 — Auth & Market List IT (Backend)
- [x] Auth: login/logout/check, `initAuthTable`, `verifyPassword`, `createToken`, `validToken`, `requireAuth`
- [x] Hapus `initTopologyTables`, `initTopoMonitoring`, monitoring/WS events topo, `import-to-topology`, kategori `topology` dari summary/history
- [x] `initProcurementTable()` + CRUD `/api/orders`, `/api/assets`, `POST /api/orders/:id/arrive` (auto asset per qty)
- [x] `node --check server.js` OK + verifikasi runtime port 3002 (401/403 login salah, login benar → token, authed API OK)

## Phase 1/8 — Auth & Market List IT (Frontend)
- [x] `AuthContext.js` (axios interceptor + `API` export), `api.js` (`authUrl`)
- [x] `LoginPage.js`, `ConfirmModal.js`, `MarkdownExportModal.js`, `utils/format.js`
- [x] `ProcurementPage.js`, `AssetPage.js` (CRUD, "TIBA → ASET", Export Markdown)
- [x] `Header.js` tab baru + tombol LOGOUT; `App.js` rewrite (auth gate, WS token, polling pause)
- [x] `HistoryPage.js` category meta unifi/ruijie, hapus topology

## Phase 1/8 — Bersihkan Referensi Topology / Dead Code
- [x] Hapus tombol + handler "Import ke Map" di `UnifiPage.js` dan `RuijiePage.js`
- [x] Hapus hardcoded credentials (URL/user Unifi, AppID Ruijie) → kosong, isi via SETTING
- [x] `CCTVPage.js` pakai `authUrl` untuk snapshot (token via query) di tile + fullscreen modal
- [x] `Header.js` hapus blok label "topology"
- [x] Build frontend sukses (`npm run build`)

## Phase 2 — Checklist Tab Project & Run di Port Baru
- [x] Backend route checklist project (`/api/checklist/projects` CRUD + toggle) + broadcast WS
- [x] Frontend tab "Project" di `ChecklistPage.js` + `ProjectChecklist.js` (item aktif tampil, selesai tersembunyi ke section)
- [x] Run backend `PORT=3002`, frontend `PORT=3005`; fallback API/WS dipindah ke 3002
- [x] Git init, commit `89c8198`, push ke `origin/main` (github.com/glenoka/ITDashboard)

## Phase 3 — Redesign UI (Dark + Light)
- [x] Fondasi tema: design tokens di `index.css`, `ThemeContext.js`, `index.html`, `App.js`, `Header.js` (toggle ☀️/🌙), `LoginPage.js`
- [x] Restyle halaman dashboard: `SummaryCards.js`, `SystemPanel.js`, `BandwidthPanel.js`, `ChartsPanel.js`, `MonitoringTable.js`
- [x] Restyle komponen: `NotificationBanner.js`, `AlertToast.js`, `AddHostModal.js`, `HostDetailModal.js`, `MarkdownExportModal.js`, `ConfirmModal.js`, `LiveModal.js`
- [x] Restyle halaman fitur: `CCTVPage.js`, `HistoryPage.js`, `UnifiPage.js`, `RuijiePage.js`, `ProcurementPage.js`, `AssetPage.js`, `SOPPage.js`, `ChecklistPage.js`, `ProjectChecklist.js`
- [x] Konversi `SOPPage.js`/`ChecklistPage.js` dari `React.createElement` → JSX
- [x] Design tokens: aksen indigo `#635BFF`, green khusus status Up (`--success`), light mode soft gray `#EDEFF3`, font Inter (hapus Syne/Plus Jakarta Sans), JetBrains Mono untuk angka, radius/shadow minimal
- [x] Semua ikon emoji → `lucide-react` (stroke 1.5px) via helper `Icon.js`; sisa `var(--accent)` dijamin bermakna aksen UI, bukan status
- [x] Status online/Up konsisten `var(--success)` + `rgba(16,185,129,…)` di semua halaman (Host, CCTV, UniFi, Ruijie, History, LiveModal); info blue `rgba(56,189,248,…)` → `rgba(59,130,246,…)`
- [x] Build frontend sukses (`npm run build`), dev server 3005 compile bersih

## Pending
- [ ] Uji visual tiap halaman di `http://localhost:3005` (dark + light) + verifikasi WS/API 3002
- [ ] Commit & push perubahan tema ke `origin/main`
- [ ] Opsional: dokumentasi lanjutan / fitur baru
