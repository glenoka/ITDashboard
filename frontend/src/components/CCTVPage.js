import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import LiveModal from './LiveModal';
import Icon from './Icon';
import { authUrl } from '../api';

const API = process.env.REACT_APP_API_URL || '';

const REFRESH_OPTIONS = [
  { value: 10,  label: '10s' },
  { value: 30,  label: '30s' },
  { value: 60,  label: '1m'  },
  { value: 300, label: '5m'  },
  { value: 600, label: '10m' },
];

const GRID_OPTIONS = [
  { cols: 2, label: '2×2' },
  { cols: 3, label: '3×3' },
  { cols: 4, label: '4×4' },
];

// ── Single camera tile ────────────────────────────────────────────────────────
function CameraTile({ cam, onFullscreen, onEdit, onDelete, onForceCheck, onLive }) {
  const [imgSrc, setImgSrc]       = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [checking, setChecking]   = useState(false);
  const intervalRef = useRef(null);
  const mountedRef  = useRef(true);

  const fetchSnapshot = useCallback(() => {
    if (!mountedRef.current) return;
    const url = authUrl(`/api/cctv/${cam.id}/snapshot?t=${Date.now()}`);
    const img = new Image();
    img.onload = () => {
      if (!mountedRef.current) return;
      setImgSrc(url); setLoadState('ok'); setLastRefresh(new Date());
    };
    img.onerror = () => {
      if (!mountedRef.current) return;
      setLoadState('error'); setLastRefresh(new Date());
    };
    img.src = url;
  }, [cam.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSnapshot();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchSnapshot, (cam.refresh_rate || 30) * 1000);
    return () => { mountedRef.current = false; clearInterval(intervalRef.current); };
  }, [fetchSnapshot, cam.refresh_rate]);

  const sc = cam.online ? 'var(--success)' : 'var(--danger)';

  const handleForceCheck = async () => {
    setChecking(true);
    await onForceCheck(cam.id);
    fetchSnapshot();
    setChecking(false);
  };

  const refreshLabel = REFRESH_OPTIONS.find(r => r.value === cam.refresh_rate)?.label
    || `${cam.refresh_rate}s`;

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${cam.online ? 'var(--border)' : 'rgba(239,68,68,0.35)'}`,
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: 'var(--shadow)',
    }}>
      {/* Feed area — 16:9 */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: 'var(--bg-deep)', flexShrink: 0 }}>
        {loadState === 'ok' && imgSrc ? (
          <img src={imgSrc} alt={cam.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loadState === 'loading'
              ? <><div style={{ width: 28, height: 28, border: '3px solid var(--border)',
                  borderTopColor: 'var(--info)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Menghubungkan...</span></>
              : <><span style={{ opacity: 0.35, display: 'flex' }}><Icon name="Video" size={26} color="var(--text-faint)" /></span>
                  <span style={{ fontSize: 10, color: 'var(--danger)' }}>Tidak ada sinyal</span>
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>{cam.ip}</span></>
            }
          </div>
        )}

        {/* Status badge top-left */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center',
          gap: 5, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          padding: '3px 8px', borderRadius: 999 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc,
            boxShadow: cam.online ? `0 0 6px ${sc}` : 'none' }}/>
          <span style={{ fontSize: 9, color: sc, fontWeight: 800, fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
            {cam.online ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Top-right info — stacked to avoid overlap */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: 3 }}>
          {cam.latency && cam.online && (
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--warning)', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {Math.round(cam.latency)}ms
              </span>
            </div>
          )}
          <div style={{ background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 6 }}>
            <span style={{ fontSize: 8, color: 'var(--info)', fontFamily: 'var(--mono)' }}>⟳{refreshLabel}</span>
          </div>
        </div>

        {/* Timestamp bottom-left */}
        {lastRefresh && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px', borderRadius: 6 }}>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
              {lastRefresh.toLocaleTimeString('id-ID', { hour12: false })}
            </span>
          </div>
        )}

        {/* Fullscreen button bottom-right */}
        <button onClick={() => onFullscreen(cam)}
          style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 8px',
            cursor: 'pointer', color: '#fff', fontSize: 12 }} title="Fullscreen Snapshot">⛶</button>
      </div>

      {/* Info bar */}
      <div style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-2)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
            {cam.location ? `${cam.location} · ` : ''}{cam.ip}
            {cam.auth_type && cam.auth_type !== 'none' ? ` · ${cam.auth_type.toUpperCase()}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={() => onLive(cam)} title="Live Stream RTSP"
            style={{ display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999, cursor: 'pointer',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
              color: 'var(--danger)', fontSize: 9, fontWeight: 800,
              fontFamily: 'var(--mono)', letterSpacing: '0.06em',
              height: 24, transition: 'background 0.15s' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)',
              animation: 'pulse 1.5s infinite', flexShrink: 0 }}/>
            LIVE
          </button>
          <TileBtn onClick={handleForceCheck} title="Force check" color="var(--warning)">{checking ? '⟳' : '⚡'}</TileBtn>
          <TileBtn onClick={() => onEdit(cam)} title="Edit" color="var(--text-muted)">✎</TileBtn>
          <TileBtn onClick={() => onDelete(cam.id)} title="Delete" color="var(--danger)">✕</TileBtn>
        </div>
      </div>
    </div>
  );
}

