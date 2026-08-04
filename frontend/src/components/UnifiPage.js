import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

const TYPE_META = {
  ap:       { label: 'Access Point', icon: 'AP', color: '#F59E0B' },
  switch:   { label: 'Switch',       icon: 'SW', color: '#A855F7' },
  router:   { label: 'Router/GW',    icon: 'RT', color: '#22C55E' },
  firewall: { label: 'Firewall',     icon: 'FW', color: '#EF4444' },
};

function fmtBytes(b) {
  if (!b) return '0B';
  if (b < 1048576) return Math.round(b / 1024) + 'KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + 'MB';
  return (b / 1073741824).toFixed(2) + 'GB';
}
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
  background: '#060E1C', border: '1px solid #1E3A5F', color: '#E2E8F0',
  padding: '9px 12px', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12, width: '100%', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 10, color: '#64748B', letterSpacing: '0.1em',
  display: 'block', marginBottom: 6, textTransform: 'uppercase',
};

// ── Settings Modal ─────────────────────────────────────────────────────────
function SettingsModal(props) {
  const onClose = props.onClose;
  const onSaved = props.onSaved;

  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // kosong, tidak auto-fill
  const [site, setSite] = useState('default');
  const [enabled, setEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [msg, setMsg] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(API + '/api/unifi/settings')
      .then(function (r) {
        var d = r.data || {};
        if (d.url) setUrl(d.url);
        if (d.username) setUsername(d.username);
        if (d.site) setSite(d.site);
        setEnabled(!!d.enabled);
        if (d.sync_interval) setSyncInterval(d.sync_interval);
        // password sengaja TIDAK di-set otomatis
      })
      .catch(function () {});
  }, []);

  function handleTest() {
    if (!url || !username) {
      setMsg({ ok: false, text: 'URL dan Username wajib diisi' });
      return;
    }
    setTesting(true);
    setMsg(null);
    axios.post(API + '/api/unifi/test', { url: url, username: username, password: password, site: site })
      .then(function (r) {
        setMsg({ ok: r.data.ok, text: r.data.ok ? r.data.message : r.data.error });
      })
      .catch(function (e) {
        setMsg({ ok: false, text: 'Error: ' + e.message });
      })
      .finally(function () { setTesting(false); });
  }

  function handleSave() {
    setSaving(true);
    axios.put(API + '/api/unifi/settings', {
      url: url, username: username, password: password,
      site: site, enabled: enabled, sync_interval: syncInterval,
    })
      .then(function () {
        if (onSaved) onSaved();
        onClose();
      })
      .catch(function (e) {
        setMsg({ ok: false, text: 'Gagal simpan: ' + e.message });
      })
      .finally(function () { setSaving(false); });
  }

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }
  },
    React.createElement('div', {
      style: {
        background: '#0D1B2E', border: '1px solid #22C55E55',
        borderRadius: 14, width: '100%', maxWidth: 460,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }
    },
      // Header
      React.createElement('div', {
        style: { padding: '16px 20px', borderBottom: '1px solid #1E3A5F',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }
      },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 15, fontWeight: 800, color: '#E2E8F0' } }, 'KONFIGURASI UNIFI'),
          React.createElement('div', { style: { fontSize: 11, color: '#64748B', marginTop: 3 } }, 'UniFi Network Application')
        ),
        React.createElement('button', {
          onClick: onClose,
          style: { width: 30, height: 30, borderRadius: 8, background: '#1E3A5F', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 16 }
        }, 'X')
      ),
      // Body
      React.createElement('div', {
        style: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }
      },
        // Toggle
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#060E1C', borderRadius: 10, padding: '12px 16px', border: '1px solid #1E3A5F' }
        },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: '#E2E8F0' } }, 'Aktifkan Integrasi'),
            React.createElement('div', { style: { fontSize: 10, color: '#64748B', marginTop: 2 } }, 'Sinkronisasi otomatis')
          ),
          React.createElement('div', {
            onClick: function () { setEnabled(!enabled); },
            style: { width: 46, height: 26, borderRadius: 13, cursor: 'pointer',
              background: enabled ? '#22C55E' : '#334155', position: 'relative', flexShrink: 0 }
          },
            React.createElement('div', {
              style: { position: 'absolute', top: 3, width: 20, height: 20,
                left: enabled ? 23 : 3, borderRadius: '50%', background: '#fff' }
            })
          )
        ),
        // URL
        React.createElement('div', null,
          React.createElement('label', { style: labelStyle }, 'URL Controller *'),
          React.createElement('input', {
            style: inputStyle, value: url, placeholder: 'https://10.5.50.2:8443',
            onChange: function (e) { setUrl(e.target.value); }
          })
        ),
        // Username + Password
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
          React.createElement('div', null,
            React.createElement('label', { style: labelStyle }, 'Username *'),
            React.createElement('input', {
              style: inputStyle, value: username, placeholder: 'admin',
              autoComplete: 'off',
              onChange: function (e) { setUsername(e.target.value); }
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: labelStyle }, 'Password *'),
            React.createElement('input', {
              style: inputStyle, type: 'password', value: password,
              placeholder: 'Masukkan password', autoComplete: 'new-password',
              onChange: function (e) { setPassword(e.target.value); }
            })
          )
        ),
        // Site + Interval
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
          React.createElement('div', null,
            React.createElement('label', { style: labelStyle }, 'Site Name'),
            React.createElement('input', {
              style: inputStyle, value: site, placeholder: 'default',
              onChange: function (e) { setSite(e.target.value); }
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: labelStyle }, 'Interval Sync'),
            React.createElement('select', {
              style: Object.assign({}, inputStyle, { cursor: 'pointer' }),
              value: syncInterval,
              onChange: function (e) { setSyncInterval(parseInt(e.target.value, 10)); }
            },
              React.createElement('option', { value: 10 }, '10 detik'),
              React.createElement('option', { value: 30 }, '30 detik'),
              React.createElement('option', { value: 60 }, '1 menit'),
              React.createElement('option', { value: 300 }, '5 menit')
            )
          )
        ),
        // Result message
        msg ? React.createElement('div', {
          style: {
            padding: '10px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: msg.ok ? '#22C55E18' : '#EF444418',
            border: '1px solid ' + (msg.ok ? '#22C55E55' : '#EF444455'),
            color: msg.ok ? '#22C55E' : '#EF4444',
          }
        }, (msg.ok ? 'OK: ' : 'GAGAL: ') + msg.text) : null
      ),
      // Footer
      React.createElement('div', {
        style: { padding: '14px 20px', borderTop: '1px solid #1E3A5F', display: 'flex', gap: 8, flexShrink: 0 }
      },
        React.createElement('button', {
          onClick: handleTest, disabled: testing,
          style: { fontSize: 11, padding: '9px 18px', borderRadius: 6, background: '#1E3A5F',
            color: '#38BDF8', border: '1px solid #38BDF844', cursor: testing ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }
        }, testing ? 'Testing...' : 'Test Koneksi'),
        React.createElement('div', { style: { flex: 1 } }),
        React.createElement('button', {
          onClick: onClose,
          style: { fontSize: 11, padding: '9px 16px', borderRadius: 6, background: 'transparent',
            color: '#64748B', border: '1px solid #1E3A5F', cursor: 'pointer', fontFamily: 'inherit' }
        }, 'BATAL'),
        React.createElement('button', {
          onClick: handleSave, disabled: saving,
          style: { fontSize: 11, padding: '9px 24px', borderRadius: 6, background: '#22C55E',
            color: '#071A0E', border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 800 }
        }, saving ? 'Menyimpan...' : 'SIMPAN')
      )
    )
  );
}

