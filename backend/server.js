const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const initSqlJs = require('./node_modules/sql.js');
const ping = require('ping');
const axios = require('axios');
const { DigestClient } = require('./node_modules/digest-fetch');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'noc.db');

let db;
let SQL;

async function initDB() {
  SQL = await initSqlJs();
  
  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS hosts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'ip',
      category TEXT DEFAULT '',
      interval INTEGER NOT NULL DEFAULT 60,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS monitoring_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      latency REAL,
      status_code INTEGER,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bandwidth_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rx_speed REAL, tx_speed REAL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpu_usage REAL, mem_used REAL, mem_total REAL,
      disk_used REAL, disk_total REAL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      entity_name TEXT NOT NULL,
      entity_target TEXT DEFAULT '',
      status TEXT NOT NULL,
      latency REAL,
      occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS telegram_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      bot_token TEXT DEFAULT '',
      chat_id TEXT DEFAULT '',
      enabled INTEGER DEFAULT 0
    );
  `);
  saveDB();

  const tg = dbGet('SELECT id FROM telegram_settings WHERE id = 1');
  if (!tg) {
    dbRun('INSERT INTO telegram_settings (id, bot_token, chat_id, enabled) VALUES (1, ?, ?, 0)', ['', '']);
  }
  saveDB();
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helpers
function dbAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) { return []; }
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  saveDB();
  return id;
}

// In-memory state
const hostStatus = {};
const monitoringTimers = {};

// WebSocket broadcast
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// Log a status transition (UP<->DOWN) for unified history across all categories
function logStatusEvent(category, entityId, entityName, entityTarget, status, latency) {
  try {
    dbRun(
      'INSERT INTO status_events (category, entity_id, entity_name, entity_target, status, latency) VALUES (?,?,?,?,?,?)',
      [category, entityId, entityName, entityTarget || '', status, latency != null ? latency : null]
    );
  } catch (e) { /* non-fatal */ }
}

// ── TELEGRAM (Notifikasi 1 arah + Perintah 2 arah) ─────────────────────────
const TG_API = 'https://api.telegram.org';

function getTelegramSettings() {
  return dbGet('SELECT bot_token, chat_id, enabled FROM telegram_settings WHERE id = 1') || { bot_token: '', chat_id: '', enabled: 0 };
}

async function telegramApi(method, payload = {}, timeout = 15000) {
  const { bot_token } = getTelegramSettings();
  if (!bot_token) return null;
  const res = await axios.post(`${TG_API}/bot${bot_token}/${method}`, payload, { timeout });
  return res.data;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function telegramSendText(chatId, text) {
  try {
    return await telegramApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (e) {
    console.error('[telegram] sendMessage failed:', e.message);
    return null;
  }
}

async function telegramSendPhoto(chatId, buffer, caption) {
  try {
    const { bot_token } = getTelegramSettings();
    if (!bot_token) return null;
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'snapshot.jpg');
    if (caption) form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    const res = await axios.post(`${TG_API}/bot${bot_token}/sendPhoto`, form, { timeout: 30000 });
    return res.data;
  } catch (e) {
    console.error('[telegram] sendPhoto failed:', e.message);
    return null;
  }
}

async function notifyTelegram(text) {
  const s = getTelegramSettings();
  if (!s.enabled || !s.bot_token || !s.chat_id) return;
  for (const id of String(s.chat_id).split(',').map(x => x.trim()).filter(Boolean)) {
    await telegramSendText(id, text);
  }
}

const CATEGORY_LABELS = { host: 'HOST', cctv: 'CCTV', unifi: 'UniFi', ruijie: 'Ruijie' };
const CATEGORY_ICONS = { host: '🖥️', cctv: '📹', unifi: '📡', ruijie: '🌐' };

async function sendAlertNotification({ category, entityName, entityTarget, status }) {
  const label = CATEGORY_LABELS[category] || String(category).toUpperCase();
  const icon = CATEGORY_ICONS[category] || '⚠️';
  const isDown = status === 'DOWN';
  const target = entityTarget ? `\nTarget: ${escapeHtml(entityTarget)}` : '';
  const text = isDown
    ? `<b>${icon} ${label} DOWN</b>\n<b>${escapeHtml(entityName)}</b>${target}\n⏰ ${new Date().toLocaleString('id-ID')}`
    : `<b>${icon} ${label} RECOVERED</b>\n<b>${escapeHtml(entityName)}</b>${target}\n⏰ ${new Date().toLocaleString('id-ID')}`;
  await notifyTelegram(text);
}

const HELP_TEXT = [
  '<b>📋 Perintah yang tersedia:</b>',
  '',
  '/cctv — daftar kamera CCTV',
  '/cctv &lt;id atau nama&gt; — kirim snapshot terbaru kamera',
  '/procurement — list barang PR/Order yang belum datang',
  '/checklist — checklist yang belum terselesaikan',
  '/project — list project yang masih pending',
  '/status — ringkasan host & CCTV',
  '/stats — ringkasan sistem & bandwidth',
  '/help — bantuan ini',
].join('\n');

function formatCctvList(cams) {
  if (!cams.length) return 'Tidak ada kamera CCTV terdaftar.';
  const lines = ['<b>📹 Daftar CCTV:</b>', ''];
  cams.forEach(c => {
    const st = cctvStatus[c.id];
    const online = st ? st.online : false;
    lines.push(`${c.id}. ${online ? '🟢' : '🔴'} <b>${escapeHtml(c.name)}</b> — ${online ? 'online' : 'offline'}`);
  });
  lines.push('', 'Ketik /cctv &lt;id atau nama&gt; untuk melihat snapshot');
  return lines.join('\n');
}

async function sendCctvSnapshot(chatId, keyword, cams) {
  const target = String(keyword || '').toLowerCase();
  const cam = cams.find(c => String(c.id) === target)
    || cams.find(c => String(c.name || '').toLowerCase().includes(target));
  if (!cam) return telegramSendText(chatId, `Kamera "${keyword}" tidak ditemukan. Ketik /cctv untuk daftar.`);
  const st = cctvStatus[cam.id];
  try {
    const { buffer } = await captureCameraSnapshot(cam);
    const cap = `<b>📹 ${escapeHtml(cam.name)}</b>${cam.location ? `\n📍 ${escapeHtml(cam.location)}` : ''}${st ? `\nStatus: ${st.online ? '🟢 online' : '🔴 offline'}` : ''}`;
    return telegramSendPhoto(chatId, buffer, cap);
  } catch (e) {
    return telegramSendText(chatId, `Gagal mengambil snapshot "${cam.name}". Kamera mungkin tidak terjangkau.`);
  }
}

async function sendHostStatus(chatId) {
  const hosts = dbAll('SELECT * FROM hosts');
  const cams = dbAll('SELECT * FROM cctv_cameras WHERE enabled = 1');
  let up = 0, down = 0;
  hosts.forEach(h => { if (hostStatus[h.id] && hostStatus[h.id].status === 'UP') up++; else down++; });
  let cUp = 0, cDown = 0;
  cams.forEach(c => { if (cctvStatus[c.id] && cctvStatus[c.id].online) cUp++; else cDown++; });

  const lines = ['<b>🖥️ Ringkasan Status:</b>', ''];
  lines.push(`<b>Host Connection:</b> 🟢 ${up} up / 🔴 ${down} down (total ${hosts.length})`);
  lines.push(`<b>CCTV:</b> 🟢 ${cUp} online / 🔴 ${cDown} offline (total ${cams.length})`);
  if (down > 0) {
    lines.push('', '<b>Host down:</b>');
    hosts.forEach(h => {
      if (hostStatus[h.id] && hostStatus[h.id].status === 'DOWN') lines.push(`🔴 ${escapeHtml(h.name)} — ${escapeHtml(h.target)}`);
    });
  }
  if (cDown > 0) {
    lines.push('', '<b>CCTV offline:</b>');
    cams.forEach(c => {
      if (!cctvStatus[c.id] || !cctvStatus[c.id].online) lines.push(`🔴 ${escapeHtml(c.name)} — ${escapeHtml(c.ip)}`);
    });
  }
  return telegramSendText(chatId, lines.join('\n'));
}

function formatBps(b) {
  b = b || 0;
  if (b < 1024) return `${b.toFixed(0)} B/s`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB/s`;
  return `${(b / 1048576).toFixed(2)} MB/s`;
}

async function sendSystemStats(chatId) {
  try {
    const [cpu, mem, disk, net] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize(), si.networkStats()]);
    const diskMain = disk[0] || {};
    const gb = n => (n / 1073741824).toFixed(1);
    const iface = net[0] || {};
    const lines = [
      '<b>🖥️ Sistem & Bandwidth:</b>', '',
      `CPU: <b>${cpu.currentLoad.toFixed(1)}%</b>`,
      `RAM: <b>${gb(mem.used)}GB</b> / ${gb(mem.total)}GB (free ${gb(mem.free)}GB)`,
      `Disk: <b>${gb(diskMain.used || 0)}GB</b> / ${gb(diskMain.size || 0)}GB (free ${gb(diskMain.available || 0)}GB)`,
      `Bandwidth: ↓ ${formatBps(iface.rx_sec)} · ↑ ${formatBps(iface.tx_sec)}`,
    ];
    return telegramSendText(chatId, lines.join('\n'));
  } catch (e) {
    return telegramSendText(chatId, 'Gagal mengambil data sistem.');
  }
}