function TileBtn({ onClick, title, color, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 24, height: 24, background: 'transparent', border: '1px solid var(--border)',
      borderRadius: 8, color, cursor: 'pointer', fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}

// ── Fullscreen modal ──────────────────────────────────────────────────────────
function FullscreenModal({ cam, onClose }) {
  const [imgSrc, setImgSrc]       = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [refreshRate, setRefreshRate] = useState(cam.refresh_rate || 30);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef  = useRef(true);

  const fetch = useCallback(() => {
    if (!mountedRef.current) return;
    const url = authUrl(`/api/cctv/${cam.id}/snapshot?t=${Date.now()}`);
    const img = new Image();
    img.onload  = () => { if (!mountedRef.current) return; setImgSrc(url); setLoadState('ok'); setLastRefresh(new Date()); };
    img.onerror = () => { if (!mountedRef.current) return; setLoadState('error'); };
    img.src = url;
  }, [cam.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetch, refreshRate * 1000);
    return () => { mountedRef.current = false; clearInterval(intervalRef.current); };
  }, [fetch, refreshRate]);

  const sc = cam.online ? 'var(--success)' : 'var(--danger)';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: 'var(--card-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc,
            boxShadow: cam.online ? `0 0 8px ${sc}` : 'none' }}/>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{cam.name}</span>
          {cam.location && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {cam.location}</span>}
          <span style={{ fontSize: 11, color: 'var(--info)', marginLeft: 4, fontFamily: 'var(--mono)' }}>{cam.ip}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>Refresh:</span>
          {REFRESH_OPTIONS.map(r => (
            <button key={r.value} onClick={() => setRefreshRate(r.value)} style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              background: refreshRate === r.value ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: refreshRate === r.value ? 'var(--info)' : 'var(--text-muted)',
              border:     `1px solid ${refreshRate === r.value ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
              fontWeight: refreshRate === r.value ? 700 : 400,
            }}>{r.label}</button>
          ))}
          {lastRefresh && <span style={{ fontSize: 9, color: 'var(--text-faint)', marginLeft: 8, fontFamily: 'var(--mono)' }}>
            {lastRefresh.toLocaleTimeString('id-ID', { hour12: false })}</span>}
          {cam.latency && <span style={{ fontSize: 10, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>{Math.round(cam.latency)}ms</span>}
        </div>
        <button onClick={onClose} className="btn-ghost"
          style={{ marginLeft: 12, padding: '5px 14px', fontSize: 12 }}>
          ✕ Tutup
        </button>
      </div>
      {/* Image area */}
      <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
        {loadState === 'ok' && imgSrc
          ? <img src={imgSrc} alt={cam.name} style={{ maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain', borderRadius: 10, boxShadow: '0 0 60px #000' }}/>
          : loadState === 'error'
          ? <div style={{ textAlign: 'center' }}>
              <div style={{ opacity: 0.2, marginBottom: 12, display: 'flex' }}><Icon name="Video" size={48} color="var(--text-faint)" /></div>
              <div style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 700 }}>Kamera tidak dapat dijangkau</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6, fontFamily: 'var(--mono)' }}>{cam.ip}</div>
            </div>
          : <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--info)',
                borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}/>
              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Memuat...</div>
            </div>
        }
      </div>
    </div>
  );
}

// ── Add / Edit Camera Modal ───────────────────────────────────────────────────
function CameraModal({ cam, onClose, onSave }) {
  const [form, setForm] = useState({
    name:         cam?.name         || '',
    ip:           cam?.ip           || '',
    rtsp_url:     cam?.rtsp_url     || '',
    snapshot_url: cam?.snapshot_url || '',
    username:     cam?.username     || '',
    password:     '',
    location:     cam?.location     || '',
    auth_type:    cam?.auth_type    || 'none',
    refresh_rate: cam?.refresh_rate || 30,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const autoFillSnapshot = () => {
    if (form.ip) set('snapshot_url', `http://${form.ip}/snapshot.jpg`);
  };

  return (
    <div className="modal-overlay">
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
          width: '100%', maxWidth: 500,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          marginBottom: 24, boxShadow: 'var(--shadow)' }}>

        {/* Header — fixed, never scrolls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: '1px solid var(--border)',
          flexShrink: 0, background: 'var(--card)', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {cam ? 'Edit Kamera' : 'Tambah Kamera'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Konfigurasi IP Camera / CCTV</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'var(--hover)', border: '1px solid var(--border)',
            borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        {/* Form body — scrollable */}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16,
          overflowY: 'auto', flex: 1 }}>

          {/* Name & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Nama Kamera *</label>
              <input className="input" placeholder="Lobby Utama" value={form.name}
                onChange={e => set('name', e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Lokasi</label>
              <input className="input" placeholder="Lantai 1, Gedung A" value={form.location}
                onChange={e => set('location', e.target.value)} style={inp}/>
            </div>
          </div>

          {/* IP + Auto URL */}
          <div>
            <label style={lbl}>IP Address *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="192.168.1.100" value={form.ip}
                onChange={e => set('ip', e.target.value)} style={{ ...inp, flex: 1 }}/>
              <button onClick={autoFillSnapshot}
                style={{ padding: '8px 14px', background: 'var(--hover)', border: '1px solid var(--border)', borderRadius: 10,
                  color: 'var(--info)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: 700 }}>
                Auto URL
              </button>
            </div>
          </div>

          {/* RTSP URL for live stream */}
          <div>
            <label style={lbl}>RTSP URL (untuk Live Stream)</label>
            <input className="input" placeholder="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101"
              value={form.rtsp_url} onChange={e => set('rtsp_url', e.target.value)} style={inp}/>
            <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 4 }}>
              Dipakai saat klik tombol ▶ Live · Kosongkan jika tidak perlu live view
            </div>
          </div>

          {/* Snapshot URL */}
          <div>
            <label style={lbl}>Snapshot URL</label>
            <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginBottom: 5 }}>
              Kosongkan = otomatis coba&nbsp;
              <code style={{ color: 'var(--info)' }}>http://IP/snapshot.jpg</code>
            </div>
            <input className="input" placeholder="http://192.168.1.100/snapshot.jpg"
              value={form.snapshot_url} onChange={e => set('snapshot_url', e.target.value)} style={inp}/>
          </div>

          {/* Auth type */}
          <div>
            <label style={lbl}>Metode Autentikasi</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { value: 'none',   label: 'Tidak Ada',   desc: 'Tanpa login',     color: 'var(--text-muted)' },
                { value: 'basic',  label: 'Basic Auth',  desc: 'Standard HTTP',   color: 'var(--info)' },
                { value: 'digest', label: 'Digest Auth', desc: 'Hikvision/Dahua', color: 'var(--violet)' },
              ].map(a => (
                <button key={a.value} onClick={() => set('auth_type', a.value)} style={{
                  padding: '9px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  background: form.auth_type === a.value ? a.color + '22' : 'var(--input-bg)',
                  border: `1px solid ${form.auth_type === a.value ? a.color + '66' : 'var(--border)'}`,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700,
                    color: form.auth_type === a.value ? a.color : 'var(--text-muted)', marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Username</label>
              <input className="input" placeholder="admin" value={form.username}
                onChange={e => set('username', e.target.value)}
                disabled={form.auth_type === 'none'}
                style={{ ...inp, opacity: form.auth_type === 'none' ? 0.4 : 1 }}/>
            </div>
            <div>
              <label style={lbl}>Password</label>
              <input className="input" type="password"
                placeholder={form.auth_type === 'none' ? '—' : cam ? '(kosong = tidak berubah)' : 'password'}
                value={form.password} onChange={e => set('password', e.target.value)}
                disabled={form.auth_type === 'none'}
                style={{ ...inp, opacity: form.auth_type === 'none' ? 0.4 : 1 }}/>
            </div>
          </div>

          {/* Refresh interval */}
          <div>
            <label style={lbl}>Interval Snapshot</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {REFRESH_OPTIONS.map(r => (
                <button key={r.value} onClick={() => set('refresh_rate', r.value)} style={{
                  flex: 1, padding: '9px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  background: form.refresh_rate === r.value ? 'rgba(59,130,246,0.12)' : 'var(--input-bg)',
                  border: `1px solid ${form.refresh_rate === r.value ? 'rgba(59,130,246,0.40)' : 'var(--border)'}`,
                  color:  form.refresh_rate === r.value ? 'var(--info)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
                }}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* URL tips */}
          <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--info)', fontWeight: 700, marginBottom: 6 }}>💡 URL Snapshot Umum</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.9, fontFamily: 'var(--mono)' }}>
              Hikvision:&nbsp;<span style={{ color: 'var(--text-muted)' }}>/ISAPI/Streaming/channels/101/picture</span><br/>
              Dahua:&nbsp;<span style={{ color: 'var(--text-muted)' }}>/cgi-bin/snapshot.cgi</span><br/>
              Axis:&nbsp;<span style={{ color: 'var(--text-muted)' }}>/axis-cgi/jpg/image.cgi</span><br/>
              Generic:&nbsp;<span style={{ color: 'var(--text-muted)' }}>/snapshot.jpg</span>
            </div>
          </div>
        </div>

        {/* Footer — fixed at bottom, never scrolls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          flexShrink: 0, background: 'var(--card)',
          borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: 12, padding: '8px 18px' }}>
            Batal
          </button>
          <button className="btn-primary" onClick={() => {
            if (!form.name.trim() || !form.ip.trim()) return alert('Nama dan IP wajib diisi');
            onSave({ ...form, auth_type: form.auth_type || 'none' });
          }}>
            {cam ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}

// shared styles
const lbl = { fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 7 };
const inp = { background: 'var(--input-bg)', borderColor: 'var(--border)' };

// ── Main CCTV page ────────────────────────────────────────────────────────────
export default function CCTVPage({ wsRef }) {
  const [cameras, setCameras]         = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCam, setEditCam]         = useState(null);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [liveCam, setLiveCam]         = useState(null);
  const [gridCols, setGridCols]       = useState(3);

  const load = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/cctv`); setCameras(res.data); } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // WebSocket realtime
  useEffect(() => {
    const handleMsg = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'cctv_status')
          setCameras(prev => prev.map(c => c.id === msg.camId
            ? { ...c, online: msg.online, latency: msg.latency, lastCheck: msg.lastCheck } : c));
        if (msg.type === 'cctv_added')   setCameras(prev => [...prev, msg.cam]);
        if (msg.type === 'cctv_deleted') setCameras(prev => prev.filter(c => c.id !== msg.camId));
      } catch (e) {}
    };
    const ws = wsRef?.current;
    if (ws) ws.addEventListener('message', handleMsg);
    return () => { if (ws) ws.removeEventListener('message', handleMsg); };
  }, [wsRef]);

  const handleSave = async (data) => {
    try {
      if (editCam) {
        const res = await axios.put(`${API}/api/cctv/${editCam.id}`, data);
        setCameras(prev => prev.map(c => c.id === res.data.id ? { ...c, ...res.data } : c));
      } else {
        const res = await axios.post(`${API}/api/cctv`, data);
        setCameras(prev => [...prev, res.data]);
      }
    } catch (e) {}
    setShowAddModal(false); setEditCam(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus kamera ini?')) return;
    try { await axios.delete(`${API}/api/cctv/${id}`); } catch (e) {}
    setCameras(prev => prev.filter(c => c.id !== id));
  };

  const handleForceCheck = async (id) => {
    try {
      const res = await axios.post(`${API}/api/cctv/${id}/check`);
      setCameras(prev => prev.map(c => c.id === id
        ? { ...c, online: res.data.online, latency: res.data.latency, lastCheck: res.data.lastCheck } : c));
    } catch (e) {}
  };

  const onlineCount  = cameras.filter(c => c.online).length;
  const offlineCount = cameras.filter(c => !c.online).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 84px)', background: 'var(--bg)' }}>

      {/* Toolbar */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '8px 18px', display: 'flex', alignItems: 'center',
        gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.04em' }}>
            <Icon name="Video" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> CCTV Monitor
          </span>
          <span style={{ fontSize: 10, background: 'var(--hover)', color: 'var(--text-muted)',
            padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--mono)' }}>{cameras.length} kamera</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>● {onlineCount} Online</span>
          <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700 }}>● {offlineCount} Offline</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>Grid:</span>
          {GRID_OPTIONS.map(g => (
            <button key={g.cols} onClick={() => setGridCols(g.cols)} style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
              background: gridCols === g.cols ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: gridCols === g.cols ? 'var(--info)' : 'var(--text-muted)',
              border:     `1px solid ${gridCols === g.cols ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
              fontFamily: 'inherit', fontWeight: gridCols === g.cols ? 700 : 400,
            }}>{g.label}</button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }}/>
          <button onClick={() => { setEditCam(null); setShowAddModal(true); }}
            className="btn-primary" style={{ padding: '6px 16px', fontSize: 11.5 }}>
            + Kamera
          </button>
        </div>
      </div>

      {/* Camera grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {cameras.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10 }}>
            <div style={{ opacity: 0.12, display: 'flex', justifyContent: 'center' }}><Icon name="Video" size={44} color="var(--text-faint)" /></div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>Belum ada kamera</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
              Tambahkan IP Camera untuk memulai monitoring CCTV
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 12.5 }}>
              + Tambah Kamera Pertama
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 12 }}>
            {cameras.map(cam => (
              <CameraTile key={cam.id} cam={cam}
                onFullscreen={setFullscreenCam}
                onLive={setLiveCam}
                onEdit={c => { setEditCam(c); setShowAddModal(true); }}
                onDelete={handleDelete}
                onForceCheck={handleForceCheck} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showAddModal || editCam) && (
        <CameraModal cam={editCam}
          onClose={() => { setShowAddModal(false); setEditCam(null); }}
          onSave={handleSave} />
      )}
      {fullscreenCam && (
        <FullscreenModal cam={fullscreenCam} onClose={() => setFullscreenCam(null)} />
      )}

      {liveCam && (
        <LiveModal cam={liveCam} onClose={() => setLiveCam(null)} />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
      `}</style>
    </div>
  );
}