// ── Client Modal ──────────────────────────────────────────────────────────
function ClientModal(props) {
  var device = props.device;
  var onClose = props.onClose;
  var [clients, setClients] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    axios.get(API + '/api/unifi/clients?ap_mac=' + device.mac)
      .then(function (r) { setClients(r.data.clients || []); })
      .catch(function () {})
      .finally(function () { setLoading(false); });
  }, [device.mac]);

  return React.createElement('div', {
    onClick: onClose,
    style: { position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
  },
    React.createElement('div', {
      onClick: function (e) { e.stopPropagation(); },
      style: { background: '#0D1B2E', border: '1px solid #1E3A5F', borderRadius: 12,
        width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }
    },
      React.createElement('div', {
        style: { padding: '12px 16px', borderBottom: '1px solid #1E3A5F',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }
      },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: '#E2E8F0' } }, device.name),
          React.createElement('div', { style: { fontSize: 10, color: '#64748B' } }, clients.length + ' klien terhubung')
        ),
        React.createElement('button', { onClick: onClose, style: { color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, 'X')
      ),
      React.createElement('div', { style: { flex: 1, overflowY: 'auto' } },
        loading
          ? React.createElement('div', { style: { padding: 24, textAlign: 'center', color: '#475569' } }, 'Memuat...')
          : clients.length === 0
          ? React.createElement('div', { style: { padding: 24, textAlign: 'center', color: '#475569' } }, 'Tidak ada klien')
          : clients.map(function (c, i) {
              return React.createElement('div', {
                key: c.mac || i,
                style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #0A1628' }
              },
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: '#E2E8F0' } }, c.hostname || 'Unknown'),
                  React.createElement('div', { style: { fontSize: 9, color: '#64748B', fontFamily: 'JetBrains Mono, monospace' } }, c.ip + ' - ' + c.mac)
                ),
                React.createElement('div', { style: { textAlign: 'right', flexShrink: 0 } },
                  React.createElement('div', { style: { fontSize: 10, color: '#22C55E' } }, c.essid || '-'),
                  React.createElement('div', { style: { fontSize: 9, color: '#64748B' } }, c.signal + 'dBm')
                )
              );
            })
      )
    )
  );
}