// Period key checklist — logika sama dengan frontend (checklistData.js)
function getPeriodKey(periodType, date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (periodType === 'daily') return `${y}-${m}-${day}`;
  if (periodType === 'monthly') return `${y}-${m}`;
  if (periodType === 'yearly') return String(y);
  if (periodType === 'weekly') {
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (tmp.getUTCDay() + 6) % 7;
    tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return `${y}-${m}-${day}`;
}

function formatTgDate(d) {
  const dt = d ? new Date(d) : new Date();
  if (isNaN(dt.getTime())) return '';
  return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear();
}

// /procurement — barang yang belum datang (status selain arrived/cancelled)
async function sendProcurementPending(chatId) {
  const orders = dbAll(
    "SELECT * FROM it_orders WHERE status NOT IN ('arrived','cancelled') ORDER BY order_date ASC, id ASC"
  );
  const lines = [`<b>📦 List Item Pending ${formatTgDate(new Date())}</b>`, ''];
  if (orders.length === 0) {
    lines.push('Tidak ada barang pending. Semua sudah tiba. 🎉');
    return telegramSendText(chatId, lines.join('\n'));
  }
  orders.forEach((o, i) => {
    lines.push(`${i + 1}. ${escapeHtml(o.item_name)} (${formatTgDate(o.order_date || o.created_at)})`);
  });
  lines.push('', `Total: <b>${orders.length}</b> barang pending`);
  return telegramSendText(chatId, lines.join('\n'));
}

// /checklist — checklist yang belum terselesaikan untuk periode berjalan
async function sendChecklistPending(chatId) {
  const PERIOD_META = [
    { type: 'daily', label: 'Harian' },
    { type: 'weekly', label: 'Mingguan' },
    { type: 'monthly', label: 'Bulanan' },
    { type: 'yearly', label: 'Tahunan' },
  ];
  const now = new Date();
  const lines = ['<b>📋 Checklist Belum Selesai</b>', ''];
  let anyPending = false;

  for (const meta of PERIOD_META) {
    const key = getPeriodKey(meta.type, now);
    const tasks = dbAll('SELECT * FROM checklist_tasks WHERE period_type = ? ORDER BY sort ASC, id ASC', [meta.type]);
    if (tasks.length === 0) continue;
    const doneRows = dbAll(
      'SELECT task_id FROM checklist_completions WHERE period_type = ? AND period_key = ? AND completed = 1',
      [meta.type, key]
    );
    const doneSet = new Set(doneRows.map(r => r.task_id));
    const pending = tasks.filter(t => !doneSet.has(t.task_id));
    if (pending.length === 0) continue;
    anyPending = true;
    lines.push(`<b>${meta.label}</b> (${key}):`);
    pending.forEach((t, i) => lines.push(`${i + 1}. ❌ ${escapeHtml(t.title)}`));
    lines.push('');
  }

  if (!anyPending) {
    return telegramSendText(chatId, '<b>📋 Checklist</b>\nSemua checklist sudah diselesaikan. 🎉');
  }
  return telegramSendText(chatId, lines.join('\n'));
}

// /project — project checklist yang masih pending (belum di-check)
async function sendProjectPending(chatId) {
  const projects = dbAll(
    'SELECT * FROM project_tasks WHERE completed = 0 ORDER BY id DESC'
  );
  const lines = [`<b>🗂️ List Project Pending ${formatTgDate(new Date())}</b>`, ''];
  if (projects.length === 0) {
    lines.push('Tidak ada project pending. Semua sudah selesai. 🎉');
    return telegramSendText(chatId, lines.join('\n'));
  }
  projects.forEach((p, i) => {
    lines.push(`${i + 1}. ${escapeHtml(p.title)} (${formatTgDate(p.created_at)})`);
    if (p.note) lines.push(`   📝 ${escapeHtml(p.note)}`);
  });
  lines.push('', `Total: <b>${projects.length}</b> project pending`);
  return telegramSendText(chatId, lines.join('\n'));
}

async function handleTelegramMessage(msg) {
  const s = getTelegramSettings();
  const allowed = String(s.chat_id || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!allowed.includes(String(msg.chat.id))) return;

  const text = String(msg.text || '').trim();
  const [cmdRaw, ...rest] = text.split(/\s+/);
  const cmd = String(cmdRaw || '').toLowerCase();

  if (cmd === '/start' || cmd === '/help') return telegramSendText(msg.chat.id, HELP_TEXT);
  if (cmd === '/status') return sendHostStatus(msg.chat.id);
  if (cmd === '/stats') return sendSystemStats(msg.chat.id);
  if (cmd === '/procurement') return sendProcurementPending(msg.chat.id);
  if (cmd === '/checklist') return sendChecklistPending(msg.chat.id);
  if (cmd === '/project') return sendProjectPending(msg.chat.id);
  if (cmd === '/cctv') {
    const cams = dbAll('SELECT * FROM cctv_cameras ORDER BY id ASC');
    if (rest.length === 0) return telegramSendText(msg.chat.id, formatCctvList(cams));
    return sendCctvSnapshot(msg.chat.id, rest.join(' '), cams);
  }
  return telegramSendText(msg.chat.id, HELP_TEXT);
}

let telegramPolling = null;
let telegramPollingGen = 0;

function stopTelegramPolling() {
  telegramPollingGen++;
  if (telegramPolling) { clearTimeout(telegramPolling); telegramPolling = null; }
}

function startTelegramPolling() {
  stopTelegramPolling();
  const s = getTelegramSettings();
  if (!s.enabled || !s.bot_token || !s.chat_id) return;
  const gen = ++telegramPollingGen;
  let offset = null;

  const tick = async () => {
    if (telegramPollingGen !== gen) return;
    try {
      const data = await telegramApi('getUpdates', { offset, timeout: 30 }, 35000);
      if (telegramPollingGen !== gen) return;
      if (data && data.ok) {
        for (const up of data.result || []) {
          offset = up.update_id + 1;
          const m = up.message;
          if (m && m.text) handleTelegramMessage(m).catch(() => {});
        }
      } else if (data && (data.error_code === 401 || data.error_code === 404)) {
        console.error('[telegram] polling dihentikan, token tidak valid:', data.description);
        return;
      }
    } catch (e) { /* timeout / network — lanjut */ }
    if (telegramPollingGen === gen) telegramPolling = setTimeout(tick, 500);
  };
  tick();
}

// Monitor a single host
async function monitorHost(host) {
  let status = 'DOWN';
  let latency = null;
  let statusCode = null;

  try {
    if (host.type === 'ip') {
      const res = await ping.promise.probe(host.target, { timeout: 5, min_reply: 1 });
      status = res.alive ? 'UP' : 'DOWN';
      latency = res.alive ? parseFloat(res.avg) || null : null;
    } else {
      const start = Date.now();
      const res = await axios.get(host.target, {
        timeout: 10000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'NOC-Monitor/1.0' }
      });
      latency = Date.now() - start;
      statusCode = res.status;
      status = res.status < 500 ? 'UP' : 'DOWN';
    }
  } catch (e) {
    status = 'DOWN';
  }

  dbRun('INSERT INTO monitoring_logs (host_id, status, latency, status_code) VALUES (?, ?, ?, ?)',
    [host.id, status, latency, statusCode]);

  const prev = hostStatus[host.id];
  hostStatus[host.id] = { status, latency, statusCode, lastCheck: new Date().toISOString() };
  broadcast({ type: 'host_update', hostId: host.id, status, latency, statusCode, lastCheck: hostStatus[host.id].lastCheck });

  if (prev && prev.status !== status) {
    broadcast({ type: 'alert', hostId: host.id, hostName: host.name, status, timestamp: new Date().toISOString() });
    logStatusEvent('host', host.id, host.name, host.target, status, latency);
    sendAlertNotification({ category: 'host', entityName: host.name, entityTarget: host.target, status });
  } else if (!prev) {
    // First check ever for this host — log initial state too
    logStatusEvent('host', host.id, host.name, host.target, status, latency);
  }
}

function scheduleHost(host) {
  if (monitoringTimers[host.id]) clearInterval(monitoringTimers[host.id]);
  monitorHost(host);
  monitoringTimers[host.id] = setInterval(() => monitorHost(host), host.interval * 1000);
}

function initMonitoring() {
  const hosts = dbAll('SELECT * FROM hosts');
  hosts.forEach(host => scheduleHost(host));
}

// ── AUTH (Single Admin) ─────────────────────────────────────────────────────
const authTokens = new Map(); // token -> { createdAt, expiresAt }
const TOKEN_TTL = 24 * 3600 * 1000; // 24 jam

function makeSalt() { return crypto.randomBytes(16).toString('hex'); }

function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}

function initAuthTable() {
  db.run(`CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    admin_password_hash TEXT DEFAULT '',
    admin_password_salt TEXT DEFAULT ''
  )`);
  const row = dbGet('SELECT id FROM app_settings WHERE id = 1');
  if (!row) {
    const salt = makeSalt();
    const hash = hashPassword(process.env.ADMIN_PASSWORD || 'admin', salt);
    dbRun('INSERT INTO app_settings (id, admin_password_hash, admin_password_salt) VALUES (1, ?, ?)', [hash, salt]);
  }
  saveDB();
}

function verifyPassword(pw) {
  const row = dbGet('SELECT admin_password_hash, admin_password_salt FROM app_settings WHERE id = 1');
  if (!row || !row.admin_password_salt) return false;
  const hash = hashPassword(pw, row.admin_password_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(row.admin_password_hash, 'hex'));
}

function createToken() {
  const token = crypto.randomBytes(32).toString('hex');
  authTokens.set(token, { createdAt: Date.now(), expiresAt: Date.now() + TOKEN_TTL });
  return token;
}

function validToken(token) {
  if (!token) return false;
  const t = authTokens.get(token);
  if (!t) return false;
  if (Date.now() > t.expiresAt) { authTokens.delete(token); return false; }
  return true;
}

function revokeToken(token) { authTokens.delete(token); }

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || null);
  if (!validToken(token)) return res.status(401).json({ error: 'Unauthorized' });
  req.token = token;
  next();
}

// Public: login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || !verifyPassword(password)) {
    return res.status(401).json({ ok: false, error: 'Password salah' });
  }
  res.json({ ok: true, token: createToken() });
});

// Protect ALL /api/* routes below this point
app.use('/api', requireAuth);

app.post('/api/auth/logout', (req, res) => {
  revokeToken(req.token);
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => res.json({ ok: true }));

// Ubah password admin
app.post('/api/auth/change-password', (req, res) => {
  const { old_password, new_password } = req.body || {};
  if (!old_password || !new_password) {
    return res.status(400).json({ ok: false, error: 'Password lama dan password baru wajib diisi' });
  }
  if (String(new_password).length < 4) {
    return res.status(400).json({ ok: false, error: 'Password baru minimal 4 karakter' });
  }
  if (!verifyPassword(String(old_password))) {
    return res.status(400).json({ ok: false, error: 'Password lama salah' });
  }
  const salt = makeSalt();
  const hash = hashPassword(String(new_password), salt);
  dbRun('UPDATE app_settings SET admin_password_hash=?, admin_password_salt=? WHERE id=1', [hash, salt]);
  res.json({ ok: true });
});

// ── TELEGRAM SETTINGS API ──────────────────────────────────────────────────

// GET settings
app.get('/api/notifications/telegram/settings', (req, res) => {
  const s = getTelegramSettings();
  res.json({ bot_token: s.bot_token || '', chat_id: s.chat_id || '', enabled: !!s.enabled });
});

// PUT settings
app.put('/api/notifications/telegram/settings', (req, res) => {
  const { bot_token, chat_id, enabled } = req.body || {};
  dbRun('UPDATE telegram_settings SET bot_token=?, chat_id=?, enabled=? WHERE id=1', [
    String(bot_token || '').trim(),
    String(chat_id || '').trim(),
    enabled ? 1 : 0
  ]);
  startTelegramPolling();
  res.json({ ok: true });
});

// Test — kirim pesan uji coba ke chat id
app.post('/api/notifications/telegram/test', async (req, res) => {
  const s = getTelegramSettings();
  if (!s.bot_token) return res.status(400).json({ ok: false, error: 'Bot Token belum diisi' });
  if (!s.chat_id) return res.status(400).json({ ok: false, error: 'Chat ID belum diisi' });
  try {
    const me = await axios.get(`${TG_API}/bot${s.bot_token}/getMe`, { timeout: 10000 });
    if (!me.data || !me.data.ok) {
      return res.status(400).json({ ok: false, error: 'Bot Token tidak valid: ' + (me.data.description || '') });
    }
    for (const id of String(s.chat_id).split(',').map(x => x.trim()).filter(Boolean)) {
      await telegramSendText(id,
        '<b>✅ Test Notifikasi Telegram</b>\n' +
        'Bot terhubung dengan Dashboard IT.\n' +
        'Ketik /help untuk melihat perintah yang tersedia.'
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Gagal kirim test: ' + (e.response?.data?.description || e.message) });
  }
});

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/api/hosts', (req, res) => {
  const hosts = dbAll('SELECT * FROM hosts');
  const result = hosts.map(h => {
    const s = hostStatus[h.id] || { status: 'UNKNOWN', latency: null, lastCheck: null };
    const total = dbGet('SELECT COUNT(*) as c FROM monitoring_logs WHERE host_id = ?', [h.id]);
    const up = dbGet("SELECT COUNT(*) as c FROM monitoring_logs WHERE host_id = ? AND status = 'UP'", [h.id]);
    const uptime = (total?.c || 0) > 0 ? (((up?.c || 0) / total.c) * 100).toFixed(2) : '0.00';
    return { ...h, ...s, uptime };
  });
  res.json(result);
});

app.post('/api/hosts', (req, res) => {
  const { name, target, type, interval, category } = req.body;
  if (!name || !target || !type) return res.status(400).json({ error: 'Missing fields' });
  const id = dbRun('INSERT INTO hosts (name, target, type, interval, category) VALUES (?, ?, ?, ?, ?)',
    [name, target, type, interval || 60, category || '']);
  const host = dbGet('SELECT * FROM hosts WHERE id = ?', [parseInt(id)]);
  if (!host) return res.status(500).json({ error: 'Failed to create host' });
  scheduleHost(host);
  broadcast({ type: 'host_added', host });
  res.json(host);
});

app.put('/api/hosts/:id', (req, res) => {
  const { name, target, type, interval, category } = req.body;
  dbRun('UPDATE hosts SET name=?, target=?, type=?, interval=?, category=? WHERE id=?',
    [name, target, type, interval, category || '', req.params.id]);
  const host = dbGet('SELECT * FROM hosts WHERE id = ?', [req.params.id]);
  if (!host) return res.status(404).json({ error: 'Not found' });
  scheduleHost(host);
  broadcast({ type: 'host_updated', host });
  res.json(host);
});

app.delete('/api/hosts/:id', (req, res) => {
  const id = req.params.id;
  if (monitoringTimers[id]) { clearInterval(monitoringTimers[id]); delete monitoringTimers[id]; }
  delete hostStatus[id];
  dbRun('DELETE FROM monitoring_logs WHERE host_id = ?', [id]);
  dbRun('DELETE FROM hosts WHERE id = ?', [id]);
  broadcast({ type: 'host_deleted', hostId: parseInt(id) });
  res.json({ ok: true });
});

app.get('/api/hosts/:id/history', (req, res) => {
  // Ambil 1 jam terakhir — gunakan id sorting agar tidak bergantung format waktu
  const logs = dbAll(
    `SELECT latency, status, checked_at FROM monitoring_logs
     WHERE host_id = ?
     ORDER BY id DESC LIMIT 360`,
    [req.params.id]
  );
  // Balik urutan agar ascending (terlama dulu)
  res.json(logs.reverse());
});

app.get('/api/hosts/:id/downtimes', (req, res) => {
  const logs = dbAll(
    "SELECT * FROM monitoring_logs WHERE host_id = ? AND status = 'DOWN' ORDER BY checked_at DESC LIMIT 50",
    [req.params.id]
  );
  res.json(logs);
});

app.get('/api/system', async (req, res) => {
  try {
    const [cpu, mem, disk] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);
    const diskMain = disk[0] || {};
    res.json({
      cpu_usage: cpu.currentLoad.toFixed(1),
      mem_used: (mem.used / 1073741824).toFixed(2),
      mem_free: (mem.free / 1073741824).toFixed(2),
      mem_total: (mem.total / 1073741824).toFixed(2),
      disk_used: ((diskMain.used || 0) / 1073741824).toFixed(2),
      disk_free: ((diskMain.available || 0) / 1073741824).toFixed(2),
      disk_total: ((diskMain.size || 0) / 1073741824).toFixed(2),
    });
  } catch (e) {
    res.json({ cpu_usage: 0, mem_used: 0, mem_free: 0, mem_total: 0, disk_used: 0, disk_free: 0, disk_total: 0 });
  }
});

