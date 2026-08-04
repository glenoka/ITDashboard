import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

const TYPE_META = {
  ap:     { label: 'Access Point', icon: 'AP', color: '#F59E0B' },
  switch: { label: 'Switch',       icon: 'SW', color: '#A855F7' },
  router: { label: 'Router/GW',    icon: 'RT', color: '#22C55E' },
};

function fmtUptime(s) {
  if (!s) return '-';
  var d = Math.floor(s / 86400);
  var h = Math.floor((s % 86400) / 3600);
  var m = Math.floor((s % 3600) / 60);
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
  var onClose = props.onClose;
  var onSaved = props.onSaved;

  var [server, setServer] = useState('');
  var [appid, setAppid] = useState('');
  var [secret, setSecret] = useState(''); // kosong, tidak auto-fill
  var [enabled, setEnabled] = useState(true);
  var [syncInterval, setSyncInterval] = useState(60);
  var [msg, setMsg] = useState(null);
  var [testing, setTesting] = useState(false);
  var [saving, setSaving] = useState(false);

  useEffect(function () {
    axios.get(API + '/api/ruijie/settings')
      .then(function (r) {
        var d = r.data || {};
        if (d.server) setServer(d.server);
        if (d.appid) setAppid(d.appid);
        setEnabled(!!d.enabled);
        if (d.sync_interval) setSyncInterval(d.sync_interval);
      })
      .catch(function () {});
  }, []);

  function handleTest() {
    if (!appid || !secret) {
      setMsg({ ok: false, text: 'AppID dan Key wajib diisi' });
      return;
    }
    setTesting(true);
    setMsg(null);
    axios.post(API + '/api/ruijie/test', { server: server, appid: appid, secret: secret })
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
    axios.put(API + '/api/ruijie/settings', {
      server: server, appid: appid, secret: secret,
      enabled: enabled, sync_interval: syncInterval,
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
    style: { position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
  },
    React.createElement('div', {
      style: { background: '#0D1B2E', border: '1px solid #F5970B55', borderRadius: 14,
        width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
    },
      React.createElement('div', {
        style: { padding: '16px 20px', borderBottom: '1px solid #1E3A5F',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }
      },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 15, fontWeight: 800, color: '#E2E8F0' } }, 'KONFIGURASI RUIJIE CLOUD'),
          React.createElement('div', { style: { fontSize: 11, color: '#64748B', marginTop: 3 } }, 'Ruijie Cloud Open API')
        ),
        React.createElement('button', {
          onClick: onClose,
          style: { width: 30, height: 30, borderRadius: 8, background: '#1E3A5F', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 16 }
        }, 'X')
      ),
      React.createElement('div', {
        style: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }
      },
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
        React.createElement('div', null,
          React.createElement('label', { style: labelStyle }, 'Server URL'),
          React.createElement('input', {
            style: inputStyle, value: server, placeholder: 'https://cloud-as.ruijienetworks.com',
            onChange: function (e) { setServer(e.target.value); }
          }),
          React.createElement('div', { style: { fontSize: 9, color: '#334155', marginTop: 4 } },
            'Gunakan server sesuai region akun Ruijie Cloud kamu')
        ),
        React.createElement('div', null,
          React.createElement('label', { style: labelStyle }, 'AppID *'),
          React.createElement('input', {
            style: inputStyle, value: appid, placeholder: 'AppID dari Ruijie Cloud',
            autoComplete: 'off',
            onChange: function (e) { setAppid(e.target.value); }
          })
        ),
        React.createElement('div', null,
          React.createElement('label', { style: labelStyle }, 'Key (Secret) *'),
          React.createElement('input', {
            style: inputStyle, type: 'password', value: secret,
            placeholder: 'Masukkan key/secret', autoComplete: 'new-password',
            onChange: function (e) { setSecret(e.target.value); }
          })
        ),
        React.createElement('div', null,
          React.createElement('label', { style: labelStyle }, 'Interval Sync'),
          React.createElement('select', {
            style: Object.assign({}, inputStyle, { cursor: 'pointer' }),
            value: syncInterval,
            onChange: function (e) { setSyncInterval(parseInt(e.target.value, 10)); }
          },
            React.createElement('option', { value: 60 }, '1 menit'),
            React.createElement('option', { value: 300 }, '5 menit'),
            React.createElement('option', { value: 600 }, '10 menit'),
            React.createElement('option', { value: 1200 }, '20 menit'),
            React.createElement('option', { value: 1800 }, '30 menit'),
            React.createElement('option', { value: 3600 }, '1 jam'),
            React.createElement('option', { value: 43200 }, '12 jam')
          )
        ),
        msg ? React.createElement('div', {
          style: {
            padding: '10px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: msg.ok ? '#22C55E18' : '#EF444418',
            border: '1px solid ' + (msg.ok ? '#22C55E55' : '#EF444455'),
            color: msg.ok ? '#22C55E' : '#EF4444',
          }
        }, (msg.ok ? 'OK: ' : 'GAGAL: ') + msg.text) : null
      ),
      React.createElement('div', {
        style: { padding: '14px 20px', borderTop: '1px solid #1E3A5F', display: 'flex', gap: 8, flexShrink: 0 }
      },
        React.createElement('button', {
          onClick: handleTest, disabled: testing,
          style: { fontSize: 11, padding: '9px 18px', borderRadius: 6, background: '#1E3A5F',
            color: '#F59E0B', border: '1px solid #F59E0B44', cursor: testing ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }
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

function ipToNum(ip) {
  if (!ip) return -1;
  var parts = String(ip).split('.').map(function (n) { return parseInt(n, 10) || 0; });
  return (parts[0] || 0) * 16777216 + (parts[1] || 0) * 65536 + (parts[2] || 0) * 256 + (parts[3] || 0);
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function RuijiePage(props) {
  var wsRef = props.wsRef;

  var [status, setStatus] = useState({ connected: false, enabled: false, server: '', last_sync: null });
  var [devices, setDevices] = useState([]);
  var [showSettings, setShowSettings] = useState(false);
  var [syncing, setSyncing] = useState(false);
  var [filterType, setFilterType] = useState('all');
  var [filterOnline, setFilterOnline] = useState('all');
  var [viewMode, setViewMode] = useState('card'); // 'card' | 'list' | 'table'
  var [sortBy, setSortBy] = useState('name'); // 'name' | 'status' | 'ip' | 'type' | 'model' | 'group' | 'clients'
  var [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  var load = useCallback(function () {
    Promise.all([
      axios.get(API + '/api/ruijie/status').catch(function () { return null; }),
      axios.get(API + '/api/ruijie/devices').catch(function () { return null; }),
    ]).then(function (results) {
      var sRes = results[0];
      var dRes = results[1];
      if (sRes && sRes.data) setStatus(sRes.data);
      if (dRes && dRes.data && dRes.data.devices) setDevices(dRes.data.devices);
    });
  }, []);

  useEffect(function () { load(); }, [load]);
  useEffect(function () {
    var t = setInterval(load, 15000);
    return function () { clearInterval(t); };
  }, [load]);

  useEffect(function () {
    var ws = wsRef && wsRef.current;
    if (!ws) return;
    function onMsg(e) {
      try {
        var m = JSON.parse(e.data);
        if (m.type === 'ruijie_sync') {
          setDevices(m.devices || []);
          setStatus(function (p) { return Object.assign({}, p, { connected: m.connected }); });
        }
        if (m.type === 'ruijie_status') {
          setStatus(function (p) { return Object.assign({}, p, { connected: m.connected }); });
        }
      } catch (err) {}
    }
    ws.addEventListener('message', onMsg);
    return function () { ws.removeEventListener('message', onMsg); };
  }, [wsRef]);

  function doSync() {
    setSyncing(true);
    axios.post(API + '/api/ruijie/sync')
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

  var sorted = filtered.slice().sort(function (a, b) {
    var av, bv;
    if (sortBy === 'status') { av = a.online ? 1 : 0; bv = b.online ? 1 : 0; }
    else if (sortBy === 'ip') { av = ipToNum(a.ip); bv = ipToNum(b.ip); }
    else if (sortBy === 'type') { av = (a.type || ''); bv = (b.type || ''); }
    else if (sortBy === 'model') { av = (a.model || '').toLowerCase(); bv = (b.model || '').toLowerCase(); }
    else if (sortBy === 'group') { av = (a.group || '').toLowerCase(); bv = (b.group || '').toLowerCase(); }
    else if (sortBy === 'clients') { av = a.clients || 0; bv = b.clients || 0; }
    else { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
    var cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  var cntOnline = devices.filter(function (d) { return d.online; }).length;
  var cntOffline = devices.filter(function (d) { return !d.online; }).length;
  var cntClients = devices.reduce(function (s, d) { return s + (d.clients || 0); }, 0);

  try {
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: '#080F1E', overflow: 'hidden' }
    },
      // Toolbar
      React.createElement('div', {
        style: { background: '#0D1B2E', borderBottom: '1px solid #1E3A5F', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', minHeight: 52 }
      },
        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' } }, 'RUIJIE CLOUD'),
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: 5,
            background: connected ? '#22C55E18' : '#EF444418',
            border: '1px solid ' + (connected ? '#22C55E55' : '#EF444455'),
            borderRadius: 20, padding: '3px 10px', flexShrink: 0 }
        },
          React.createElement('div', { style: { width: 7, height: 7, borderRadius: '50%', background: connected ? '#22C55E' : '#EF4444' } }),
          React.createElement('span', {
            style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: connected ? '#22C55E' : '#EF4444' }
          }, !enabled ? 'DISABLED' : connected ? 'CONNECTED' : 'DISCONNECTED')
        ),
        status.server ? React.createElement('span', { style: { fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' } }, status.server) : null,
        connected ? React.createElement('span', { style: { fontSize: 10, color: '#22C55E', fontWeight: 700 } }, 'UP ' + cntOnline) : null,
        connected ? React.createElement('span', { style: { fontSize: 10, color: '#EF4444', fontWeight: 700 } }, 'DOWN ' + cntOffline) : null,
        connected ? React.createElement('span', { style: { fontSize: 10, color: '#38BDF8', fontWeight: 700 } }, 'CLIENTS ' + cntClients) : null,
        React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' } },
          enabled ? React.createElement('button', {
            onClick: doSync, disabled: syncing,
            style: { fontSize: 10, padding: '6px 12px', borderRadius: 6, background: 'transparent',
              border: '1px solid #F59E0B55', color: syncing ? '#475569' : '#F59E0B', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit' }
          }, syncing ? 'Syncing...' : 'Sync') : null,
          React.createElement('button', {
            onClick: function () { setShowSettings(true); },
            style: { fontSize: 12, padding: '8px 22px', borderRadius: 7, background: '#F59E0B',
              color: '#1A0F00', border: '2px solid #D97706', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 800, letterSpacing: '0.05em' }
          }, 'SETTING')
        )
      ),

      !enabled ? React.createElement('div', {
        style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }
      },
        React.createElement('div', { style: { fontSize: 16, color: '#475569', fontWeight: 700 } }, 'Ruijie Cloud belum dikonfigurasi'),
        React.createElement('div', { style: { fontSize: 12, color: '#334155', textAlign: 'center', maxWidth: 320 } }, 'Klik tombol SETTING di pojok kanan atas untuk mengatur AppID dan Key'),
        React.createElement('button', {
          onClick: function () { setShowSettings(true); },
          style: { marginTop: 8, fontSize: 13, padding: '11px 32px', borderRadius: 8, background: '#F59E0B',
            color: '#1A0F00', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }
        }, 'Konfigurasi Sekarang')
      ) : null,

      (enabled && !connected) ? React.createElement('div', {
        style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }
      },
        React.createElement('div', { style: { fontSize: 15, color: '#EF4444', fontWeight: 700 } }, 'Tidak terhubung ke Ruijie Cloud'),
        React.createElement('div', { style: { fontSize: 12, color: '#475569' } }, 'Periksa AppID dan Key, atau cek koneksi internet'),
        React.createElement('button', {
          onClick: doSync, disabled: syncing,
          style: { marginTop: 8, fontSize: 12, padding: '9px 26px', borderRadius: 7, background: '#F59E0B',
            color: '#1A0F00', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }
        }, syncing ? 'Menghubungkan...' : 'Coba Hubungkan')
      ) : null,

      (enabled && connected) ? React.createElement(React.Fragment, null,
        React.createElement('div', { style: { padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 } },
          ['all', 'ap', 'switch', 'router'].map(function (v) {
            var labels = { all: 'Semua', ap: 'AP', switch: 'Switch', router: 'Router' };
            return React.createElement('button', {
              key: v, onClick: function () { setFilterType(v); },
              style: { fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: filterType === v ? 700 : 400,
                background: filterType === v ? '#F59E0B22' : 'transparent',
                color: filterType === v ? '#F59E0B' : '#64748B',
                border: '1px solid ' + (filterType === v ? '#F59E0B55' : '#1E3A5F') }
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
              React.createElement('option', { value: 'model' }, 'Model'),
              React.createElement('option', { value: 'group' }, 'Group'),
              React.createElement('option', { value: 'clients' }, 'Klien')
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
                  background: viewMode === v[0] ? '#F59E0B' : 'transparent',
                  color: viewMode === v[0] ? '#1A0F00' : '#64748B',
                  border: 'none' }
              }, v[1]);
            })
          )
        ),
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
                    React.createElement('div', { style: { fontSize: 9, color: '#64748B' } }, meta.label + ' - ' + (dev.model || '-') + (dev.group ? ' - ' + dev.group : ''))
                  ),
                  React.createElement('div', { style: { textAlign: 'right', flexShrink: 0 } },
                    React.createElement('div', { style: { fontSize: 9, fontWeight: 800, color: sc } }, dev.onlineStatus || (dev.online ? 'ONLINE' : 'OFFLINE'))
                  )
                ),
                React.createElement('div', { style: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 } },
                  [['IP', dev.ip || '-', '#38BDF8'], ['SN', dev.sn || dev.mac, '#475569'], ['Model', dev.model || '-', '#64748B'], ['Firmware', dev.version || '-', '#475569'], ['Group', dev.group || '-', '#64748B']].map(function (row) {
                    return React.createElement('div', { key: row[0], style: { display: 'flex', justifyContent: 'space-between' } },
                      React.createElement('span', { style: { fontSize: 9, color: '#475569' } }, row[0]),
                      React.createElement('span', { style: { fontSize: 10, color: row[2], fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 185, textAlign: 'right' } }, row[1])
                    );
                  })
                ),
                React.createElement('div', { style: { padding: '7px 12px', borderTop: '1px solid #1E3A5F' } },
                  React.createElement('span', { style: { fontSize: 10, color: '#64748B' } }, dev.online ? (dev.clients || 0) + ' klien' : 'Perangkat offline')
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
                React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 10, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (dev.model || '-') + (dev.group ? ' - ' + dev.group : '')),
                React.createElement('div', { style: { width: 140, fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 } }, dev.version || '-'),
                React.createElement('div', { style: { width: 90, textAlign: 'right', flexShrink: 0 } },
                  React.createElement('span', { style: { fontSize: 9, fontWeight: 800, color: sc } }, dev.onlineStatus || (dev.online ? 'ONLINE' : 'OFFLINE'))
                ),
                React.createElement('div', { style: { width: 70, textAlign: 'right', fontSize: 10, color: '#64748B', flexShrink: 0 } }, dev.online ? (dev.clients || 0) + ' klien' : '-')
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
                  ['Status', 'Nama', 'Tipe', 'IP', 'SN/MAC', 'Model', 'Firmware', 'Group', 'Klien'].map(function (h) {
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
                        React.createElement('span', { style: { fontSize: 9, fontWeight: 800, color: sc } }, dev.onlineStatus || (dev.online ? 'ONLINE' : 'OFFLINE'))
                      )
                    ),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#E2E8F0', fontWeight: 600, whiteSpace: 'nowrap' } }, dev.name),
                    React.createElement('td', { style: { padding: '8px 12px', color: meta.color, whiteSpace: 'nowrap' } }, meta.label),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' } }, dev.ip || '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#475569', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' } }, dev.sn || dev.mac),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#64748B', whiteSpace: 'nowrap' } }, dev.model || '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#475569', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' } }, dev.version || '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#64748B', whiteSpace: 'nowrap' } }, dev.group || '-'),
                    React.createElement('td', { style: { padding: '8px 12px', color: '#64748B', textAlign: 'right', whiteSpace: 'nowrap' } }, dev.online ? (dev.clients || 0) : '-')
                  );
                })
              )
            )
          ) : null
        )
      ) : null,

      showSettings ? React.createElement(SettingsModal, { onClose: function () { setShowSettings(false); }, onSaved: load }) : null
    );
  } catch (renderError) {
    return React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#EF4444' } },
      React.createElement('div', { style: { fontSize: 14, marginBottom: 8 } }, 'Render error:'),
      React.createElement('div', { style: { fontSize: 11, color: '#94A3B8' } }, String(renderError && renderError.message))
    );
  }
}