// ── Resource bar ──────────────────────────────────────────────────────────
function Bar(props) {
  var p = Math.min(100, Math.round(props.pct || 0));
  var c = p > 80 ? '#EF4444' : p > 60 ? '#F59E0B' : props.color;
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
    React.createElement('span', { style: { fontSize: 8, color: '#475569', width: 24, flexShrink: 0 } }, props.label),
    React.createElement('div', { style: { flex: 1, height: 3, background: '#1E3A5F', borderRadius: 2, overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: p + '%', background: c, borderRadius: 2 } })
    ),
    React.createElement('span', { style: { fontSize: 9, color: c, width: 30, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' } }, p + '%')
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function UnifiPage(props) {
  var wsRef = props.wsRef;

  var [status, setStatus] = useState({ connected: false, enabled: false, url: '', last_sync: null });
  var [devices, setDevices] = useState([]);
  var [showSettings, setShowSettings] = useState(false); // TIDAK auto-open
  var [clientModal, setClientModal] = useState(null);
  var [syncing, setSyncing] = useState(false);
  var [filterType, setFilterType] = useState('all');
  var [filterOnline, setFilterOnline] = useState('all');
  var [loadError, setLoadError] = useState(null);
  var [viewMode, setViewMode] = useState('card'); // 'card' | 'list' | 'table'
  var [sortBy, setSortBy] = useState('name'); // 'name' | 'status' | 'ip' | 'type' | 'uptime' | 'clients' | 'cpu' | 'mem'
  var [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  var load = useCallback(function () {
    Promise.all([
      axios.get(API + '/api/unifi/status').catch(function () { return null; }),
      axios.get(API + '/api/unifi/devices').catch(function () { return null; }),
    ]).then(function (results) {
      var sRes = results[0];
      var dRes = results[1];
      if (sRes && sRes.data) setStatus(sRes.data);
      if (dRes && dRes.data && dRes.data.devices) setDevices(dRes.data.devices);
      setLoadError(null);
    }).catch(function (e) {
      setLoadError(e.message);
    });
  }, []);

  useEffect(function () { load(); }, [load]);
  useEffect(function () {
    var t = setInterval(load, 15000);
    return function () { clearInterval(t); };
  }, [load]);

  // WebSocket — TANPA auto-open settings
  useEffect(function () {
    var ws = wsRef && wsRef.current;
    if (!ws) return;
    function onMsg(e) {
      try {
        var m = JSON.parse(e.data);
        if (m.type === 'unifi_sync') {
          setDevices(m.devices || []);
          setStatus(function (p) { return Object.assign({}, p, { connected: m.connected }); });
        }
        if (m.type === 'unifi_status') {
          setStatus(function (p) { return Object.assign({}, p, { connected: m.connected }); });
        }
      } catch (err) {}
    }
    ws.addEventListener('message', onMsg);
    return function () { ws.removeEventListener('message', onMsg); };
  }, [wsRef]);

  function doSync() {
    setSyncing(true);
    axios.post(API + '/api/unifi/sync')
      .then(function () { load(); })
      .catch(function () {})
      .finally(function () { setSyncing(false); });
  }

  var connected = !!status.connected;
  var enabled = !!status.enabled;

  var filtered = devices.filter(function (d) {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterOnline === 'online' && !d.online) return false;
    if (filterOnline === 'offline' && d.online) return false;
    return true;
  });

  function ipToNum(ip) {
    if (!ip) return -1;
    var parts = String(ip).split('.').map(function (n) { return parseInt(n, 10) || 0; });
    return (parts[0] || 0) * 16777216 + (parts[1] || 0) * 65536 + (parts[2] || 0) * 256 + (parts[3] || 0);
  }

  var sorted = filtered.slice().sort(function (a, b) {
    var av, bv;
    if (sortBy === 'status') { av = a.online ? 1 : 0; bv = b.online ? 1 : 0; }
    else if (sortBy === 'ip') { av = ipToNum(a.ip); bv = ipToNum(b.ip); }
    else if (sortBy === 'type') { av = (a.type || ''); bv = (b.type || ''); }
    else if (sortBy === 'uptime') { av = a.uptime || 0; bv = b.uptime || 0; }
    else if (sortBy === 'clients') { av = a.clients || 0; bv = b.clients || 0; }
    else if (sortBy === 'cpu') { av = a.cpu_util || 0; bv = b.cpu_util || 0; }
    else if (sortBy === 'mem') { av = a.mem_util || 0; bv = b.mem_util || 0; }
    else { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
    var cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  var cntOnline = devices.filter(function (d) { return d.online; }).length;
  var cntOffline = devices.filter(function (d) { return !d.online; }).length;
  var cntClients = devices.reduce(function (s, d) { return s + (d.clients || 0); }, 0);

  // Render with try/catch fallback at top level
  try {
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: '#080F1E', overflow: 'hidden' }
    },
      // Toolbar
      React.createElement('div', {
        style: { background: '#0D1B2E', borderBottom: '1px solid #1E3A5F', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', minHeight: 52 }
      },
        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' } }, 'UNIFI CONTROLLER'),
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: 5,
            background: connected ? '#22C55E18' : '#EF444418',
            border: '1px solid ' + (connected ? '#22C55E55' : '#EF444455'),
            borderRadius: 20, padding: '3px 10px', flexShrink: 0 }
        },
          React.createElement('div', {
            style: { width: 7, height: 7, borderRadius: '50%', background: connected ? '#22C55E' : '#EF4444' }
          }),
          React.createElement('span', {
            style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: connected ? '#22C55E' : '#EF4444' }
          }, !enabled ? 'DISABLED' : connected ? 'CONNECTED' : 'DISCONNECTED')
        ),
        status.url ? React.createElement('span', { style: { fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' } }, status.url) : null,
        connected ? React.createElement('span', { style: { fontSize: 10, color: '#22C55E', fontWeight: 700 } }, 'UP ' + cntOnline) : null,
        connected ? React.createElement('span', { style: { fontSize: 10, color: '#EF4444', fontWeight: 700 } }, 'DOWN ' + cntOffline) : null,
        connected ? React.createElement('span', { style: { fontSize: 10, color: '#38BDF8', fontWeight: 700 } }, 'CLIENTS ' + cntClients) : null,
        React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' } },
          enabled ? React.createElement('button', {
            onClick: doSync, disabled: syncing,
            style: { fontSize: 10, padding: '6px 12px', borderRadius: 6, background: 'transparent',
              border: '1px solid #38BDF855', color: syncing ? '#475569' : '#38BDF8', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit' }
          }, syncing ? 'Syncing...' : 'Sync') : null,
          React.createElement('button', {
            onClick: function () { setShowSettings(true); },
            style: { fontSize: 12, padding: '8px 22px', borderRadius: 7, background: '#22C55E',
              color: '#071A0E', border: '2px solid #16A34A', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 800, letterSpacing: '0.05em' }
          }, 'SETTING')
        )
      ),

      // Content
      !enabled ? React.createElement('div', {
        style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }
      },
        React.createElement('div', { style: { fontSize: 16, color: '#475569', fontWeight: 700 } }, 'UniFi belum dikonfigurasi'),
        React.createElement('div', { style: { fontSize: 12, color: '#334155', textAlign: 'center', maxWidth: 320 } }, 'Klik tombol SETTING di pojok kanan atas untuk mengatur koneksi'),
        React.createElement('button', {
          onClick: function () { setShowSettings(true); },
          style: { marginTop: 8, fontSize: 13, padding: '11px 32px', borderRadius: 8, background: '#22C55E',
            color: '#071A0E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }
        }, 'Konfigurasi Sekarang')
      ) : null,

      (enabled && !connected) ? React.createElement('div', {
        style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }
      },
        React.createElement('div', { style: { fontSize: 15, color: '#EF4444', fontWeight: 700 } }, 'Tidak terhubung ke controller'),
        React.createElement('div', { style: { fontSize: 12, color: '#475569' } }, 'Pastikan UniFi Network Application aktif di ' + (status.url || '-')),
        React.createElement('button', {
          onClick: doSync, disabled: syncing,
          style: { marginTop: 8, fontSize: 12, padding: '9px 26px', borderRadius: 7, background: '#38BDF8',
            color: '#071A0E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }
        }, syncing ? 'Menghubungkan...' : 'Coba Hubungkan')
      ) : null,

      (enabled && connected) ? React.createElement(React.Fragment, null,
        // Filter bar
        React.createElement('div', { style: { padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 } },
          ['all', 'ap', 'switch', 'router'].map(function (v) {
            var labels = { all: 'Semua', ap: 'AP', switch: 'Switch', router: 'Router' };
            return React.createElement('button', {
              key: v, onClick: function () { setFilterType(v); },
              style: { fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: filterType === v ? 700 : 400,
                background: filterType === v ? '#38BDF822' : 'transparent',
                color: filterType === v ? '#38BDF8' : '#64748B',
                border: '1px solid ' + (filterType === v ? '#38BDF855' : '#1E3A5F') }
            }, labels[v]);
          }),
          React.createElement('div', { style: { width: 1, height: 16, background: '#1E3A5F', margin: '0 2px' } }),
          ['all', 'online', 'offline'].map(function (v) {
            var labels = { all: 'Semua', online: 'Online', offline: 'Offline' };
            var colors = { all: '#64748B', online: '#22C55E', offline: '#EF4444' };
            return React.createElement('button', {
              key: v, onClick: function () { setFilterOnline(v); },
              style: { fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: filterOnline === v ? 700 : 400,
                background: filterOnline === v ? colors[v] + '22' : 'transparent',
                color: filterOnline === v ? colors[v] : '#64748B',
                border: '1px solid ' + (filterOnline === v ? colors[v] + '55' : '#1E3A5F') }
            }, labels[v]);
          }),
          React.createElement('span', { style: { marginLeft: 'auto', fontSize: 10, color: '#475569' } }, filtered.length + ' device'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
            React.createElement('span', { style: { fontSize: 9, color: '#475569' } }, 'Urutkan:'),
            React.createElement('select', {
              value: sortBy,
              onChange: function (e) { setSortBy(e.target.value); },
              style: { fontSize: 10, padding: '4px 8px', borderRadius: 5, background: '#060E1C',
                border: '1px solid #1E3A5F', color: '#94A3B8', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }
            },
              React.createElement('option', { value: 'name' }, 'Nama'),
              React.createElement('option', { value: 'status' }, 'Status'),
              React.createElement('option', { value: 'ip' }, 'IP'),
              React.createElement('option', { value: 'type' }, 'Tipe'),
              React.createElement('option', { value: 'uptime' }, 'Uptime'),
              React.createElement('option', { value: 'clients' }, 'Klien'),
              React.createElement('option', { value: 'cpu' }, 'CPU'),
              React.createElement('option', { value: 'mem' }, 'MEM')
            ),
            React.createElement('button', {
              onClick: function () { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); },
              title: sortDir === 'asc' ? 'A-Z / Kecil ke Besar' : 'Z-A / Besar ke Kecil',
              style: { fontSize: 11, padding: '4px 9px', borderRadius: 5, background: '#060E1C',
                border: '1px solid #1E3A5F', color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }
            }, sortDir === 'asc' ? '↑' : '↓')
          ),
          React.createElement('div', { style: { display: 'flex', gap: 2, background: '#060E1C', border: '1px solid #1E3A5F', borderRadius: 6, padding: 2 } },
            [['card', 'Card'], ['list', 'List'], ['table', 'Table']].map(function (v) {
              return React.createElement('button', {
                key: v[0], onClick: function () { setViewMode(v[0]); },
                style: { fontSize: 9, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: viewMode === v[0] ? 700 : 400,
                  background: viewMode === v[0] ? '#22C55E' : 'transparent',
                  color: viewMode === v[0] ? '#071A0E' : '#64748B',
                  border: 'none' }
              }, v[1]);
            })
          )
        ),
        // Device grid
        React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '0 16px 20px' } },
          filtered.length === 0 ? React.createElement('div', {
            style: { textAlign: 'center', paddingTop: 60, color: '#334155', fontSize: 12 }
          }, 'Tidak ada device sesuai filter') : null,

          // ── CARD VIEW ──────────────────────────────────────────────────
          (filtered.length > 0 && viewMode === 'card') ? React.createElement('div', {
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))', gap: 12 }
          },
            sorted.map(function (dev) {
              var meta = TYPE_META[dev.type] || TYPE_META.switch;
              var sc = dev.online ? '#22C55E' : '#EF4444';
              return React.createElement('div', {
                key: dev.mac,
                style: { background: '#0A1628', border: '1px solid ' + (dev.online ? '#1E3A5F' : '#3A1E1E'), borderRadius: 10, overflow: 'hidden' }
              },
                // Header
                React.createElement('div', {
                  style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #1E3A5F' }
                },
                  React.createElement('div', {
                    style: { width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: meta.color + '18',
                      border: '2px solid ' + sc + '44', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: meta.color }
                  }, meta.icon),
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, dev.name),
                    React.createElement('div', { style: { fontSize: 9, color: '#64748B' } }, meta.label + ' - ' + (dev.model || '-'))
                  ),
                  React.createElement('div', { style: { textAlign: 'right', flexShrink: 0 } },
                    React.createElement('div', { style: { fontSize: 9, fontWeight: 800, color: sc } }, dev.online ? 'ONLINE' : 'OFFLINE'),
                    React.createElement('div', { style: { fontSize: 9, color: '#475569', marginTop: 2 } }, fmtUptime(dev.uptime))
                  )
                ),
                // Stats
                React.createElement('div', { style: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 } },
                  [['IP', dev.ip || '-', '#38BDF8'], ['MAC', dev.mac, '#475569'], ['FW', dev.version || '-', '#475569']].map(function (row) {
                    return React.createElement('div', { key: row[0], style: { display: 'flex', justifyContent: 'space-between' } },
                      React.createElement('span', { style: { fontSize: 9, color: '#475569' } }, row[0]),
                      React.createElement('span', { style: { fontSize: 10, color: row[2], fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 185, textAlign: 'right' } }, row[1])
                    );
                  }),
                  (dev.online && dev.cpu_util > 0) ? React.createElement(Bar, { label: 'CPU', pct: dev.cpu_util, color: '#38BDF8' }) : null,
                  (dev.online && dev.mem_util > 0) ? React.createElement(Bar, { label: 'MEM', pct: dev.mem_util, color: '#A855F7' }) : null,
                  (dev.online && (dev.tx_bytes > 0 || dev.rx_bytes > 0)) ? React.createElement('div', { style: { display: 'flex', gap: 16, marginTop: 3 } },
                    React.createElement('div', null,
                      React.createElement('div', { style: { fontSize: 8, color: '#334155' } }, 'TX'),
                      React.createElement('div', { style: { fontSize: 10, color: '#22C55E' } }, fmtBytes(dev.tx_bytes))
                    ),
                    React.createElement('div', null,
                      React.createElement('div', { style: { fontSize: 8, color: '#334155' } }, 'RX'),
                      React.createElement('div', { style: { fontSize: 10, color: '#38BDF8' } }, fmtBytes(dev.rx_bytes))
                    )
                  ) : null
                ),
                // Footer
                React.createElement('div', { style: { padding: '7px 12px', borderTop: '1px solid #1E3A5F', display: 'flex', alignItems: 'center' } },
                  React.createElement('span', { style: { fontSize: 10, color: '#64748B', flex: 1 } }, dev.online ? (dev.clients || 0) + ' klien' : 'Offline'),
                  (dev.type === 'ap' && dev.online && dev.clients > 0) ? React.createElement('button', {
                    onClick: function () { setClientModal(dev); },
                    style: { fontSize: 10, padding: '3px 10px', borderRadius: 4, background: '#38BDF822',
                      color: '#38BDF8', border: '1px solid #38BDF833', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
                  }, 'Klien') : null
                )
              );
            })
          ) : null,

          // ── LIST VIEW ──────────────────────────────────────────────────
          (filtered.length > 0 && viewMode === 'list') ? React.createElement('div', {
            style: { display: 'flex', flexDirection: 'column', gap: 6 }
          },
            sorted.map(function (dev) {
              var meta = TYPE_META[dev.type] || TYPE_META.switch;
              var sc = dev.online ? '#22C55E' : '#EF4444';
              return React.createElement('div', {
                key: dev.mac,
                style: { display: 'flex', alignItems: 'center', gap: 12, background: '#0A1628',
                  border: '1px solid ' + (dev.online ? '#1E3A5F' : '#3A1E1E'), borderRadius: 8, padding: '9px 14px' }
              },
                React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 } }),
                React.createElement('div', {
                  style: { width: 30, height: 30, borderRadius: 6, flexShrink: 0, background: meta.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: meta.color }
                }, meta.icon),
                React.createElement('div', { style: { width: 190, minWidth: 0, flexShrink: 0 } },
                  React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, dev.name),
                  React.createElement('div', { style: { fontSize: 9, color: '#64748B' } }, meta.label)
                ),
                React.createElement('div', { style: { width: 120, fontSize: 10, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 } }, dev.ip || '-'),
                React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 10, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, dev.model || '-'),
                React.createElement('div', { style: { width: 90, fontSize: 9, color: '#475569', flexShrink: 0 } }, fmtUptime(dev.uptime)),
                React.createElement('div', { style: { width: 90, textAlign: 'right', flexShrink: 0 } },
                  React.createElement('span', { style: { fontSize: 9, fontWeight: 800, color: sc } }, dev.online ? 'ONLINE' : 'OFFLINE')
                ),
                React.createElement('div', { style: { width: 70, textAlign: 'right', fontSize: 10, color: '#64748B', flexShrink: 0 } }, dev.online ? (dev.clients || 0) + ' klien' : '-'),
                (dev.type === 'ap' && dev.online && dev.clients > 0) ? React.createElement('button', {
                  onClick: function () { setClientModal(dev); },
                  style: { fontSize: 9, padding: '3px 10px', borderRadius: 4, background: '#38BDF822', flexShrink: 0,
                    color: '#38BDF8', border: '1px solid #38BDF833', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
                }, 'Klien') : null
              );
            })
          ) : null,

          // ── TABLE VIEW ─────────────────────────────────────────────────
          (filtered.length > 0 && viewMode === 'table') ? React.createElement('div', {
            style: { overflowX: 'auto', border: '1px solid #1E3A5F', borderRadius: 8 }
          },
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
              React.createElement('thead', null,
                React.createElement('tr', { style: { background: '#0D1B2E', borderBottom: '1px solid #1E3A5F' } },
                  ['Status', 'Nama', 'Tipe', 'IP', 'MAC', 'Firmware', 'Uptime', 'CPU', 'MEM', 'TX', 'RX', 'Klien', ''].map(function (h) {
                    return React.createElement('th', {
                      key: h, style: { textAlign: 'left', padding: '8px 12px', color: '#64748B', fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
                    }, h);
                  })
                )
              ),
              React.createElement('tbody', null,
                sorted.map(function (dev, i) {
                  var meta = TYPE_META[dev.type] || TYPE_META.switch;
                  var sc = dev.online ? '#22C55E' : '#EF4444';
                  return React.createElement('tr', {
                    key: dev.mac, style: { borderBottom: '1px solid #0F2038', background: i % 2 === 0 ? 'transparent' : '#0A1628' }
                  },
                    React.createElement('td', { style: { padding: '8px 12px' } },
                      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
                        React.createElement('span', { style: { width: 7, height: 7, borderRadius: '50%', background: sc, display: 'inline-block' } }),
                        React.createElement('span', { style: { fontSize: 9, fontWeight: 800, color: sc } }, dev.online ? 'ONLINE' : 'OFFLINE')
                      )
                    ),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#E2E8F0', fontWeight: 600, whiteSpace: 'nowrap' } }, dev.name),
                    React.createElement('td', { style: { padding: '8px 12px', color: meta.color, whiteSpace: 'nowrap' } }, meta.label),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' } }, dev.ip || '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#475569', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' } }, dev.mac),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#475569', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' } }, dev.version || '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#64748B', whiteSpace: 'nowrap' } }, fmtUptime(dev.uptime)),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#38BDF8', whiteSpace: 'nowrap' } }, dev.online ? Math.round(dev.cpu_util || 0) + '%' : '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#A855F7', whiteSpace: 'nowrap' } }, dev.online ? Math.round(dev.mem_util || 0) + '%' : '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#22C55E', whiteSpace: 'nowrap' } }, dev.online ? fmtBytes(dev.tx_bytes) : '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#38BDF8', whiteSpace: 'nowrap' } }, dev.online ? fmtBytes(dev.rx_bytes) : '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#64748B', textAlign: 'right', whiteSpace: 'nowrap' } }, dev.online ? (dev.clients || 0) : '-'),
                    React.createElement('td', { style: { padding: '8px 12px', whiteSpace: 'nowrap' } },
                      (dev.type === 'ap' && dev.online && dev.clients > 0) ? React.createElement('button', {
                        onClick: function () { setClientModal(dev); },
                        style: { fontSize: 9, padding: '3px 10px', borderRadius: 4, background: '#38BDF822',
                          color: '#38BDF8', border: '1px solid #38BDF833', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
                      }, 'Klien') : null
                    )
                  );
                })
              )
            )
          ) : null
        )
      ) : null,

      showSettings ? React.createElement(SettingsModal, { onClose: function () { setShowSettings(false); }, onSaved: load }) : null,
      clientModal ? React.createElement(ClientModal, { device: clientModal, onClose: function () { setClientModal(null); } }) : null
    );
  } catch (renderError) {
    return React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#EF4444' } },
      React.createElement('div', { style: { fontSize: 14, marginBottom: 8 } }, 'Render error:'),
      React.createElement('div', { style: { fontSize: 11, color: '#94A3B8' } }, String(renderError && renderError.message))
    );
  }
}