app.get('/api/bandwidth', async (req, res) => {
  try {
    const net = await si.networkStats();
    const iface = net[0] || {};
    res.json({ rx_sec: iface.rx_sec || 0, tx_sec: iface.tx_sec || 0, rx_bytes: iface.rx_bytes || 0, tx_bytes: iface.tx_bytes || 0 });
  } catch (e) {
    res.json({ rx_sec: 0, tx_sec: 0 });
  }
});

app.get('/api/stats', (req, res) => {
  const hosts = dbAll('SELECT * FROM hosts');
  let up = 0, down = 0, latencies = [];
  hosts.forEach(h => {
    const s = hostStatus[h.id];
    if (s) {
      if (s.status === 'UP') { up++; if (s.latency) latencies.push(s.latency); }
      else down++;
    }
  });
  const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;
  const availability = hosts.length > 0 ? ((up / hosts.length) * 100).toFixed(1) : '0.0';
  res.json({ total: hosts.length, up, down, availability, avgLatency });
});

// ── HISTORY API — unified UP/DOWN log across Hosts, Topology, CCTV ────────────

// GET /api/history — list status_events with filters
// Query params: category (host|topology|cctv|all), entity_id, status (UP|DOWN|all),
//               from (ISO date), to (ISO date), limit, offset, search
app.get('/api/history', (req, res) => {
  const {
    category = 'all', entity_id, status = 'all',
    from, to, limit = 100, offset = 0, search,
  } = req.query;

  let where = [];
  let params = [];

  if (category !== 'all') { where.push('category = ?'); params.push(category); }
  if (entity_id) { where.push('entity_id = ?'); params.push(parseInt(entity_id)); }
  if (status !== 'all') { where.push('status = ?'); params.push(status); }
  if (from) { where.push('occurred_at >= ?'); params.push(from); }
  if (to) { where.push('occurred_at <= ?'); params.push(to); }
  if (search) {
    where.push('(entity_name LIKE ? OR entity_target LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit) || 100, 1000);
  const off = parseInt(offset) || 0;

  const rows = dbAll(
    `SELECT * FROM status_events ${whereClause} ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, lim, off]
  );

  const totalRow = dbGet(`SELECT COUNT(*) as c FROM status_events ${whereClause}`, params);

  res.json({ events: rows, total: totalRow?.c || 0, limit: lim, offset: off });
});

// GET /api/history/summary — counts per category + recent downtime stats
app.get('/api/history/summary', (req, res) => {
  const categories = ['host', 'cctv', 'unifi', 'ruijie'];
  const summary = {};

  categories.forEach(cat => {
    const totalEvents = dbGet('SELECT COUNT(*) as c FROM status_events WHERE category = ?', [cat]);
    const downEvents  = dbGet("SELECT COUNT(*) as c FROM status_events WHERE category = ? AND status = 'DOWN'", [cat]);
    const upEvents    = dbGet("SELECT COUNT(*) as c FROM status_events WHERE category = ? AND status = 'UP'", [cat]);
    const last24h     = dbGet(
      "SELECT COUNT(*) as c FROM status_events WHERE category = ? AND occurred_at > ?",
      [cat, new Date(Date.now() - 86400000).toISOString()]
    );
    summary[cat] = {
      totalEvents: totalEvents?.c || 0,
      downEvents: downEvents?.c || 0,
      upEvents: upEvents?.c || 0,
      last24h: last24h?.c || 0,
    };
  });

  res.json(summary);
});

// GET /api/history/entity/:category/:id — timeline + computed uptime % for one entity
app.get('/api/history/entity/:category/:id', (req, res) => {
  const { category, id } = req.params;
  const entityId = parseInt(id);

  const events = dbAll(
    'SELECT * FROM status_events WHERE category = ? AND entity_id = ? ORDER BY occurred_at ASC',
    [category, entityId]
  );

  // Compute downtime durations between consecutive DOWN -> UP pairs
  const downtimes = [];
  let lastDown = null;
  events.forEach(ev => {
    if (ev.status === 'DOWN') {
      lastDown = ev;
    } else if (ev.status === 'UP' && lastDown) {
      const durationMs = new Date(ev.occurred_at) - new Date(lastDown.occurred_at);
      downtimes.push({
        from: lastDown.occurred_at,
        to: ev.occurred_at,
        duration_seconds: Math.round(durationMs / 1000),
      });
      lastDown = null;
    }
  });

  // If currently down (last event is DOWN with no resolving UP yet)
  const currentlyDown = lastDown ? {
    from: lastDown.occurred_at,
    to: null,
    duration_seconds: Math.round((Date.now() - new Date(lastDown.occurred_at)) / 1000),
    ongoing: true,
  } : null;

  res.json({
    events: events.reverse(), // newest first for display
    downtimes: currentlyDown ? [...downtimes, currentlyDown] : downtimes,
    totalDowntimeSeconds: downtimes.reduce((sum, d) => sum + d.duration_seconds, 0),
  });
});

// DELETE /api/history — clear history (optionally by category)
app.delete('/api/history', (req, res) => {
  const { category } = req.query;
  if (category && category !== 'all') {
    dbRun('DELETE FROM status_events WHERE category = ?', [category]);
  } else {
    dbRun('DELETE FROM status_events');
  }
  res.json({ ok: true });
});

// Cleanup old logs
function cleanupLogs() {
  const cutoff90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString();
  dbRun("DELETE FROM monitoring_logs WHERE checked_at < ?", [cutoff90]);
  dbRun("DELETE FROM bandwidth_logs WHERE logged_at < ?", [cutoff30]);
  dbRun("DELETE FROM system_metrics WHERE logged_at < ?", [cutoff30]);
  dbRun("DELETE FROM status_events WHERE occurred_at < ?", [cutoff90]);
}

setInterval(cleanupLogs, 24 * 3600 * 1000);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  if (!validToken(url.searchParams.get('token'))) { ws.close(4001, 'unauthorized'); return; }
  ws.send(JSON.stringify({ type: 'connected', message: 'Dashboard IT connected' }));
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  initAuthTable();
  initHostsTable();
  initCCTVTable();
  initUnifiTable();
  initRuijieTable();
  initChecklistTable();
  initChecklistTasksTable();
  initProjectTasksTable();
  initProcurementTable();
  initSopTable();
  server.listen(PORT, () => {
    console.log(`\n  DASHBOARD IT - System Monitoring`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}\n`);
    initMonitoring();
    setTimeout(initCCTVMonitoring, 2000);
    setTimeout(startUnifiSync, 3000);
    setTimeout(startRuijieSync, 3500);
    startTelegramPolling();
  });
});

// ── CCTV API ──────────────────────────────────────────────────────────────────

function initHostsTable() {
  try { db.run('ALTER TABLE hosts ADD COLUMN category TEXT DEFAULT ""'); saveDB(); } catch(e) {}
}

function initCCTVTable() {
  try { db.run('ALTER TABLE cctv_cameras ADD COLUMN location TEXT DEFAULT ""'); saveDB(); } catch(e) {}
  try { db.run('ALTER TABLE cctv_cameras ADD COLUMN auth_type TEXT DEFAULT "none"'); saveDB(); } catch(e) {}
  try { db.run('ALTER TABLE cctv_cameras ADD COLUMN onvif_port TEXT DEFAULT "80"'); saveDB(); } catch(e) {}
  db.run(`
    CREATE TABLE IF NOT EXISTS cctv_cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      rtsp_url TEXT DEFAULT '',
      snapshot_url TEXT DEFAULT '',
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      location TEXT DEFAULT '',
      auth_type TEXT DEFAULT 'none',
      onvif_port TEXT DEFAULT '80',
      refresh_rate INTEGER DEFAULT 2,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  saveDB();
}

// In-memory CCTV status
const cctvStatus = {};

// Check if camera is reachable via HTTP
// Fetch snapshot with correct auth (none / basic / digest)
async function fetchWithAuth(url, cam, options = {}) {
  const authType = cam.auth_type || 'none';
  const timeout = options.timeout || 8000;

  if (authType === 'digest' && cam.username) {
    // Digest Auth: 2-step challenge-response
    const client = new DigestClient(cam.username, cam.password || '');
    const resp = await client.fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'KOMANEKA-Monitor/1.0' },
      signal: AbortSignal.timeout(timeout),
    });
    return resp;
  }

  if (authType === 'basic' && cam.username) {
    const creds = Buffer.from(`${cam.username}:${cam.password || ''}`).toString('base64');
    const resp = await axios.get(url, {
      timeout, validateStatus: () => true,
      headers: { 'Authorization': `Basic ${creds}`, 'User-Agent': 'KOMANEKA-Monitor/1.0' },
      responseType: 'arraybuffer',
    });
    return { ok: resp.status < 500, status: resp.status, axiosResp: resp };
  }

  // No auth
  const resp = await axios.get(url, {
    timeout, validateStatus: () => true,
    headers: { 'User-Agent': 'KOMANEKA-Monitor/1.0' },
    responseType: 'arraybuffer',
  });
  return { ok: resp.status < 500, status: resp.status, axiosResp: resp };
}

async function checkCCTVStatus(cam) {
  if (!cam || cam.id == null) return;
  let online = false;
  let latency = null;
  try {
    const url = cam.snapshot_url || `http://${cam.ip}/snapshot.jpg`;
    const start = Date.now();
    const resp = await fetchWithAuth(url, cam, { timeout: 5000 });
    latency = Date.now() - start;
    const status = resp.status || (resp.axiosResp ? resp.axiosResp.status : 0);
    online = status > 0 && status < 500;
  } catch(e) {
    // Fallback: ICMP ping
    try {
      const pingRes = await ping.promise.probe(cam.ip, { timeout: 3, min_reply: 1 });
      online = pingRes.alive;
      latency = pingRes.alive ? parseFloat(pingRes.avg) || null : null;
    } catch(e2) { online = false; }
  }
  const prev = cctvStatus[cam.id];
  cctvStatus[cam.id] = { online, latency, lastCheck: new Date().toISOString() };
  broadcast({ type: 'cctv_status', camId: cam.id, online, latency, lastCheck: cctvStatus[cam.id].lastCheck });
  if (prev && prev.online !== online) {
    broadcast({ type: 'alert', hostId: cam.id, hostName: cam.name, status: online ? 'UP' : 'DOWN', timestamp: new Date().toISOString() });
    logStatusEvent('cctv', cam.id, cam.name, cam.ip, online ? 'UP' : 'DOWN', latency);
    sendAlertNotification({ category: 'cctv', entityName: cam.name, entityTarget: cam.ip, status: online ? 'UP' : 'DOWN' });
  } else if (!prev) {
    logStatusEvent('cctv', cam.id, cam.name, cam.ip, online ? 'UP' : 'DOWN', latency);
  }
}

function initCCTVMonitoring() {
  const cams = dbAll("SELECT * FROM cctv_cameras WHERE enabled = 1");
  cams.forEach(cam => {
    if (!cam || cam.id == null) return;
    checkCCTVStatus(cam).catch(() => {});
    setInterval(() => checkCCTVStatus(cam).catch(() => {}), 30000);
  });
}

