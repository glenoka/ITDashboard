import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

// Load HLS.js from CDN dynamically
function loadHlsJs() {
  return new Promise((resolve, reject) => {
    if (window.Hls) return resolve(window.Hls);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
    script.onload  = () => resolve(window.Hls);
    script.onerror = () => reject(new Error('Failed to load HLS.js'));
    document.head.appendChild(script);
  });
}

export default function LiveModal({ cam, onClose }) {
  const videoRef   = useRef(null);
  const hlsRef     = useRef(null);
  const [phase, setPhase]     = useState('starting'); // starting | loading | playing | error
  const [errMsg, setErrMsg]   = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef   = useRef(null);

  useEffect(() => {
    // Elapsed timer for "Starting stream..." phase
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // 1. Ask backend to start ffmpeg
        setPhase('starting');
        const startRes = await axios.post(`${API}/api/cctv/${cam.id}/stream/start`);
        if (cancelled) return;
        if (!startRes.data.ok) throw new Error('Backend failed to start stream');

        const hlsUrl = `${API || (window.location.protocol + '//' + window.location.host)}${startRes.data.url}`;

        // 2. If pending, wait a bit more
        if (startRes.data.pending) await new Promise(r => setTimeout(r, 3000));
        if (cancelled) return;

        setPhase('loading');

        // 3. Load HLS.js
        const Hls = await loadHlsJs();
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
            maxBufferLength: 15,
            liveSyncDurationCount: 2,
            liveMaxLatencyDurationCount: 5,
          });
          hlsRef.current = hls;

          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              setPhase('playing');
              clearInterval(timerRef.current);
              video.play().catch(() => {});
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setPhase('error');
              setErrMsg(`HLS error: ${data.type} — ${data.details}`);
            }
          });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = hlsUrl;
          video.addEventListener('loadedmetadata', () => {
            if (!cancelled) { setPhase('playing'); video.play().catch(() => {}); }
          });
        } else {
          throw new Error('Browser tidak support HLS. Gunakan Chrome/Edge/Firefox terbaru.');
        }

      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setErrMsg(err.message || 'Gagal memulai stream');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      // Stop stream on backend
      axios.post(`${API}/api/cctv/${cam.id}/stream/stop`).catch(() => {});
    };
  }, [cam.id]);

  const sc = cam.online ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)',
      zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: 'var(--card-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Live indicator */}
          {phase === 'playing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 999, padding: '3px 10px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)',
                boxShadow: '0 0 6px var(--danger)', animation: 'pulse 1.5s infinite' }}/>
              <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 800,
                letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>LIVE</span>
            </div>
          )}
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc }}/>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{cam.name}</span>
          {cam.location && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {cam.location}</span>}
          <span style={{ fontSize: 11, color: 'var(--info)', fontFamily: 'var(--mono)' }}>{cam.ip}</span>
        </div>

        {phase === 'playing' && cam.latency && (
          <span style={{ fontSize: 10, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>
            {Math.round(cam.latency)}ms
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {phase === 'playing' && (
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
              RTSP → HLS · 720p · 15fps
            </span>
          )}
          <button onClick={onClose} style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)', borderRadius: 999, padding: '6px 16px',
            cursor: 'pointer', fontSize: 11.5, fontWeight: 800, fontFamily: 'inherit' }}>
            ✕ Stop & Tutup
          </button>
        </div>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', background: '#000', overflow: 'hidden' }}>

        {/* Video element — always mounted */}
        <video ref={videoRef} controls playsInline muted
          style={{
            width: '100%', height: '100%', objectFit: 'contain',
            display: phase === 'playing' ? 'block' : 'none',
          }}/>

        {/* Starting phase */}
        {phase === 'starting' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
              <div style={{ position: 'absolute', inset: 8, border: '2px solid var(--card-2)',
                borderTopColor: 'var(--info)', borderRadius: '50%', animation: 'spin 1.5s linear infinite reverse' }}/>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center' }}>
                <Icon name="RadioTower" size={20} color="var(--text-muted)" />
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Memulai Live Stream...
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              ffmpeg sedang terhubung ke RTSP
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
              {elapsed}s — harap tunggu 5-15 detik
            </div>
            <div style={{ marginTop: 20, fontSize: 10.5, color: 'var(--text-muted)',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 16px', maxWidth: 360,
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="Lightbulb" size={13} color="var(--warning)" />
              Pastikan RTSP URL sudah diset di form Edit Kamera
            </div>
          </div>
        )}

        {/* Loading HLS */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '3px solid var(--border)',
              borderTopColor: 'var(--info)', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>Memuat video player...</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>HLS stream sedang diinisialisasi</div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
            <div style={{ marginBottom: 16, opacity: 0.4, display: 'flex', justifyContent: 'center' }}>
              <Icon name="AlertTriangle" size={48} color="var(--danger)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', marginBottom: 10 }}>
              Gagal Memulai Live Stream
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
              {errMsg}
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px', textAlign: 'left' }}>
              <div style={{ fontSize: 10.5, color: 'var(--info)', fontWeight: 700, marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="Wrench" size={12} />
                Troubleshooting
              </div>
              {[
                'Pastikan RTSP URL sudah diset di form Edit Kamera',
                `Format: rtsp://admin:password@${cam.ip}:554/Streaming/Channels/101`,
                'Cek username & password kamera benar',
                'Pastikan port 554 tidak diblokir firewall',
                'Coba buka RTSP URL di VLC terlebih dahulu',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--mono)' }}>{i+1}.</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-primary" style={{ marginTop: 20, fontSize: 11.5, padding: '9px 26px' }}>
              Tutup
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
