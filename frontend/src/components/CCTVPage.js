import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import LiveModal from './LiveModal';
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
  }, [cam.id, cam.refresh_rate]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSnapshot();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchSnapshot, (cam.refresh_rate || 30) * 1000);
    return () => { mountedRef.current = false; clearInterval(intervalRef.current); };
  }, [fetchSnapshot, cam.refresh_rate]);

  const sc = cam.online ? '#22C55E' : '#EF4444';

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
      background: '#0A1628', border: `1px solid ${cam.online ? '#1E3A5F' : '#3A1E1E'}`,
      borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: cam.online ? 'none' : '0 0 12px #EF444422 inset',
    }}>
      {/* Feed area — 16:9 */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#050C1A', flexShrink: 0 }}>
        {loadState === 'ok' && imgSrc ? (
          <img src={imgSrc} alt={cam.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loadState === 'loading'
              ? <><div style={{ width: 28, height: 28, border: '3px solid #1E3A5F',
                  borderTopColor: '#38BDF8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
                  <span style={{ fontSize: 10, color: '#475569' }}>Connecting...</span></>
              : <><span style={{ fontSize: 28, opacity: 0.25 }}>📷</span>
                  <span style={{ fontSize: 10, color: '#EF4444' }}>No signal</span>
                  <span style={{ fontSize: 9, color: '#475569' }}>{cam.ip}</span></>
            }
          </div>
        )}

        {/* Status badge top-left */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center',
          gap: 5, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          padding: '3px 8px', borderRadius: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc,
            boxShadow: cam.online ? `0 0 6px ${sc}` : 'none' }}/>
          <span style={{ fontSize: 9, color: sc, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {cam.online ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Top-right info — stacked to avoid overlap */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: 3 }}>
          {cam.latency && cam.online && (
            <div style={{ background: 'rgba(0,0,0,0.65)', padding: '2px 6px', borderRadius: 4 }}>
              <span style={{ fontSize: 9, color: '#F59E0B', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                {Math.round(cam.latency)}ms
              </span>
            </div>
          )}
          <div style={{ background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
            <span style={{ fontSize: 8, color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>⟳{refreshLabel}</span>
          </div>
        </div>

        {/* Timestamp bottom-left */}
        {lastRefresh && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px', borderRadius: 4 }}>
            <span style={{ fontSize: 8, color: '#64748B', fontFamily: 'JetBrains Mono' }}>
              {lastRefresh.toLocaleTimeString('id-ID', { hour12: false })}
            </span>
          </div>
        )}

        {/* Fullscreen button bottom-right */}
        <button onClick={() => onFullscreen(cam)}
          style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.65)',
            border: '1px solid #334155', borderRadius: 5, padding: '3px 7px',
            cursor: 'pointer', color: '#E2E8F0', fontSize: 11 }} title="Snapshot Fullscreen">⛶</button>
      </div>

      {/* Info bar */}
      <div style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, background: '#0D1B2E' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name}</div>
          <div style={{ fontSize: 9, color: '#475569',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cam.location ? `${cam.location} · ` : ''}{cam.ip}
            {cam.auth_type && cam.auth_type !== 'none' ? ` · ${cam.auth_type.toUpperCase()}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={() => onLive(cam)} title="Live Stream RTSP"
            style={{ display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
              background: '#EF444422', border: '1px solid #EF444455',
              color: '#EF4444', fontSize: 9, fontWeight: 800,
              fontFamily: 'JetBrains Mono', letterSpacing: '0.08em',
              height: 24, transition: 'background 0.15s' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444',
              animation: 'pulse 1.5s infinite', flexShrink: 0 }}/>
            LIVE
          </button>
          <TileBtn onClick={handleForceCheck} title="Force check" color="#F59E0B">{checking ? '⟳' : '⚡'}</TileBtn>
          <TileBtn onClick={() => onEdit(cam)} title="Edit" color="#64748B">✎</TileBtn>
          <TileBtn onClick={() => onDelete(cam.id)} title="Delete" color="#EF4444">✕</TileBtn>
        </div>
      </div>
    </div>
  );
}

function TileBtn({ onClick, title, color, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 24, height: 24, background: 'transparent', border: '1px solid #1E3A5F',
      borderRadius: 4, color, cursor: 'pointer', fontSize: 12,
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

  const sc = cam.online ? '#22C55E' : '#EF4444';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: '#0D1B2E', borderBottom: '1px solid #1E3A5F', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc,
            boxShadow: cam.online ? `0 0 8px ${sc}` : 'none' }}/>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>{cam.name}</span>
          {cam.location && <span style={{ fontSize: 11, color: '#64748B' }}>— {cam.location}</span>}
          <span style={{ fontSize: 11, color: '#38BDF8', marginLeft: 4 }}>{cam.ip}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 10, color: '#64748B' }}>REFRESH:</span>
          {REFRESH_OPTIONS.map(r => (
            <button key={r.value} onClick={() => setRefreshRate(r.value)} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
              background: refreshRate === r.value ? '#38BDF822' : 'transparent',
              color:      refreshRate === r.value ? '#38BDF8'   : '#64748B',
              border:     `1px solid ${refreshRate === r.value ? '#38BDF844' : '#1E3A5F'}`,
            }}>{r.label}</button>
          ))}
          {lastRefresh && <span style={{ fontSize: 9, color: '#475569', marginLeft: 8 }}>
            {lastRefresh.toLocaleTimeString('id-ID', { hour12: false })}</span>}
          {cam.latency && <span style={{ fontSize: 10, color: '#F59E0B' }}>{Math.round(cam.latency)}ms</span>}
        </div>
        <button onClick={onClose} style={{ color: '#64748B', background: '#1E3A5F', border: 'none',
          borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, marginLeft: 12 }}>
          ✕ TUTUP
        </button>
      </div>
      {/* Image area */}
      <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
        {loadState === 'ok' && imgSrc
          ? <img src={imgSrc} alt={cam.name} style={{ maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain', borderRadius: 8, boxShadow: '0 0 60px #000' }}/>
          : loadState === 'error'
          ? <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, opacity: 0.2, marginBottom: 12 }}>📷</div>
              <div style={{ fontSize: 14, color: '#EF4444' }}>Camera tidak dapat dijangkau</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>{cam.ip}</div>
            </div>
          : <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, border: '4px solid #1E3A5F', borderTopColor: '#38BDF8',
                borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}/>
              <div style={{ fontSize: 12, color: '#475569' }}>Memuat...</div>
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
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px' }}>

      <div
        style={{ background: '#0D1B2E', border: '1px solid #1E3A5F', borderRadius: 14,
          width: '100%', maxWidth: 500,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          marginBottom: 24 }}>

        {/* Header — fixed, never scrolls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #1E3A5F',
          flexShrink: 0, background: '#0D1B2E', borderRadius: '14px 14px 0 0' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#E2E8F0' }}>
              {cam ? '✎ EDIT KAMERA' : '+ TAMBAH KAMERA'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Konfigurasi IP Camera / CCTV</div>
          </div>
          <button onClick={onClose} style={{ color: '#475569', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Form body — scrollable */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
          overflowY: 'auto', flex: 1 }}>

          {/* Name & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>NAMA KAMERA *</label>
              <input className="input" placeholder="Lobby Utama" value={form.name}
                onChange={e => set('name', e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={lbl}>LOKASI</label>
              <input className="input" placeholder="Lantai 1, Gedung A" value={form.location}
                onChange={e => set('location', e.target.value)} style={inp}/>
            </div>
          </div>

          {/* IP + Auto URL */}
          <div>
            <label style={lbl}>IP ADDRESS *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="192.168.1.100" value={form.ip}
                onChange={e => set('ip', e.target.value)} style={{ ...inp, flex: 1 }}/>
              <button onClick={autoFillSnapshot}
                style={{ padding: '8px 12px', background: '#1E3A5F', border: 'none', borderRadius: 6,
                  color: '#38BDF8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Auto URL
              </button>
            </div>
          </div>

          {/* RTSP URL for live stream */}
          <div>
            <label style={lbl}>RTSP URL (untuk Live Stream)</label>
            <input className="input" placeholder="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101"
              value={form.rtsp_url} onChange={e => set('rtsp_url', e.target.value)} style={inp}/>
            <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>
              Digunakan saat klik tombol ▶ LIVE · Kosongkan jika tidak perlu live view
            </div>
          </div>

          {/* Snapshot URL */}
          <div>
            <label style={lbl}>SNAPSHOT URL</label>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 5 }}>
              Kosongkan = otomatis coba&nbsp;
              <code style={{ color: '#38BDF8' }}>http://IP/snapshot.jpg</code>
            </div>
            <input className="input" placeholder="http://192.168.1.100/snapshot.jpg"
              value={form.snapshot_url} onChange={e => set('snapshot_url', e.target.value)} style={inp}/>
          </div>

          {/* Auth type */}
          <div>
            <label style={lbl}>METODE AUTENTIKASI</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { value: 'none',   label: 'Tidak Ada',   desc: 'Tanpa login',     color: '#64748B' },
                { value: 'basic',  label: 'Basic Auth',  desc: 'Standard HTTP',   color: '#38BDF8' },
                { value: 'digest', label: 'Digest Auth', desc: 'Hikvision/Dahua', color: '#A855F7' },
              ].map(a => (
                <button key={a.value} onClick={() => set('auth_type', a.value)} style={{
                  padding: '8px 4px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                  background: form.auth_type === a.value ? a.color + '22' : '#080F1E',
                  border: `1px solid ${form.auth_type === a.value ? a.color + '66' : '#1E3A5F'}`,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700,
                    color: form.auth_type === a.value ? a.color : '#64748B', marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: 9, color: '#475569' }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>USERNAME</label>
              <input className="input" placeholder="admin" value={form.username}
                onChange={e => set('username', e.target.value)}
                disabled={form.auth_type === 'none'}
                style={{ ...inp, opacity: form.auth_type === 'none' ? 0.4 : 1 }}/>
            </div>
            <div>
              <label style={lbl}>PASSWORD</label>
              <input className="input" type="password"
                placeholder={form.auth_type === 'none' ? '—' : cam ? '(kosong = tidak berubah)' : 'password'}
                value={form.password} onChange={e => set('password', e.target.value)}
                disabled={form.auth_type === 'none'}
                style={{ ...inp, opacity: form.auth_type === 'none' ? 0.4 : 1 }}/>
            </div>
          </div>

          {/* Refresh interval */}
          <div>
            <label style={lbl}>INTERVAL SNAPSHOT</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {REFRESH_OPTIONS.map(r => (
                <button key={r.value} onClick={() => set('refresh_rate', r.value)} style={{
                  flex: 1, padding: '9px 4px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                  background: form.refresh_rate === r.value ? '#38BDF822' : '#080F1E',
                  border: `1px solid ${form.refresh_rate === r.value ? '#38BDF866' : '#1E3A5F'}`,
                  color:  form.refresh_rate === r.value ? '#38BDF8' : '#64748B',
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
                }}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* URL tips */}
          <div style={{ background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 700, marginBottom: 6 }}>💡 URL Snapshot Umum</div>
            <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.9, fontFamily: 'JetBrains Mono' }}>
              Hikvision:&nbsp;<span style={{ color: '#94A3B8' }}>/ISAPI/Streaming/channels/101/picture</span><br/>
              Dahua:&nbsp;<span style={{ color: '#94A3B8' }}>/cgi-bin/snapshot.cgi</span><br/>
              Axis:&nbsp;<span style={{ color: '#94A3B8' }}>/axis-cgi/jpg/image.cgi</span><br/>
              Generic:&nbsp;<span style={{ color: '#94A3B8' }}>/snapshot.jpg</span>
            </div>
          </div>
        </div>

        {/* Footer — fixed at bottom, never scrolls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '12px 20px', borderTop: '1px solid #1E3A5F',
          flexShrink: 0, background: '#0D1B2E',
          borderRadius: '0 0 14px 14px' }}>
          <button onClick={onClose}
            style={{ fontSize: 11, padding: '8px 18px', borderRadius: 5, background: 'transparent',
              color: '#64748B', border: '1px solid #1E3A5F', cursor: 'pointer', fontFamily: 'inherit' }}>
            CANCEL
          </button>
          <button onClick={() => {
            if (!form.name.trim() || !form.ip.trim()) return alert('Nama dan IP wajib diisi');
            onSave({ ...form, auth_type: form.auth_type || 'none' });
          }} style={{ fontSize: 11, padding: '8px 22px', borderRadius: 5,
            background: '#22C55E', color: '#071A0E', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, letterSpacing: '0.06em' }}>
            {cam ? 'SIMPAN' : 'TAMBAH'}
          </button>
        </div>
      </div>
    </div>
  );
}

// shared styles
const lbl = { fontSize: 10, color: '#64748B', letterSpacing: '0.1em', display: 'block', marginBottom: 6 };
const inp = { background: '#080F1E', borderColor: '#1E3A5F' };

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
      height: 'calc(100vh - 84px)', background: '#080F1E' }}>

      {/* Toolbar */}
      <div style={{ background: '#0D1B2E', borderBottom: '1px solid #1E3A5F',
        padding: '8px 16px', display: 'flex', alignItems: 'center',
        gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>
            📹 CCTV MONITOR
          </span>
          <span style={{ fontSize: 10, background: '#1E3A5F', color: '#94A3B8',
            padding: '2px 8px', borderRadius: 4 }}>{cameras.length} kamera</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>● {onlineCount} ONLINE</span>
          <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>● {offlineCount} OFFLINE</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#475569' }}>GRID:</span>
          {GRID_OPTIONS.map(g => (
            <button key={g.cols} onClick={() => setGridCols(g.cols)} style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
              background: gridCols === g.cols ? '#38BDF822' : 'transparent',
              color:      gridCols === g.cols ? '#38BDF8'   : '#64748B',
              border:     `1px solid ${gridCols === g.cols ? '#38BDF844' : '#1E3A5F'}`,
              fontFamily: 'inherit', fontWeight: gridCols === g.cols ? 700 : 400,
            }}>{g.label}</button>
          ))}
          <div style={{ width: 1, height: 20, background: '#1E3A5F', margin: '0 4px' }}/>
          <button onClick={() => { setEditCam(null); setShowAddModal(true); }}
            style={{ fontSize: 11, padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
              background: '#22C55E', color: '#071A0E', border: 'none',
              fontFamily: 'inherit', fontWeight: 800, letterSpacing: '0.06em' }}>
            + KAMERA
          </button>
        </div>
      </div>

      {/* Camera grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {cameras.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10 }}>
            <div style={{ fontSize: 52, opacity: 0.12 }}>📹</div>
            <div style={{ fontSize: 14, color: '#475569' }}>Belum ada kamera</div>
            <div style={{ fontSize: 11, color: '#334155', marginBottom: 10 }}>
              Tambahkan IP Camera untuk memulai monitoring CCTV
            </div>
            <button onClick={() => setShowAddModal(true)}
              style={{ fontSize: 12, padding: '8px 20px', borderRadius: 6,
                background: '#22C55E', color: '#071A0E', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
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