// Capture camera snapshot — handles Basic, Digest, and No Auth
async function captureCameraSnapshot(cam) {
  const url = cam.snapshot_url || `http://${cam.ip}/snapshot.jpg`;
  const authType = cam.auth_type || 'none';

  if (authType === 'digest' && cam.username) {
    const client = new DigestClient(cam.username, cam.password || '');
    const digestRes = await client.fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'KOMANEKA-Monitor/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!digestRes.ok && digestRes.status >= 400) {
      const err = new Error('Camera auth failed');
      err.status = digestRes.status;
      throw err;
    }
    const buf = await digestRes.arrayBuffer();
    const contentType = digestRes.headers.get('content-type') || 'image/jpeg';
    return { buffer: Buffer.from(buf), contentType };
  }

  const headers = { 'User-Agent': 'KOMANEKA-Monitor/1.0' };
  if (authType === 'basic' && cam.username) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${cam.username}:${cam.password || ''}`).toString('base64');
  }
  const response = await axios.get(url, {
    timeout: 10000, responseType: 'arraybuffer', headers, validateStatus: () => true
  });
  if (response.status >= 400) {
    const err = new Error('Camera returned error');
    err.status = response.status;
    throw err;
  }
  const contentType = response.headers['content-type'] || 'image/jpeg';
  return { buffer: Buffer.from(response.data), contentType };
}

// Proxy snapshot — uses captureCameraSnapshot
app.get('/api/cctv/:id/snapshot', async (req, res) => {
  const cam = dbGet('SELECT * FROM cctv_cameras WHERE id = ?', [parseInt(req.params.id)]);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { buffer, contentType } = await captureCameraSnapshot(cam);
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (e) {
    res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 503)
      .json({ error: 'Camera unreachable', message: e.message });
  }
});

// GET all cameras with status
app.get('/api/cctv', (req, res) => {
  const cams = dbAll('SELECT * FROM cctv_cameras ORDER BY id ASC');
  const result = cams.map(c => ({
    ...c,
    password: c.password ? '***' : '',
    ...(cctvStatus[c.id] || { online: false, latency: null, lastCheck: null })
  }));
  res.json(result);
});

// POST add camera
app.post('/api/cctv', (req, res) => {
  const { name, ip, rtsp_url, snapshot_url, username, password, location, auth_type, refresh_rate } = req.body;
  if (!name || !ip) return res.status(400).json({ error: 'name and ip required' });
  const id = dbRun(
    'INSERT INTO cctv_cameras (name, ip, rtsp_url, snapshot_url, username, password, location, auth_type, refresh_rate) VALUES (?,?,?,?,?,?,?,?,?)',
    [name, ip, rtsp_url||'', snapshot_url||'', username||'', password||'', location||'', auth_type||'none', refresh_rate||30]
  );
  const cam = dbGet('SELECT * FROM cctv_cameras WHERE id = ?', [parseInt(id)]);
  if (!cam) return res.status(500).json({ error: 'Failed to create camera' });
  checkCCTVStatus(cam).catch(() => {});
  broadcast({ type: 'cctv_added', cam: { ...cam, password: cam.password ? '***' : '' } });
  res.json({ ...cam, password: cam.password ? '***' : '' });
});

// PUT update camera
app.put('/api/cctv/:id', (req, res) => {
  const { name, ip, rtsp_url, snapshot_url, username, password, location, auth_type, refresh_rate, enabled } = req.body;
  const existing = dbGet('SELECT * FROM cctv_cameras WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const finalPassword = password === '***' ? existing.password : (password || '');
  dbRun(
    'UPDATE cctv_cameras SET name=?, ip=?, rtsp_url=?, snapshot_url=?, username=?, password=?, location=?, auth_type=?, refresh_rate=?, enabled=? WHERE id=?',
    [name, ip, rtsp_url||'', snapshot_url||'', username||'', finalPassword, location||'', auth_type||'none', refresh_rate||30, enabled !== undefined ? enabled : 1, req.params.id]
  );
  const cam = dbGet('SELECT * FROM cctv_cameras WHERE id = ?', [parseInt(req.params.id)]);
  if (!cam) return res.status(404).json({ error: 'Not found after update' });
  checkCCTVStatus(cam).catch(() => {});
  res.json({ ...cam, password: cam.password ? '***' : '' });
});

// DELETE camera
app.delete('/api/cctv/:id', (req, res) => {
  delete cctvStatus[req.params.id];
  dbRun('DELETE FROM cctv_cameras WHERE id = ?', [req.params.id]);
  broadcast({ type: 'cctv_deleted', camId: parseInt(req.params.id) });
  res.json({ ok: true });
});

// POST force check
app.post('/api/cctv/:id/check', async (req, res) => {
  const cam = dbGet('SELECT * FROM cctv_cameras WHERE id = ?', [parseInt(req.params.id)]);
  if (!cam) return res.status(404).json({ error: 'Not found' });
  try { await checkCCTVStatus(cam); } catch(e) {}
  res.json({ ...(cctvStatus[cam.id] || { online: false, latency: null }), deviceId: cam.id });
});


// ── HLS LIVE STREAMING (ffmpeg RTSP → HLS) ───────────────────────────────────
const { spawn } = require('child_process');
const fsSync    = require('fs');
const pathMod   = require('path');

const HLS_DIR     = pathMod.join(__dirname, 'hls');
const activeStreams = {}; // camId → { process, clients, timer }

// Create HLS dir
if (!fsSync.existsSync(HLS_DIR)) fsSync.mkdirSync(HLS_DIR, { recursive: true });

function getHLSDir(camId) {
  const d = pathMod.join(HLS_DIR, String(camId));
  if (!fsSync.existsSync(d)) fsSync.mkdirSync(d, { recursive: true });
  return d;
}

function cleanHLSDir(camId) {
  const d = pathMod.join(HLS_DIR, String(camId));
  if (fsSync.existsSync(d)) {
    fsSync.readdirSync(d).forEach(f => {
      try { fsSync.unlinkSync(pathMod.join(d, f)); } catch(e) {}
    });
  }
}

function buildRtspUrl(cam) {
  // If rtsp_url already set, use it directly
  if (cam.rtsp_url && cam.rtsp_url.trim()) return cam.rtsp_url.trim();
  // Build from ip + credentials
  if (cam.username) {
    const pass = cam.password ? encodeURIComponent(cam.password) : '';
    return `rtsp://${cam.username}:${pass}@${cam.ip}:554/Streaming/Channels/101`;
  }
  return `rtsp://${cam.ip}:554/Streaming/Channels/101`;
}

function startHLSStream(cam) {
  const camId  = cam.id;
  const outDir = getHLSDir(camId);
  const m3u8   = pathMod.join(outDir, 'stream.m3u8');

  cleanHLSDir(camId);

  const rtspUrl = buildRtspUrl(cam);
  console.log(`[HLS] Starting stream cam ${camId}: ${rtspUrl.replace(/:([^@]+)@/, ':***@')}`);

  const args = [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-b:v', '800k',
    '-maxrate', '800k',
    '-bufsize', '1600k',
    '-vf', 'scale=1280:720',
    '-r', '15',
    '-g', '30',
    '-c:a', 'aac',
    '-b:a', '64k',
    '-ar', '44100',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', pathMod.join(outDir, 'seg%03d.ts'),
    '-y',
    m3u8
  ];

  const proc = spawn('ffmpeg', args, { windowsHide: true });

  proc.stderr.on('data', (data) => {
    const line = data.toString();
    // Log only important lines
    if (line.includes('Error') || line.includes('error') || line.includes('Opening')) {
      console.log(`[ffmpeg cam${camId}]`, line.trim().slice(0, 120));
    }
  });

  proc.on('close', (code) => {
    console.log(`[HLS] Stream cam ${camId} stopped (code ${code})`);
    if (activeStreams[camId]) {
      delete activeStreams[camId];
    }
  });

  proc.on('error', (err) => {
    console.error(`[HLS] ffmpeg error cam ${camId}:`, err.message);
  });

  // Auto-stop if no clients for 60s
  const stopTimer = setTimeout(() => stopHLSStream(camId), 60000);

  activeStreams[camId] = { process: proc, timer: stopTimer, startTime: Date.now() };
  return { ok: true, camId };
}

function stopHLSStream(camId) {
  const s = activeStreams[camId];
  if (!s) return;
  console.log(`[HLS] Stopping stream cam ${camId}`);
  clearTimeout(s.timer);
  try { s.process.kill('SIGTERM'); } catch(e) {}
  delete activeStreams[camId];
  cleanHLSDir(camId);
}

// Reset auto-stop timer (called when client is watching)
function keepAliveStream(camId) {
  const s = activeStreams[camId];
  if (!s) return;
  clearTimeout(s.timer);
  s.timer = setTimeout(() => stopHLSStream(camId), 60000);
}

// Serve HLS files (m3u8 + ts segments)
app.use('/hls', (req, res, next) => {
  // Keep stream alive when client fetches segments
  const parts = req.path.split('/');
  if (parts.length >= 2) {
    const camId = parseInt(parts[1]);
    if (!isNaN(camId)) keepAliveStream(camId);
  }
  next();
}, express.static(HLS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store');
    }
    if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'no-cache');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// POST /api/cctv/:id/stream/start
app.post('/api/cctv/:id/stream/start', (req, res) => {
  const cam = dbGet('SELECT * FROM cctv_cameras WHERE id = ?', [parseInt(req.params.id)]);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  const camId = cam.id;

  // Already running
  if (activeStreams[camId]) {
    keepAliveStream(camId);
    return res.json({ ok: true, streaming: true, url: `/hls/${camId}/stream.m3u8`, existing: true });
  }

  startHLSStream(cam);

  // Wait up to 8s for m3u8 to appear
  const m3u8Path = pathMod.join(getHLSDir(camId), 'stream.m3u8');
  let waited = 0;
  const check = setInterval(() => {
    waited += 500;
    if (fsSync.existsSync(m3u8Path)) {
      clearInterval(check);
      return res.json({ ok: true, streaming: true, url: `/hls/${camId}/stream.m3u8` });
    }
    if (waited >= 8000) {
      clearInterval(check);
      // Return URL anyway — client will retry
      return res.json({ ok: true, streaming: true, url: `/hls/${camId}/stream.m3u8`, pending: true });
    }
  }, 500);
});

// POST /api/cctv/:id/stream/stop
app.post('/api/cctv/:id/stream/stop', (req, res) => {
  stopHLSStream(parseInt(req.params.id));
  res.json({ ok: true });
});

// GET /api/cctv/:id/stream/status
app.get('/api/cctv/:id/stream/status', (req, res) => {
  const camId = parseInt(req.params.id);
  const active = !!activeStreams[camId];
  res.json({ streaming: active, url: active ? `/hls/${camId}/stream.m3u8` : null });
});

// Cleanup all streams on exit
process.on('SIGINT',  () => { Object.keys(activeStreams).forEach(stopHLSStream); process.exit(0); });
process.on('SIGTERM', () => { Object.keys(activeStreams).forEach(stopHLSStream); process.exit(0); });

// ── UNIFI CONTROLLER INTEGRATION ─────────────────────────────────────────────

// Ignore self-signed cert on UniFi controller
const unifiAgent = new https.Agent({ rejectUnauthorized: false });

// In-memory UniFi state
let unifiConfig = null;   // { url, username, password, site, enabled }
let unifiCookie = null;   // session cookie after login
let unifiSyncTimer = null;
let unifiDevices = [];    // last fetched devices
let unifiClients = [];    // last fetched clients
let unifiConnected = false;

