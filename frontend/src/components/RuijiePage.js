import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';

const API = process.env.REACT_APP_API_URL || '';

const TYPE_META = {
  ap:     { label: 'Access Point', icon: 'AP', color: 'var(--warning)' },
  switch: { label: 'Switch',       icon: 'SW', color: 'var(--violet)' },
  router: { label: 'Router/GW',    icon: 'RT', color: 'var(--accent)' },
};

function fmtUptime(s) {
  if (!s) return '-';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return d + 'h ' + h + 'j';
  if (h > 0) return h + 'j ' + m + 'm';
  return m + 'm';
}

const inputStyle = {
  background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)',
  padding: '9px 12px', borderRadius: 10, fontFamily: 'var(--mono)',
  fontSize: 12, width: '100%', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em',
  display: 'block', marginBottom: 7, textTransform: 'uppercase',
};

// ── Settings Modal ─────────────────────────────────────────────────────────
function SettingsModal({ onClose, onSaved }) {
  const [server, setServer] = useState('');
  const [appid, setAppid] = useState('');
  const [secret, setSecret] = useState(''); // kosong, tidak auto-fill
  const [enabled, setEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60);
  const [msg, setMsg] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(API + '/api/ruijie/settings')
      .then((r) => {
        const d = r.data || {};
        if (d.server) setServer(d.server);
        if (d.appid) setAppid(d.appid);
        setEnabled(!!d.enabled);
        if (d.sync_interval) setSyncInterval(d.sync_interval);
      })
      .catch(() => {});
  }, []);

  function handleTest() {
    if (!appid || !secret) {
      setMsg({ ok: false, text: 'AppID dan Key wajib diisi' });
      return;
    }
    setTesting(true);
    setMsg(null);
    axios.post(API + '/api/ruijie/test', { server, appid, secret })
      .then((r) => setMsg({ ok: r.data.ok, text: r.data.ok ? r.data.message : r.data.error }))
      .catch((e) => setMsg({ ok: false, text: 'Error: ' + e.message }))
      .finally(() => setTesting(false));
  }

  function handleSave() {
    setSaving(true);
    axios.put(API + '/api/ruijie/settings', { server, appid, secret, enabled, sync_interval: syncInterval })
      .then(() => { if (onSaved) onSaved(); onClose(); })
      .catch((e) => setMsg({ ok: false, text: 'Gagal simpan: ' + e.message }))
      .finally(() => setSaving(false));
  }

  return (
    <div className="modal-overlay">
      <div style={{ background: 'var(--card)', border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Konfigurasi Ruijie Cloud</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Ruijie Cloud Open API</div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--input-bg)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Aktifkan Integrasi</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Sinkronisasi otomatis</div>
            </div>
            <div onClick={() => setEnabled(!enabled)}
              style={{ width: 46, height: 26, borderRadius: 13, cursor: 'pointer',
                background: enabled ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, width: 20, height: 20,
                left: enabled ? 23 : 3, borderRadius: '50%', background: '#fff' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Server URL</label>
            <input style={inputStyle} value={server} placeholder="https://cloud-as.ruijienetworks.com"
              onChange={(e) => setServer(e.target.value)} />
            <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 5 }}>Gunakan server sesuai region akun Ruijie Cloud kamu</div>
          </div>
          <div>
            <label style={labelStyle}>AppID *</label>
            <input style={inputStyle} value={appid} placeholder="AppID dari Ruijie Cloud"
              autoComplete="off" onChange={(e) => setAppid(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Key (Secret) *</label>
            <input style={inputStyle} type="password" value={secret}
              placeholder="Masukkan key/secret" autoComplete="new-password"
              onChange={(e) => setSecret(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Interval Sync</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={syncInterval}
              onChange={(e) => setSyncInterval(parseInt(e.target.value, 10))}>
              <option value={60}>1 menit</option>
              <option value={300}>5 menit</option>
              <option value={600}>10 menit</option>
              <option value={1200}>20 menit</option>
              <option value={1800}>30 menit</option>
              <option value={3600}>1 jam</option>
              <option value={43200}>12 jam</option>
            </select>
          </div>
          {msg ? (
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: msg.ok ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
              border: '1px solid ' + (msg.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'),
              color: msg.ok ? 'var(--success)' : 'var(--danger)',
            }}>{(msg.ok ? 'OK: ' : 'GAGAL: ') + msg.text}</div>
          ) : null}
        </div>
        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={handleTest} disabled={testing}
            style={{ fontSize: 11, padding: '9px 18px', borderRadius: 999, background: 'var(--hover)',
              color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.35)', cursor: testing ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            {testing ? 'Testing...' : 'Test Koneksi'}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ fontSize: 11, padding: '9px 16px', borderRadius: 999, background: 'transparent',
              color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ fontSize: 11, padding: '9px 24px', borderRadius: 999, background: 'var(--warning)',
              color: 'var(--bg-deep)', border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ipToNum(ip) {
  if (!ip) return -1;
  const parts = String(ip).split('.').map((n) => parseInt(n, 10) || 0);
  return (parts[0] || 0) * 16777216 + (parts[1] || 0) * 65536 + (parts[2] || 0) * 256 + (parts[3] || 0);
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function RuijiePage({ wsRef }) {
  const [status, setStatus] = useState({ connected: false, enabled: false, server: '', last_sync: null });
  const [devices, setDevices] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [rebootTarget, setRebootTarget] = useState(null);
  const [rebooting, setRebooting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterOnline, setFilterOnline] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list' | 'table'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'status' | 'ip' | 'type' | 'model' | 'group' | 'clients'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  const load = useCallback(() => {
    Promise.all([
      axios.get(API + '/api/ruijie/status').catch(() => null),
      axios.get(API + '/api/ruijie/devices').catch(() => null),
    ]).then((results) => {
      const sRes = results[0];
      const dRes = results[1];
      if (sRes && sRes.data) setStatus(sRes.data);
      if (dRes && dRes.data && dRes.data.devices) setDevices(dRes.data.devices);
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const ws = wsRef && wsRef.current;
    if (!ws) return;
    function onMsg(e) {
      try {
        const m = JSON.parse(e.data);
        if (m.type === 'ruijie_sync') {
          setDevices(m.devices || []);
          setStatus((p) => Object.assign({}, p, { connected: m.connected }));
        }
        if (m.type === 'ruijie_status') {
          setStatus((p) => Object.assign({}, p, { connected: m.connected }));
        }
      } catch (err) {}
    }
    ws.addEventListener('message', onMsg);
    return () => ws.removeEventListener('message', onMsg);
  }, [wsRef]);

  function doSync() {
    setSyncing(true);
    axios.post(API + '/api/ruijie/sync')
      .then(() => load())
      .catch(() => {})
      .finally(() => setSyncing(false));
  }

  function doRestart() {
    if (!rebootTarget || rebooting) return;
    const dev = rebootTarget;
    setRebooting(true);
    axios.post(API + '/api/ruijie/reboot', { sn: dev.sn })
      .then((res) => {
        setRebootTarget(null);
        if (res.data && !res.data.success) alert(res.data.error || 'Gagal mengirim perintah restart');
        setTimeout(load, 1500);
      })
      .catch((e) => alert('Gagal restart: ' + (e?.response?.data?.error || e.message)))
      .finally(() => setRebooting(false));
  }

  const restartBtn = (dev) => (
    <button
      disabled={rebooting || !dev.online}
      onClick={() => setRebootTarget(dev)}
      title="Restart perangkat"
      style={{ fontSize: 9, padding: '3px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.12)',
        color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.30)', cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600, opacity: (!dev.online || rebooting) ? 0.4 : 1 }}>
      {rebooting ? '...' : 'Restart'}
    </button>
  );

  const connected = !!status.connected;
  const enabled = !!status.enabled;

  const filtered = devices.filter((d) => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterOnline === 'online' && !d.online) return false;
    if (filterOnline === 'offline' && d.online) return false;
    return true;
  });

  const sorted = filtered.slice().sort((a, b) => {
    let av, bv;
    if (sortBy === 'status') { av = a.online ? 1 : 0; bv = b.online ? 1 : 0; }
    else if (sortBy === 'ip') { av = ipToNum(a.ip); bv = ipToNum(b.ip); }
    else if (sortBy === 'type') { av = (a.type || ''); bv = (b.type || ''); }
    else if (sortBy === 'model') { av = (a.model || '').toLowerCase(); bv = (b.model || '').toLowerCase(); }
    else if (sortBy === 'group') { av = (a.group || '').toLowerCase(); bv = (b.group || '').toLowerCase(); }
    else if (sortBy === 'clients') { av = a.clients || 0; bv = b.clients || 0; }
    else { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cntOnline = devices.filter((d) => d.online).length;
  const cntOffline = devices.filter((d) => !d.online).length;
  const cntClients = devices.reduce((s, d) => s + (d.clients || 0), 0);

  const filterTypeBtns = [
    { v: 'all', label: 'Semua' },
    { v: 'ap', label: 'AP' },
    { v: 'switch', label: 'Switch' },
    { v: 'router', label: 'Router' },
  ];
  const filterOnlineBtns = [
    { v: 'all', label: 'Semua', color: 'var(--text-muted)' },
    { v: 'online', label: 'Online', color: 'var(--success)' },
    { v: 'offline', label: 'Offline', color: 'var(--danger)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', minHeight: 52 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.04em' }}>Ruijie Cloud</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5,
          background: connected ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
          border: '1px solid ' + (connected ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'),
          borderRadius: 999, padding: '3px 10px', flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--danger)' }} />
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: connected ? 'var(--success)' : 'var(--danger)' }}>
            {!enabled ? 'Disabled' : connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {status.server ? <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>{status.server}</span> : null}
        {connected ? <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>Up {cntOnline}</span> : null}
        {connected ? <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>Down {cntOffline}</span> : null}
        {connected ? <span style={{ fontSize: 10, color: 'var(--info)', fontWeight: 700 }}>Client {cntClients}</span> : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {enabled ? (
            <button onClick={doSync} disabled={syncing}
              style={{ fontSize: 10, padding: '6px 14px', borderRadius: 999, background: 'transparent',
                border: '1px solid rgba(251,191,36,0.35)', color: syncing ? 'var(--text-faint)' : 'var(--warning)', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          ) : null}
          <button onClick={() => setShowSettings(true)} className="btn-primary" style={{ fontSize: 12, padding: '8px 22px' }}>
            Setting
          </button>
        </div>
      </div>

      {!enabled ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 700 }}>Ruijie Cloud belum dikonfigurasi</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', maxWidth: 320 }}>Klik tombol Setting di pojok kanan atas untuk mengatur AppID dan Key</div>
          <button onClick={() => setShowSettings(true)} className="btn-primary" style={{ marginTop: 8, fontSize: 13, padding: '11px 32px' }}>
            Konfigurasi Sekarang
          </button>
        </div>
      ) : null}

      {(enabled && !connected) ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ fontSize: 15, color: 'var(--danger)', fontWeight: 700 }}>Tidak terhubung ke Ruijie Cloud</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Periksa AppID dan Key, atau cek koneksi internet</div>
          <button onClick={doSync} disabled={syncing}
            style={{ marginTop: 8, fontSize: 12, padding: '9px 26px', borderRadius: 999, background: 'var(--warning)',
              color: 'var(--bg-deep)', border: 'none', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>
            {syncing ? 'Menghubungkan...' : 'Coba Hubungkan'}
          </button>
        </div>
      ) : null}

      {(enabled && connected) ? (
        <React.Fragment>
          <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            {filterTypeBtns.map((v) => (
              <button key={v.v} onClick={() => setFilterType(v.v)}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: filterType === v.v ? 700 : 400,
                  background: filterType === v.v ? 'rgba(251,191,36,0.12)' : 'transparent',
                  color: filterType === v.v ? 'var(--warning)' : 'var(--text-muted)',
                  border: '1px solid ' + (filterType === v.v ? 'rgba(251,191,36,0.35)' : 'var(--border)') }}>
                {v.label}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
            {filterOnlineBtns.map((v) => (
              <button key={v.v} onClick={() => setFilterOnline(v.v)}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: filterOnline === v.v ? 700 : 400,
                  background: filterOnline === v.v ? v.color + '22' : 'transparent',
                  color: filterOnline === v.v ? v.color : 'var(--text-muted)',
                  border: '1px solid ' + (filterOnline === v.v ? v.color + '55' : 'var(--border)') }}>
                {v.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>{filtered.length} device</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>Urutkan:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                style={{ fontSize: 10, padding: '4px 8px', borderRadius: 999, background: 'var(--input-bg)',
                  border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                <option value="name">Nama</option>
                <option value="status">Status</option>
                <option value="ip">IP</option>
                <option value="type">Tipe</option>
                <option value="model">Model</option>
                <option value="group">Group</option>
                <option value="clients">Klien</option>
              </select>
              <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                title={sortDir === 'asc' ? 'A-Z / Kecil ke Besar' : 'Z-A / Besar ke Kecil'}
                style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, background: 'var(--input-bg)',
                  border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 2, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 999, padding: 2 }}>
              {[['card', 'Card'], ['list', 'List'], ['table', 'Table']].map((v) => (
                <button key={v[0]} onClick={() => setViewMode(v[0])}
                  style={{ fontSize: 9, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: viewMode === v[0] ? 700 : 400,
                    background: viewMode === v[0] ? 'var(--warning)' : 'transparent',
                    color: viewMode === v[0] ? 'var(--bg-deep)' : 'var(--text-muted)',
                    border: 'none' }}>
                  {v[1]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-faint)', fontSize: 12.5 }}>Tidak ada device sesuai filter</div>
            ) : null}

            {/* ── CARD VIEW ────────────────────────────────────────────────── */}
            {(filtered.length > 0 && viewMode === 'card') ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))', gap: 12 }}>
                {sorted.map((dev) => {
                  const meta = TYPE_META[dev.type] || TYPE_META.switch;
                  const sc = dev.online ? 'var(--success)' : 'var(--danger)';
                  return (
                    <div key={dev.mac}
                      style={{ background: 'var(--card)', border: '1px solid ' + (dev.online ? 'var(--border)' : 'rgba(239,68,68,0.35)'), borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: meta.color + '18',
                          border: '2px solid ' + sc + '44', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{meta.label} - {dev.model || '-'}{dev.group ? ' - ' + dev.group : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: sc }}>{dev.onlineStatus || (dev.online ? 'Online' : 'Offline')}</div>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {[['IP', dev.ip || '-', 'var(--info)'], ['SN', dev.sn || dev.mac, 'var(--text-faint)'], ['Model', dev.model || '-', 'var(--text-muted)'], ['Firmware', dev.version || '-', 'var(--text-faint)'], ['Group', dev.group || '-', 'var(--text-muted)']].map((row) => (
                          <div key={row[0]} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>{row[0]}</span>
                            <span style={{ fontSize: 10, color: row[2], fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 185, textAlign: 'right' }}>{row[1]}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '7px 12px', borderTop: '1px solid var(--border)', background: 'var(--card-2)', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>{dev.online ? (dev.clients || 0) + ' klien' : 'Perangkat offline'}</span>
                        {restartBtn(dev)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* ── LIST VIEW ────────────────────────────────────────────────── */}
            {(filtered.length > 0 && viewMode === 'list') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sorted.map((dev) => {
                  const meta = TYPE_META[dev.type] || TYPE_META.switch;
                  const sc = dev.online ? 'var(--success)' : 'var(--danger)';
                  return (
                    <div key={dev.mac}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)',
                        border: '1px solid ' + (dev.online ? 'var(--border)' : 'rgba(239,68,68,0.35)'), borderRadius: 12, padding: '9px 14px', boxShadow: 'var(--shadow)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: meta.color + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: meta.color }}>{meta.icon}</div>
                      <div style={{ width: 190, minWidth: 0, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev.name}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{meta.label}</div>
                      </div>
                      <div style={{ width: 120, fontSize: 10, color: 'var(--info)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{dev.ip || '-'}</div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev.model || '-'}{dev.group ? ' - ' + dev.group : ''}</div>
                      <div style={{ width: 140, fontSize: 9, color: 'var(--text-faint)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{dev.version || '-'}</div>
                      <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: sc }}>{dev.onlineStatus || (dev.online ? 'Online' : 'Offline')}</span>
                      </div>
                      <div style={{ width: 70, textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{dev.online ? (dev.clients || 0) + ' klien' : '-'}</div>
                      <div style={{ flexShrink: 0 }}>{restartBtn(dev)}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* ── TABLE VIEW ───────────────────────────────────────────────── */}
            {(filtered.length > 0 && viewMode === 'table') ? (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
                      {['Status', 'Nama', 'Tipe', 'IP', 'SN/MAC', 'Model', 'Firmware', 'Group', 'Klien', ''].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 12px', color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((dev, i) => {
                      const meta = TYPE_META[dev.type] || TYPE_META.switch;
                      const sc = dev.online ? 'var(--success)' : 'var(--danger)';
                      return (
                        <tr key={dev.mac} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--card-2)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc, display: 'inline-block' }} />
                              <span style={{ fontSize: 9, fontWeight: 800, color: sc }}>{dev.onlineStatus || (dev.online ? 'Online' : 'Offline')}</span>
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{dev.name}</td>
                          <td style={{ padding: '8px 12px', color: meta.color, whiteSpace: 'nowrap' }}>{meta.label}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--info)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{dev.ip || '-'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-faint)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{dev.sn || dev.mac}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dev.model || '-'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-faint)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{dev.version || '-'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dev.group || '-'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>{dev.online ? (dev.clients || 0) : '-'}</td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{restartBtn(dev)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </React.Fragment>
      ) : null}

      {showSettings ? <SettingsModal onClose={() => setShowSettings(false)} onSaved={load} /> : null}
      {rebootTarget ? (
        <ConfirmModal
          title="Restart Perangkat?"
          message={`Perangkat "${rebootTarget.name}" akan di-restart. Klien yang terhubung akan terputus sementara (±1-2 menit). Lanjutkan?`}
          confirmText="Restart"
          onConfirm={doRestart}
          onCancel={() => !rebooting && setRebootTarget(null)}
        />
      ) : null}
    </div>
  );
}


