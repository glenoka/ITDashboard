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

## Pending
- [ ] Uji runtime menyeluruh (backend baru port 3002 + frontend)
- [ ] Opsional: polish `index.css` / styling sesuai kebutuhan
- [ ] Opsional: dokumentasi lanjutan / fitur baru