// ── Settings table for UniFi config ──────────────────────────────────────────
function initUnifiTable() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS unifi_settings (
      id INTEGER PRIMARY KEY,
      url TEXT DEFAULT '',
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      site TEXT DEFAULT 'default',
      enabled INTEGER DEFAULT 0,
      sync_interval INTEGER DEFAULT 30,
      last_sync DATETIME
    )`);
    // Insert default row if not exists
    const existing = dbGet('SELECT id FROM unifi_settings WHERE id = 1');
    if (!existing) {
      dbRun(`INSERT INTO unifi_settings (id, url, username, password, site, enabled, sync_interval)
             VALUES (1, '', '', '', 'default', 0, 30)`);
    }
    saveDB();
  } catch(e) { console.error('[UniFi] initUnifiTable error:', e.message); }
}

function loadUnifiConfig() {
  const row = dbGet('SELECT * FROM unifi_settings WHERE id = 1');
  if (row) unifiConfig = row;
  return row;
}

// ── UniFi API helpers ─────────────────────────────────────────────────────────

// Login and get session cookie
async function unifiLogin() {
  if (!unifiConfig || !unifiConfig.url || !unifiConfig.username) return false;
  try {
    const loginUrl = `${unifiConfig.url.replace(/\/$/, '')}/api/login`;
    const res = await axios.post(loginUrl, {
      username: unifiConfig.username,
      password: unifiConfig.password,
      remember: false,
    }, {
      httpsAgent: unifiAgent,
      timeout: 10000,
      validateStatus: () => true,
      withCredentials: true,
    });

    if (res.status === 200 && res.data?.meta?.rc === 'ok') {
      // Extract cookie
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        unifiCookie = setCookie.map(c => c.split(';')[0]).join('; ');
      }
      unifiConnected = true;
      console.log('[UniFi] Login berhasil');
      return true;
    } else {
      console.error('[UniFi] Login gagal:', res.status, res.data?.meta?.msg);
      unifiConnected = false;
      unifiCookie = null;
      return false;
    }
  } catch(e) {
    console.error('[UniFi] Login error:', e.message);
    unifiConnected = false;
    unifiCookie = null;
    return false;
  }
}

// Make authenticated API call, auto-retry login once if 401
async function unifiGet(endpoint) {
  if (!unifiConfig) return null;
  const base = unifiConfig.url.replace(/\/$/, '');
  const site = unifiConfig.site || 'default';
  const url  = `${base}/api/s/${site}/${endpoint}`;

  const doRequest = async () => axios.get(url, {
    httpsAgent: unifiAgent,
    timeout: 15000,
    validateStatus: () => true,
    headers: { Cookie: unifiCookie || '' },
  });

  let res = await doRequest();

  // Session expired — re-login once
  if (res.status === 401 || res.data?.meta?.rc === 'error') {
    const ok = await unifiLogin();
    if (!ok) return null;
    res = await doRequest();
  }

  if (res.status === 200 && res.data?.meta?.rc === 'ok') {
    return res.data.data;
  }
  return null;
}

// Send a device command to the UniFi controller (e.g. reboot)
async function unifiCmd(endpoint, body) {
  if (!unifiConfig) return null;
  const base = unifiConfig.url.replace(/\/$/, '');
  const site = unifiConfig.site || 'default';
  const url  = `${base}/api/s/${site}/${endpoint}`;

  const doRequest = async () => axios.post(url, body, {
    httpsAgent: unifiAgent,
    timeout: 15000,
    validateStatus: () => true,
    headers: { Cookie: unifiCookie || '', 'Content-Type': 'application/json' },
  });

  let res = await doRequest();

  // Session expired — re-login once
  if (res.status === 401 || res.data?.meta?.rc === 'error') {
    const ok = await unifiLogin();
    if (!ok) return null;
    res = await doRequest();
  }

  if (res.status === 200 && res.data?.meta?.rc === 'ok') {
    return res.data;
  }
  return null;
}

// ── Map UniFi device type to our topology types ───────────────────────────────
function mapUnifiType(unifiType) {
  if (!unifiType) return 'switch';
  const t = unifiType.toLowerCase();
  if (t.includes('uap') || t.includes('ap'))    return 'ap';
  if (t.includes('ugw') || t.includes('gateway') || t.includes('udm')) return 'router';
  if (t.includes('usw') || t.includes('switch')) return 'switch';
  if (t.includes('usg')) return 'firewall';
  return 'switch';
}

// ── Sync UniFi devices → status_events + broadcast ───────────────────────────
async function syncUnifi() {
  if (!unifiConfig?.enabled || !unifiConfig?.url) return;
  if (!unifiCookie) {
    const ok = await unifiLogin();
    if (!ok) { broadcast({ type: 'unifi_status', connected: false }); return; }
  }

  try {
    // Fetch devices (APs, switches, gateways)
    const devices = await unifiGet('stat/device');
    // Fetch active clients
    const clients = await unifiGet('stat/sta');

    if (!devices) {
      unifiConnected = false;
      broadcast({ type: 'unifi_status', connected: false });
      return;
    }

    unifiConnected = true;
    const prevDevices = Object.fromEntries(unifiDevices.map(d => [d.mac, d]));

    unifiDevices = (devices || []).map(d => {
      const clientCount = (clients || []).filter(c => c.ap_mac === d.mac).length;
      const isOnline = d.state === 1;
      const prev = prevDevices[d.mac];

      // Log to status_events on change or first seen
      if (!prev || (prev.state === 1) !== isOnline) {
        logStatusEvent('unifi', d.mac, d.name || d.ip || d.mac, d.ip || '', isOnline ? 'UP' : 'DOWN', d.uptime ? null : null);
        if (prev) {
          broadcast({ type: 'alert', hostId: d.mac, hostName: d.name || d.mac,
            status: isOnline ? 'UP' : 'DOWN', timestamp: new Date().toISOString() });
          sendAlertNotification({ category: 'unifi', entityName: d.name || d.mac, entityTarget: d.ip || '', status: isOnline ? 'UP' : 'DOWN' });
        }
      }

      return {
        mac: d.mac,
        name: d.name || d.model || d.mac,
        ip: d.ip || '',
        model: d.model || '',
        type: mapUnifiType(d.type),
        state: d.state,       // 1=connected, 0=disconnected
        online: isOnline,
        uptime: d.uptime || 0,
        clients: clientCount,
        tx_bytes: d.tx_bytes || 0,
        rx_bytes: d.rx_bytes || 0,
        load_avg: d.sys_stats?.loadavg_1 || 0,
        mem_util: d.sys_stats?.mem_util || 0,
        cpu_util: d.system_stats?.cpu || 0,
        essids: d.vap_table ? [...new Set(d.vap_table.map(v => v.essid).filter(Boolean))] : [],
        version: d.version || '',
        last_seen: d.last_seen ? new Date(d.last_seen * 1000).toISOString() : null,
      };
    });

    unifiClients = (clients || []).map(c => ({
      mac: c.mac,
      hostname: c.hostname || c.oui || 'Unknown',
      ip: c.ip || '',
      ap_mac: c.ap_mac || '',
      essid: c.essid || '',
      rssi: c.rssi || 0,
      signal: c.signal || 0,
      tx_rate: c.tx_rate || 0,
      rx_rate: c.rx_rate || 0,
      uptime: c.uptime || 0,
    }));

    // Update last_sync
    dbRun('UPDATE unifi_settings SET last_sync = ? WHERE id = 1', [new Date().toISOString()]);

    broadcast({ type: 'unifi_sync',
      connected: true, deviceCount: unifiDevices.length,
      clientCount: unifiClients.length,
      devices: unifiDevices, clients: unifiClients,
    });

    console.log(`[UniFi] Sync: ${unifiDevices.length} devices, ${unifiClients.length} clients`);
  } catch(e) {
    console.error('[UniFi] Sync error:', e.message);
    unifiConnected = false;
    broadcast({ type: 'unifi_status', connected: false, error: e.message });
  }
}

function startUnifiSync() {
  if (unifiSyncTimer) clearInterval(unifiSyncTimer);
  loadUnifiConfig();
  if (!unifiConfig?.enabled || !unifiConfig?.url) return;
  syncUnifi(); // immediate
  const interval = (unifiConfig.sync_interval || 30) * 1000;
  unifiSyncTimer = setInterval(syncUnifi, interval);
  console.log(`[UniFi] Auto-sync every ${unifiConfig.sync_interval || 30}s`);
}

function stopUnifiSync() {
  if (unifiSyncTimer) { clearInterval(unifiSyncTimer); unifiSyncTimer = null; }
  unifiCookie = null;
  unifiConnected = false;
  unifiDevices = [];
  unifiClients = [];
}

// ── UniFi REST API ────────────────────────────────────────────────────────────

// GET settings (password masked)
app.get('/api/unifi/settings', (req, res) => {
  const cfg = dbGet('SELECT * FROM unifi_settings WHERE id = 1');
  if (!cfg) return res.json({ url: '', username: '', password: '', site: 'default', enabled: 0, sync_interval: 30 });
  res.json({ ...cfg, password: cfg.password ? '***' : '' });
});

// PUT settings
app.put('/api/unifi/settings', (req, res) => {
  const { url, username, password, site, enabled, sync_interval } = req.body;
  const existing = dbGet('SELECT * FROM unifi_settings WHERE id = 1');
  const finalPw  = password === '***' ? (existing?.password || '') : (password || '');
  dbRun(
    'UPDATE unifi_settings SET url=?, username=?, password=?, site=?, enabled=?, sync_interval=? WHERE id=1',
    [url || '', username || '', finalPw, site || 'default', enabled ? 1 : 0, sync_interval || 30]
  );
  loadUnifiConfig();
  stopUnifiSync();
  if (enabled) startUnifiSync();
  res.json({ ok: true });
});

// POST /api/unifi/test — test connection without saving
app.post('/api/unifi/test', async (req, res) => {
  const { url, username, password, site } = req.body;
  if (!url || !username) return res.status(400).json({ ok: false, error: 'URL dan username wajib diisi' });
  try {
    const loginUrl = `${url.replace(/\/$/, '')}/api/login`;
    const loginRes = await axios.post(loginUrl, { username, password, remember: false }, {
      httpsAgent: unifiAgent, timeout: 10000, validateStatus: () => true,
    });
    if (loginRes.status === 200 && loginRes.data?.meta?.rc === 'ok') {
      // Try fetch device list
      const cookie = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      const devRes = await axios.get(`${url.replace(/\/$/, '')}/api/s/${site || 'default'}/stat/device`, {
        httpsAgent: unifiAgent, timeout: 10000, validateStatus: () => true,
        headers: { Cookie: cookie },
      });
      const count = devRes.data?.data?.length || 0;
      res.json({ ok: true, message: `Koneksi berhasil! Ditemukan ${count} device di site "${site || 'default'}"` });
    } else {
      res.json({ ok: false, error: `Login gagal: ${loginRes.data?.meta?.msg || loginRes.status}` });
    }
  } catch(e) {
    res.json({ ok: false, error: `Tidak bisa terhubung: ${e.message}` });
  }
});

// POST /api/unifi/sync — force sync now
app.post('/api/unifi/sync', async (req, res) => {
  await syncUnifi();
  res.json({ ok: true, connected: unifiConnected, deviceCount: unifiDevices.length, clientCount: unifiClients.length });
});

// GET /api/unifi/devices — live device list
app.get('/api/unifi/devices', (req, res) => {
  res.json({ connected: unifiConnected, devices: unifiDevices, clientCount: unifiClients.length });
});

// GET /api/unifi/clients — all connected clients
app.get('/api/unifi/clients', (req, res) => {
  const { ap_mac } = req.query;
  const list = ap_mac ? unifiClients.filter(c => c.ap_mac === ap_mac) : unifiClients;
  res.json({ clients: list, total: list.length });
});

// GET /api/unifi/status
app.get('/api/unifi/status', (req, res) => {
  const cfg = dbGet('SELECT url, enabled, site, sync_interval, last_sync FROM unifi_settings WHERE id = 1');
  res.json({
    connected: unifiConnected, enabled: !!cfg?.enabled, url: cfg?.url || '',
    site: cfg?.site || 'default', sync_interval: cfg?.sync_interval || 30,
    last_sync: cfg?.last_sync, deviceCount: unifiDevices.length, clientCount: unifiClients.length,
  });
});

// POST /api/unifi/reboot — restart a UniFi device by MAC
app.post('/api/unifi/reboot', async (req, res) => {
  const { mac } = req.body || {};
  if (!unifiConfig?.enabled || !unifiConfig?.url) return res.status(400).json({ success: false, error: 'Integrasi UniFi belum diaktifkan' });
  if (!mac) return res.status(400).json({ success: false, error: 'MAC wajib diisi' });

  const dev = unifiDevices.find(d => d.mac === mac);
  if (!dev) return res.status(404).json({ success: false, error: 'Device tidak ditemukan. Lakukan sync terlebih dahulu.' });

  try {
    const result = await unifiCmd('cmd/devmgr', { cmd: 'restart', mac });
    if (!result) return res.status(502).json({ success: false, error: 'Controller UniFi menolak perintah restart' });
    logStatusEvent('unifi', mac, dev.name || mac, dev.ip || '', 'RESTART', null);
    res.json({ success: true, message: `Perintah restart terkirim ke ${dev.name || mac}` });
  } catch (e) {
    res.status(500).json({ success: false, error: `Gagal restart: ${e.message}` });
  }
});


// ── RUIJIE CLOUD INTEGRATION ──────────────────────────────────────────────────
// Docs: https://cloud.ruijienetworks.com/help/#/ArticleList?id=7e875942927f4e3fb3e5736c8502c03c
// Flow: POST /service/api/oauth20/client/access_token (appid+secret) -> accessToken
//       GET  /service/api/maint/devices?access_token=...  -> device list
//       GET  /service/api/v1/client/list?access_token=...  -> online client list

let ruijieConfig    = null;  // { server, appid, secret, enabled, sync_interval }
let ruijieToken     = null;
let ruijieTokenExp  = 0;     // epoch ms when token expires
let ruijieSyncTimer = null;
let ruijieDevices   = [];
let ruijieClients   = [];
let ruijieConnected = false;

function initRuijieTable() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS ruijie_settings (
      id INTEGER PRIMARY KEY,
      server TEXT DEFAULT 'https://cloud-as.ruijienetworks.com',
      appid TEXT DEFAULT '',
      secret TEXT DEFAULT '',
      enabled INTEGER DEFAULT 0,
      sync_interval INTEGER DEFAULT 60,
      last_sync DATETIME
    )`);
    const existing = dbGet('SELECT id FROM ruijie_settings WHERE id = 1');
    if (!existing) {
      dbRun(`INSERT INTO ruijie_settings (id, server, appid, secret, enabled, sync_interval)
             VALUES (1, 'https://cloud-as.ruijienetworks.com', '', '', 0, 60)`);
    }
    saveDB();
  } catch (e) { console.error('[Ruijie] initRuijieTable error:', e.message); }
}

function loadRuijieConfig() {
  const row = dbGet('SELECT * FROM ruijie_settings WHERE id = 1');
  if (row) ruijieConfig = row;
  return row;
}

// Get (or refresh) access token
async function ruijieGetToken(force = false) {
  if (!ruijieConfig || !ruijieConfig.appid || !ruijieConfig.secret) return null;
  if (!force && ruijieToken && Date.now() < ruijieTokenExp) return ruijieToken;

  try {
    const base = ruijieConfig.server.replace(/\/$/, '');
    const url  = `${base}/service/api/oauth20/client/access_token?token=d63dss0a81e4415a889ac5b78fsc904a`;
    const res  = await axios.post(url, {
      appid: ruijieConfig.appid,
      secret: ruijieConfig.secret,
    }, { timeout: 10000, validateStatus: () => true });

    if (res.status === 200 && res.data?.code === 0 && res.data?.accessToken) {
      ruijieToken = res.data.accessToken;
      ruijieTokenExp = Date.now() + 55 * 60 * 1000; // valid ~60min, refresh at 55
      ruijieConnected = true;
      console.log('[Ruijie] Token diperoleh');
      return ruijieToken;
    } else {
      console.error('[Ruijie] Gagal ambil token:', res.data?.msg || res.status);
      ruijieConnected = false;
      ruijieToken = null;
      return null;
    }
  } catch (e) {
    console.error('[Ruijie] Token error:', e.message);
    ruijieConnected = false;
    ruijieToken = null;
    return null;
  }
}

// Generic authenticated GET to Ruijie Cloud
async function ruijieGet(path, extraParams = {}) {
  const token = await ruijieGetToken();
  if (!token) return null;
  const base = ruijieConfig.server.replace(/\/$/, '');
  const params = new URLSearchParams({ access_token: token, ...extraParams }).toString();
  const url = `${base}${path}${path.includes('?') ? '&' : '?'}${params}`;

  let res = await axios.get(url, { timeout: 15000, validateStatus: () => true });

  // Token expired (code 4) — refresh once and retry
  if (res.data?.code === 4) {
    const newToken = await ruijieGetToken(true);
    if (!newToken) return null;
    const params2 = new URLSearchParams({ access_token: newToken, ...extraParams }).toString();
    res = await axios.get(`${base}${path}${path.includes('?') ? '&' : '?'}${params2}`, {
      timeout: 15000, validateStatus: () => true,
    });
  }

  if (res.status === 200 && res.data?.code === 0) return res.data;
  return null;
}

// POST a maintenance command to Ruijie Cloud (e.g. device reboot)
async function ruijiePost(path, body = {}) {
  const token = await ruijieGetToken();
  if (!token) return null;
  const base = ruijieConfig.server.replace(/\/$/, '');
  const url = `${base}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;

  let res = await axios.post(url, body, { timeout: 15000, validateStatus: () => true });

  // Token expired (code 4) — refresh once and retry
  if (res.data?.code === 4) {
    const newToken = await ruijieGetToken(true);
    if (!newToken) return null;
    const url2 = `${base}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(newToken)}`;
    res = await axios.post(url2, body, { timeout: 15000, validateStatus: () => true });
  }

  if (res.status === 200 && res.data?.code === 0) return res.data;
  return null;
}

function mapRuijieType(devType) {
  if (!devType) return 'switch';
  const t = String(devType).toUpperCase();
  if (t.includes('AP')) return 'ap';
  if (t.includes('GATEWAY') || t.includes('GW') || t.includes('ROUTER')) return 'router';
  if (t.includes('SWITCH') || t.includes('SW')) return 'switch';
  return 'switch';
}

async function syncRuijie() {
  if (!ruijieConfig?.enabled || !ruijieConfig?.appid) return;

  try {
    // ── Step 1: Get access token ───────────────────────────────────────
    const token = await ruijieGetToken();
    if (!token) {
      ruijieConnected = false;
      broadcast({ type: 'ruijie_status', connected: false });
      return;
    }

    const base = ruijieConfig.server.replace(/\/$/, '');

    // ── Step 2: Get group tree ──────────────────────────────────────────
    // Response shape: { code, msg, groupTree: { id:0, name:'dumy', children: [ { id, name, children: [...] } ] } }
    const groupsRes = await axios.get(`${base}/service/api/maint/groups?access_token=${token}`, {
      timeout: 15000, validateStatus: () => true,
    });

    console.log('[Ruijie] Groups response code:', groupsRes.data?.code);

    if (!groupsRes.data || groupsRes.data.code !== 0) {
      console.error('[Ruijie] Gagal ambil groups:', groupsRes.data?.msg);
      ruijieConnected = false;
      broadcast({ type: 'ruijie_status', connected: false });
      return;
    }

    ruijieConnected = true;

    // Collect all groups recursively from the nested groupTree (skip dummy root id 0)
    const allGroups = [];
    function collectGroups(node) {
      if (!node) return;
      if (node.id !== undefined && node.id !== 0) allGroups.push(node);
      if (Array.isArray(node.children)) node.children.forEach(collectGroups);
    }
    collectGroups(groupsRes.data.groupTree);

    console.log(`[Ruijie] Found ${allGroups.length} groups`);

    // ── Step 3: Get devices per group ──────────────────────────────────
    // Correct endpoint: /service/api/maint/devices?group_id=X (note: underscore, different from groups' groupId)
    // Response shape: { code, msg, deviceList: [ {...} ], totalCount }
    const allDevicesRaw = new Map(); // serialNumber -> raw device object

    for (const group of allGroups) {
      const gid = group.id;
      try {
        const devListRes = await axios.get(
          `${base}/service/api/maint/devices?access_token=${token}&group_id=${gid}`,
          { timeout: 10000, validateStatus: () => true }
        );
        if (devListRes.data?.code === 0) {
          const devs = devListRes.data.deviceList || [];
          devs.forEach(d => {
            const sn = d.serialNumber;
            if (sn) allDevicesRaw.set(String(sn), d);
          });
          console.log(`[Ruijie] Group ${gid} (${group.name || ''}): ${devs.length} devices`);
        } else {
          console.error(`[Ruijie] Group ${gid} devices error:`, devListRes.data?.msg);
        }
      } catch (e) {
        console.error(`[Ruijie] Error fetching devices for group ${gid}:`, e.message);
      }
    }

    console.log(`[Ruijie] Total unique devices: ${allDevicesRaw.size}`);

    // ── Step 4: Normalize devices ───────────────────────────────────────
    // deviceList already contains everything we need — no extra per-device detail call required
    const prevMap = Object.fromEntries(ruijieDevices.map(d => [d.sn, d]));
    const newDevices = [];

    for (const [sn, dev] of allDevicesRaw) {
      const isOnline = dev.onlineStatus === 'ON';
      const devName = dev.aliasName || dev.name || sn;

      const prev = prevMap[sn];
      if (!prev || prev.online !== isOnline) {
        logStatusEvent('ruijie', sn, devName, dev.localIp || '', isOnline ? 'UP' : 'DOWN', null);
        if (prev) {
          broadcast({ type: 'alert', hostId: sn, hostName: devName,
            status: isOnline ? 'UP' : 'DOWN', timestamp: new Date().toISOString() });
          sendAlertNotification({ category: 'ruijie', entityName: devName, entityTarget: dev.localIp || '', status: isOnline ? 'UP' : 'DOWN' });
        }
      }

      newDevices.push({
        sn,
        mac: dev.mac || sn,
        name: devName,
        ip: dev.localIp || dev.cpeIp || '',
        model: dev.productClass || '',
        type: mapRuijieType(dev.commonType || dev.productClass || ''),
        online: isOnline,
        onlineStatus: dev.onlineStatus || (isOnline ? 'ON' : 'OFF'),
        clients: dev.clientNum || dev.staNum || dev.userCount || 0,
        version: dev.softwareVersion || '',
        group: dev.groupName || '',
        uptime: dev.lastOnline || 0,
        ssid: dev.ssid || '',
      });
    }

    ruijieDevices = newDevices;
    dbRun('UPDATE ruijie_settings SET last_sync = ? WHERE id = 1', [new Date().toISOString()]);

    broadcast({
      type: 'ruijie_sync', connected: true,
      deviceCount: ruijieDevices.length, clientCount: ruijieClients.length,
      devices: ruijieDevices,
    });

    console.log(`[Ruijie] Sync selesai: ${ruijieDevices.length} devices (${ruijieDevices.filter(d=>d.online).length} online)`);

  } catch (e) {
    console.error('[Ruijie] Sync error:', e.message);
    ruijieConnected = false;
    broadcast({ type: 'ruijie_status', connected: false, error: e.message });
  }
}

function startRuijieSync() {
  if (ruijieSyncTimer) clearInterval(ruijieSyncTimer);
  loadRuijieConfig();
  if (!ruijieConfig?.enabled || !ruijieConfig?.appid) return;
  syncRuijie();
  const interval = (ruijieConfig.sync_interval || 30) * 1000;
  ruijieSyncTimer = setInterval(syncRuijie, interval);
  console.log(`[Ruijie] Auto-sync every ${ruijieConfig.sync_interval || 30}s`);
}

function stopRuijieSync() {
  if (ruijieSyncTimer) { clearInterval(ruijieSyncTimer); ruijieSyncTimer = null; }
  ruijieToken = null;
  ruijieConnected = false;
  ruijieDevices = [];
  ruijieClients = [];
}

// ── Ruijie REST API ────────────────────────────────────────────────────────────

app.get('/api/ruijie/settings', (req, res) => {
  const cfg = dbGet('SELECT * FROM ruijie_settings WHERE id = 1');
  if (!cfg) return res.json({ server: 'https://cloud-as.ruijienetworks.com', appid: '', secret: '', enabled: 0, sync_interval: 30 });
  res.json({ ...cfg, secret: cfg.secret ? '***' : '' });
});

app.put('/api/ruijie/settings', (req, res) => {
  const { server, appid, secret, enabled, sync_interval } = req.body;
  const existing = dbGet('SELECT * FROM ruijie_settings WHERE id = 1');
  const finalSecret = secret === '***' ? (existing?.secret || '') : (secret || '');
  dbRun(
    'UPDATE ruijie_settings SET server=?, appid=?, secret=?, enabled=?, sync_interval=? WHERE id=1',
    [server || 'https://cloud-as.ruijienetworks.com', appid || '', finalSecret, enabled ? 1 : 0, sync_interval || 30]
  );
  loadRuijieConfig();
  stopRuijieSync();
  if (enabled) startRuijieSync();
  res.json({ ok: true });
});

app.post('/api/ruijie/test', async (req, res) => {
  const { server, appid, secret } = req.body;
  if (!appid || !secret) return res.status(400).json({ ok: false, error: 'AppID dan Key wajib diisi' });
  try {
    const base = (server || 'https://cloud-as.ruijienetworks.com').replace(/\/$/, '');

    // Step 1: Get token
    const tokenUrl = `${base}/service/api/oauth20/client/access_token?token=d63dss0a81e4415a889ac5b78fsc904a`;
    const tokenRes = await axios.post(tokenUrl, { appid, secret }, { timeout: 10000, validateStatus: () => true });

    if (!tokenRes.data || tokenRes.data.code !== 0 || !tokenRes.data.accessToken) {
      return res.json({ ok: false, error: `Auth gagal: ${tokenRes.data?.msg || tokenRes.status}` });
    }

    const token = tokenRes.data.accessToken;

    // Step 2: Get groups
    const groupsRes = await axios.get(`${base}/service/api/maint/groups?access_token=${token}`, {
      timeout: 10000, validateStatus: () => true,
    });

    if (!groupsRes.data || groupsRes.data.code !== 0) {
      return res.json({ ok: false, error: `Gagal ambil groups: ${groupsRes.data?.msg || groupsRes.status}` });
    }

    // Collect all groups recursively
    const allGroups = [];
    function collectGroups(groups) {
      if (!Array.isArray(groups)) return;
      groups.forEach(g => {
        allGroups.push(g);
        if (g.childGroups && g.childGroups.length) collectGroups(g.childGroups);
        if (g.children && g.children.length) collectGroups(g.children);
      });
    }
    const rootGroups = groupsRes.data.groups || groupsRes.data.list || groupsRes.data.data || [];
    collectGroups(Array.isArray(rootGroups) ? rootGroups : [rootGroups]);

    // Step 3: Count devices across all groups
    let totalDevices = 0;
    for (const group of allGroups) {
      const gid = group.groupId || group.id || group.Id;
      if (!gid) continue;
      try {
        const devRes = await axios.get(`${base}/service/api/maint/groups?access_token=${token}&groupId=${gid}`, {
          timeout: 8000, validateStatus: () => true,
        });
        if (devRes.data?.code === 0) {
          const devs = devRes.data.devices || devRes.data.deviceList || [];
          totalDevices += devs.length;
        }
      } catch (_) {}
    }

    res.json({ ok: true, message: `Koneksi berhasil! ${allGroups.length} group, ${totalDevices} device ditemukan.` });

  } catch (e) {
    res.json({ ok: false, error: `Tidak bisa terhubung: ${e.message}` });
  }
});

app.post('/api/ruijie/sync', async (req, res) => {
  await syncRuijie();
  res.json({ ok: true, connected: ruijieConnected, deviceCount: ruijieDevices.length, clientCount: ruijieClients.length });
});

app.get('/api/ruijie/devices', (req, res) => {
  res.json({ connected: ruijieConnected, devices: ruijieDevices, clientCount: ruijieClients.length });
});

app.get('/api/ruijie/clients', (req, res) => {
  const { ap_mac } = req.query;
  const list = ap_mac ? ruijieClients.filter(c => c.ap_mac === ap_mac) : ruijieClients;
  res.json({ clients: list, total: list.length });
});

app.get('/api/ruijie/status', (req, res) => {
  const cfg = dbGet('SELECT server, enabled, sync_interval, last_sync FROM ruijie_settings WHERE id = 1');
  res.json({
    connected: ruijieConnected, enabled: !!cfg?.enabled, server: cfg?.server || '',
    sync_interval: cfg?.sync_interval || 30, last_sync: cfg?.last_sync,
    deviceCount: ruijieDevices.length, clientCount: ruijieClients.length,
  });
});

// POST /api/ruijie/reboot — restart a Ruijie device by serial number (SN)
// Catatan: endpoint upstream adalah best-guess (POST /service/api/maint/device/reboot { sn })
// dan perlu disesuaikan bila respons code != 0 pada versi API akun yang dipakai.
app.post('/api/ruijie/reboot', async (req, res) => {
  const { sn } = req.body || {};
  if (!ruijieConfig?.enabled || !ruijieConfig?.appid) return res.status(400).json({ success: false, error: 'Integrasi Ruijie belum diaktifkan' });
  if (!sn) return res.status(400).json({ success: false, error: 'SN wajib diisi' });

  const dev = ruijieDevices.find(d => d.sn === sn);
  if (!dev) return res.status(404).json({ success: false, error: 'Device tidak ditemukan. Lakukan sync terlebih dahulu.' });

  try {
    const result = await ruijiePost('/service/api/maint/device/reboot', { sn });
    if (!result) return res.status(502).json({ success: false, error: 'Cloud Ruijie menolak perintah restart (cek endpoint/payload API)' });
    logStatusEvent('ruijie', sn, dev.name || sn, dev.ip || '', 'RESTART', null);
    res.json({ success: true, message: `Perintah restart terkirim ke ${dev.name || sn}` });
  } catch (e) {
    res.status(500).json({ success: false, error: `Gagal restart: ${e.message}` });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// IT CHECKLIST (Daily / Weekly / Monthly / Yearly / Occasional)
// Task definitions live in the frontend (checklistData.js); backend only
// stores completion state per task per period, so history is preserved.
// ══════════════════════════════════════════════════════════════════════════

function initChecklistTable() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS checklist_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period_key TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      completed_by TEXT DEFAULT '',
      note TEXT DEFAULT '',
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, period_type, period_key)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_checklist_period ON checklist_completions(period_type, period_key)`);
  } catch (e) { console.error('[Checklist] initChecklistTable error:', e.message); }
}

// ── DEFINISI TUGAS CHECKLIST (dinamis, editable via UI) ────────────────────────
// Seeded dari checklist_seed.json agar history completion lama tetap tersambung
// (task_id lama dipertahankan, mis. 'd-01').

function initChecklistTasksTable() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS checklist_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT UNIQUE NOT NULL,
      period_type TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT DEFAULT '',
      sort INTEGER DEFAULT 0
    )`);
    const count = dbGet('SELECT COUNT(*) as c FROM checklist_tasks');
    if ((count?.c || 0) === 0) {
      const seedPath = path.join(__dirname, 'checklist_seed.json');
      if (fs.existsSync(seedPath)) {
        const list = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        list.forEach(t => {
          db.run('INSERT INTO checklist_tasks (task_id, period_type, title, desc, sort) VALUES (?,?,?,?,?)',
            [t.task_id, t.period_type, t.title, t.desc || '', t.sort || 0]);
        });
        saveDB();
      }
    }
  } catch (e) { console.error('[Checklist] initChecklistTasksTable error:', e.message); }
}

function checklistTaskFromRow(r) {
  if (!r) return null;
  return { id: r.id, task_id: r.task_id, period_type: r.period_type, title: r.title, desc: r.desc, sort: r.sort };
}

// GET /api/checklist/tasks?periodType=daily — daftar definisi tugas
app.get('/api/checklist/tasks', (req, res) => {
  try {
    const { periodType } = req.query;
    const where = periodType ? 'WHERE period_type = ?' : '';
    const params = periodType ? [periodType] : [];
    const rows = dbAll(`SELECT * FROM checklist_tasks ${where} ORDER BY sort ASC, id ASC`, params);
    res.json({ tasks: rows.map(checklistTaskFromRow) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/checklist/tasks — tambah definisi tugas baru
app.post('/api/checklist/tasks', (req, res) => {
  const { periodType, title, desc } = req.body || {};
  if (!periodType || !title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Tipe periode dan judul wajib diisi' });
  }
  try {
    const maxSort = dbGet('SELECT MAX(sort) as m FROM checklist_tasks WHERE period_type = ?', [periodType])?.m || 0;
    const id = dbRun('INSERT INTO checklist_tasks (task_id, period_type, title, desc, sort) VALUES (?,?,?,?,?)',
      ['', periodType, String(title).trim(), String(desc || '').trim(), maxSort + 1]);
    const taskId = 't' + id;
    dbRun('UPDATE checklist_tasks SET task_id=? WHERE id=?', [taskId, id]);
    const task = checklistTaskFromRow(dbGet('SELECT * FROM checklist_tasks WHERE id = ?', [id]));
    broadcast({ type: 'checklist_task_update', periodType });
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/checklist/tasks/:id — edit definisi tugas
app.put('/api/checklist/tasks/:id', (req, res) => {
  const { title, desc } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Judul wajib diisi' });
  }
  try {
    dbRun('UPDATE checklist_tasks SET title=?, desc=? WHERE id=?',
      [String(title).trim(), String(desc || '').trim(), req.params.id]);
    const task = checklistTaskFromRow(dbGet('SELECT * FROM checklist_tasks WHERE id = ?', [req.params.id]));
    if (!task) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
    broadcast({ type: 'checklist_task_update', periodType: task.period_type });
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/checklist/tasks/:id — hapus definisi tugas
app.delete('/api/checklist/tasks/:id', (req, res) => {
  try {
    const task = dbGet('SELECT * FROM checklist_tasks WHERE id = ?', [req.params.id]);
    dbRun('DELETE FROM checklist_tasks WHERE id = ?', [req.params.id]);
    broadcast({ type: 'checklist_task_update', periodType: task?.period_type });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/checklist/:periodType/:periodKey — completion state for one period
app.get('/api/checklist/:periodType/:periodKey', (req, res) => {
  try {
    const rows = dbAll(
      'SELECT task_id, completed, completed_by, note, completed_at FROM checklist_completions WHERE period_type = ? AND period_key = ?',
      [req.params.periodType, req.params.periodKey]
    );
    const map = {};
    rows.forEach(r => { map[r.task_id] = { completed: !!r.completed, completed_by: r.completed_by, note: r.note, completed_at: r.completed_at }; });
    res.json({ periodType: req.params.periodType, periodKey: req.params.periodKey, tasks: map });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/checklist/toggle — { taskId, periodType, periodKey, completed, completedBy?, note? }
app.post('/api/checklist/toggle', (req, res) => {
  const { taskId, periodType, periodKey, completed, completedBy, note } = req.body;
  if (!taskId || !periodType || !periodKey) {
    return res.status(400).json({ ok: false, error: 'taskId, periodType, periodKey wajib diisi' });
  }
  try {
    if (completed) {
      dbRun(
        `INSERT INTO checklist_completions (task_id, period_type, period_key, completed, completed_by, note, completed_at)
         VALUES (?,?,?,1,?,?,?)
         ON CONFLICT(task_id, period_type, period_key)
         DO UPDATE SET completed=1, completed_by=excluded.completed_by, note=excluded.note, completed_at=excluded.completed_at`,
        [taskId, periodType, periodKey, completedBy || '', note || '', new Date().toISOString()]
      );
    } else {
      dbRun(
        `INSERT INTO checklist_completions (task_id, period_type, period_key, completed, completed_by, note, completed_at)
         VALUES (?,?,?,0,?,?,?)
         ON CONFLICT(task_id, period_type, period_key)
         DO UPDATE SET completed=0, completed_by=excluded.completed_by, note=excluded.note, completed_at=excluded.completed_at`,
        [taskId, periodType, periodKey, completedBy || '', note || '', new Date().toISOString()]
      );
    }
    broadcast({ type: 'checklist_update', taskId, periodType, periodKey, completed: !!completed });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/checklist/history/:periodType?limit=30 — recent periods with completion summary
app.get('/api/checklist/history/:periodType', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const rows = dbAll(
      `SELECT period_key, COUNT(*) as total, SUM(completed) as done
       FROM checklist_completions WHERE period_type = ? GROUP BY period_key ORDER BY period_key DESC LIMIT ?`,
      [req.params.periodType, limit]
    );
    res.json({ periodType: req.params.periodType, history: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// PROJECT CHECKLIST — task dinamis buatan user.
// Item yang belum di-check tetap tampil; saat di-check otomatis disembunyikan.
// ══════════════════════════════════════════════════════════════════════════

function initProjectTasksTable() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS project_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      note TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME DEFAULT NULL
    )`);
  } catch (e) { console.error('[Checklist] initProjectTasksTable error:', e.message); }
}

// GET /api/checklist/projects — daftar semua task (termasuk yang selesai)
app.get('/api/checklist/projects', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM project_tasks ORDER BY completed ASC, id DESC');
    res.json({ tasks: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/checklist/projects — tambah task baru
app.post('/api/checklist/projects', (req, res) => {
  const { title, note } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Judul wajib diisi' });
  }
  try {
    const id = dbRun('INSERT INTO project_tasks (title, note) VALUES (?,?)',
      [String(title).trim(), String(note || '').trim()]);
    const task = dbGet('SELECT * FROM project_tasks WHERE id = ?', [id]);
    broadcast({ type: 'checklist_project_update' });
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/checklist/projects/:id — edit judul/note
app.put('/api/checklist/projects/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, note } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Judul wajib diisi' });
  }
  try {
    dbRun('UPDATE project_tasks SET title=?, note=? WHERE id=?',
      [String(title).trim(), String(note || '').trim(), id]);
    const task = dbGet('SELECT * FROM project_tasks WHERE id = ?', [id]);
    broadcast({ type: 'checklist_project_update' });
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/checklist/projects/:id — hapus task
app.delete('/api/checklist/projects/:id', (req, res) => {
  try {
    dbRun('DELETE FROM project_tasks WHERE id = ?', [parseInt(req.params.id, 10)]);
    broadcast({ type: 'checklist_project_update' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/checklist/projects/:id/toggle — check (hide) / uncheck (show)
app.post('/api/checklist/projects/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed } = req.body || {};
  try {
    if (completed) {
      dbRun('UPDATE project_tasks SET completed=1, completed_at=? WHERE id=?', [new Date().toISOString(), id]);
    } else {
      dbRun('UPDATE project_tasks SET completed=0, completed_at=NULL WHERE id=?', [id]);
    }
    const task = dbGet('SELECT * FROM project_tasks WHERE id = ?', [id]);
    broadcast({ type: 'checklist_project_update' });
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// MARKET LIST IT — PR/ORDER (belum datang) & ASET IT (sudah datang)
// Flow: PR -> Order -> (tiba) -> jadi Aset IT
// ══════════════════════════════════════════════════════════════════════════

function initProcurementTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS it_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_pr TEXT DEFAULT '',
      item_name TEXT NOT NULL,
      brand TEXT DEFAULT '',
      qty INTEGER DEFAULT 1,
      unit TEXT DEFAULT '',
      vendor TEXT DEFAULT '',
      price REAL DEFAULT 0,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      est_arrival DATETIME,
      status TEXT DEFAULT 'pr',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS it_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT DEFAULT '',
      item_name TEXT NOT NULL,
      brand TEXT DEFAULT '',
      model TEXT DEFAULT '',
      serial_no TEXT DEFAULT '',
      category TEXT DEFAULT '',
      location TEXT DEFAULT '',
      purchase_date DATETIME,
      purchase_price REAL DEFAULT 0,
      warranty_end DATETIME,
      pic TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      order_id INTEGER,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  saveDB();
}

function genAssetCode(id) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `AST-${d}-${String(id).padStart(3, '0')}`;
}

// ── PR / ORDER ────────────────────────────────────────────────────────────────

// GET /api/orders?status=&search=&limit=&offset=
app.get('/api/orders', (req, res) => {
  let where = [];
  let params = [];
  const { status, search, limit = 200, offset = 0 } = req.query;
  if (status && status !== 'all') { where.push('status = ?'); params.push(status); }
  if (search) {
    where.push('(item_name LIKE ? OR brand LIKE ? OR vendor LIKE ? OR no_pr LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = dbAll(
    `SELECT o.*, (SELECT COUNT(*) FROM it_assets a WHERE a.order_id = o.id) AS asset_count
     FROM it_orders o ${whereClause} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit) || 200, parseInt(offset) || 0]
  );
  res.json({ orders: rows, total: rows.length });
});

app.post('/api/orders', (req, res) => {
  const { no_pr, item_name, brand, qty, unit, vendor, price, order_date, est_arrival, status, notes } = req.body || {};
  if (!item_name) return res.status(400).json({ error: 'Nama barang wajib diisi' });
  const id = dbRun(
    'INSERT INTO it_orders (no_pr, item_name, brand, qty, unit, vendor, price, order_date, est_arrival, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [no_pr || '', item_name, brand || '', parseInt(qty) || 1, unit || '', vendor || '', parseFloat(price) || 0,
     order_date || new Date().toISOString(), est_arrival || null, status || 'pr', notes || '']
  );
  const order = dbGet('SELECT * FROM it_orders WHERE id = ?', [parseInt(id)]);
  broadcast({ type: 'order_added', order });
  res.json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const { no_pr, item_name, brand, qty, unit, vendor, price, order_date, est_arrival, status, notes } = req.body || {};
  dbRun(
    `UPDATE it_orders SET no_pr=?, item_name=?, brand=?, qty=?, unit=?, vendor=?, price=?, order_date=?, est_arrival=?, status=?, notes=? WHERE id=?`,
    [no_pr || '', item_name, brand || '', parseInt(qty) || 1, unit || '', vendor || '', parseFloat(price) || 0,
     order_date || null, est_arrival || null, status || 'pr', notes || '', req.params.id]
  );
  const order = dbGet('SELECT * FROM it_orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });
  broadcast({ type: 'order_updated', order });
  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  dbRun('DELETE FROM it_orders WHERE id = ?', [req.params.id]);
  broadcast({ type: 'order_deleted', orderId: parseInt(req.params.id) });
  res.json({ ok: true });
});

// POST /api/orders/:id/arrive — barang tiba (hanya tandai status, TIDAK otomatis jadi Aset)
app.post('/api/orders/:id/arrive', (req, res) => {
  const order = dbGet('SELECT * FROM it_orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });
  dbRun("UPDATE it_orders SET status='arrived' WHERE id=?", [order.id]);
  const updatedOrder = dbGet('SELECT * FROM it_orders WHERE id = ?', [order.id]);
  broadcast({ type: 'order_updated', order: updatedOrder });
  res.json({ ok: true, order: updatedOrder, assets: [] });
});

// POST /api/orders/:id/create-assets — barang yang sudah tiba DIJADIKAN Aset IT (manual, per kebutuhan)
app.post('/api/orders/:id/create-assets', (req, res) => {
  const order = dbGet('SELECT * FROM it_orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });
  const existing = dbGet('SELECT COUNT(*) as c FROM it_assets WHERE order_id = ?', [order.id]);
  if ((existing?.c || 0) > 0) return res.status(400).json({ error: 'Aset untuk order ini sudah pernah dibuat' });
  dbRun("UPDATE it_orders SET status='arrived' WHERE id=?", [order.id]);
  const created = [];
  const qty = Math.max(1, parseInt(order.qty) || 1);
  for (let i = 0; i < qty; i++) {
    const id = dbRun(
      'INSERT INTO it_assets (asset_code, item_name, brand, category, location, purchase_date, purchase_price, order_id, notes) VALUES (?,?,?,?,?,?,?,?,?)',
      ['', order.item_name, order.brand || '', 'Umum', '', order.order_date || new Date().toISOString(), order.price || 0, order.id,
       `Dari order ${order.no_pr || '#' + order.id}`]
    );
    dbRun('UPDATE it_assets SET asset_code=? WHERE id=?', [genAssetCode(parseInt(id)), id]);
    created.push(dbGet('SELECT * FROM it_assets WHERE id = ?', [parseInt(id)]));
  }
  const updatedOrder = dbGet('SELECT * FROM it_orders WHERE id = ?', [order.id]);
  broadcast({ type: 'order_updated', order: updatedOrder });
  broadcast({ type: 'asset_added', assets: created });
  res.json({ ok: true, order: updatedOrder, assets: created });
});

// ── ASET IT ───────────────────────────────────────────────────────────────────

// GET /api/assets?search=&category=&status=&limit=&offset=
app.get('/api/assets', (req, res) => {
  let where = [];
  let params = [];
  const { search, category, status, limit = 500, offset = 0 } = req.query;
  if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
  if (status && status !== 'all') { where.push('status = ?'); params.push(status); }
  if (search) {
    where.push('(item_name LIKE ? OR brand LIKE ? OR serial_no LIKE ? OR asset_code LIKE ? OR location LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = dbAll(
    `SELECT * FROM it_assets ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit) || 500, parseInt(offset) || 0]
  );
  res.json({ assets: rows, total: rows.length });
});

app.post('/api/assets', (req, res) => {
  const { asset_code, item_name, brand, model, serial_no, category, location, purchase_date, purchase_price, warranty_end, pic, status, order_id, notes } = req.body || {};
  if (!item_name) return res.status(400).json({ error: 'Nama barang wajib diisi' });
  const id = dbRun(
    'INSERT INTO it_assets (asset_code, item_name, brand, model, serial_no, category, location, purchase_date, purchase_price, warranty_end, pic, status, order_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [asset_code || '', item_name, brand || '', model || '', serial_no || '', category || '', location || '',
     purchase_date || null, parseFloat(purchase_price) || 0, warranty_end || null, pic || '', status || 'active',
     order_id || null, notes || '']
  );
  const asset = dbGet('SELECT * FROM it_assets WHERE id = ?', [parseInt(id)]);
  if (!asset.asset_code) {
    dbRun('UPDATE it_assets SET asset_code=? WHERE id=?', [genAssetCode(parseInt(id)), id]);
  }
  const final = dbGet('SELECT * FROM it_assets WHERE id = ?', [parseInt(id)]);
  broadcast({ type: 'asset_added', assets: [final] });
  res.json(final);
});

app.put('/api/assets/:id', (req, res) => {
  const { asset_code, item_name, brand, model, serial_no, category, location, purchase_date, purchase_price, warranty_end, pic, status, order_id, notes } = req.body || {};
  dbRun(
    `UPDATE it_assets SET asset_code=?, item_name=?, brand=?, model=?, serial_no=?, category=?, location=?, purchase_date=?, purchase_price=?, warranty_end=?, pic=?, status=?, order_id=?, notes=? WHERE id=?`,
    [asset_code || '', item_name, brand || '', model || '', serial_no || '', category || '', location || '',
     purchase_date || null, parseFloat(purchase_price) || 0, warranty_end || null, pic || '', status || 'active',
     order_id || null, notes || '', req.params.id]
  );
  const asset = dbGet('SELECT * FROM it_assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan' });
  broadcast({ type: 'asset_updated', asset });
  res.json(asset);
});

app.delete('/api/assets/:id', (req, res) => {
  dbRun('DELETE FROM it_assets WHERE id = ?', [req.params.id]);
  broadcast({ type: 'asset_deleted', assetId: parseInt(req.params.id) });
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════
// SOP & POLICY — dokumen dinamis (seeded dari sop_seed.json, editable via UI)
// ══════════════════════════════════════════════════════════════════════════

function initSopTable() {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS sop_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'manajemen',
      kebijakan TEXT DEFAULT '',
      prosedur TEXT DEFAULT '[]',
      sort INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    const count = dbGet('SELECT COUNT(*) as c FROM sop_docs');
    if ((count?.c || 0) === 0) {
      const seedPath = path.join(__dirname, 'sop_seed.json');
      if (fs.existsSync(seedPath)) {
        const list = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        list.forEach((s, i) => {
          db.run('INSERT INTO sop_docs (no, title, category, kebijakan, prosedur, sort) VALUES (?,?,?,?,?,?)',
            [s.no, s.title, s.category || 'manajemen', s.kebijakan || '', JSON.stringify(s.prosedur || []), i]);
        });
        saveDB();
      }
    }
  } catch (e) { console.error('[SOP] initSopTable error:', e.message); }
}

function sopFromRow(r) {
  if (!r) return null;
  let prosedur = [];
  try { prosedur = JSON.parse(r.prosedur || '[]'); } catch (e) { prosedur = []; }
  if (!Array.isArray(prosedur)) prosedur = [];
  return {
    id: r.id, no: r.no, title: r.title, category: r.category,
    kebijakan: r.kebijakan, prosedur, sort: r.sort,
    created_at: r.created_at, updated_at: r.updated_at,
  };
}

function nextSopNo() {
  const rows = dbAll("SELECT no FROM sop_docs WHERE no LIKE 'IT/%'");
  let max = 0;
  rows.forEach(r => {
    const m = String(r.no).match(/IT\/(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `IT/${String(max + 1).padStart(3, '0')}`;
}

// GET /api/sop?search=&category=
app.get('/api/sop', (req, res) => {
  try {
    const { search, category } = req.query;
    let where = [];
    let params = [];
    if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
    if (search) {
      where.push('(title LIKE ? OR no LIKE ? OR kebijakan LIKE ? OR prosedur LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = dbAll(`SELECT * FROM sop_docs ${whereClause} ORDER BY sort ASC, id ASC`, params);
    res.json({ docs: rows.map(sopFromRow), total: rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sop — tambah SOP baru
app.post('/api/sop', (req, res) => {
  const { no, title, category, kebijakan, prosedur } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Judul wajib diisi' });
  }
  try {
    const maxSort = dbGet('SELECT MAX(sort) as m FROM sop_docs')?.m || 0;
    const id = dbRun(
      'INSERT INTO sop_docs (no, title, category, kebijakan, prosedur, sort) VALUES (?,?,?,?,?,?)',
      [no || nextSopNo(), String(title).trim(), category || 'manajemen', kebijakan || '',
       JSON.stringify(Array.isArray(prosedur) ? prosedur : []), maxSort + 1]
    );
    const doc = sopFromRow(dbGet('SELECT * FROM sop_docs WHERE id = ?', [id]));
    broadcast({ type: 'sop_update' });
    res.json({ ok: true, doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/sop/:id — edit SOP
app.put('/api/sop/:id', (req, res) => {
  const { no, title, category, kebijakan, prosedur } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Judul wajib diisi' });
  }
  try {
    dbRun(
      'UPDATE sop_docs SET no=?, title=?, category=?, kebijakan=?, prosedur=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [no || nextSopNo(), String(title).trim(), category || 'manajemen', kebijakan || '',
       JSON.stringify(Array.isArray(prosedur) ? prosedur : []), req.params.id]
    );
    const doc = sopFromRow(dbGet('SELECT * FROM sop_docs WHERE id = ?', [req.params.id]));
    if (!doc) return res.status(404).json({ error: 'SOP tidak ditemukan' });
    broadcast({ type: 'sop_update' });
    res.json({ ok: true, doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/sop/:id — hapus SOP
app.delete('/api/sop/:id', (req, res) => {
  try {
    dbRun('DELETE FROM sop_docs WHERE id = ?', [req.params.id]);
    broadcast({ type: 'sop_update' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
