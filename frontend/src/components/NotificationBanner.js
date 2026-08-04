import React, { useState } from 'react';

export default function NotificationBanner({ status, onRequest }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === 'granted' || status === 'unsupported') return null;

  if (status === 'denied') {
    return (
      <div style={{
        background: '#F59E0B11', border: '1px solid #F59E0B33', borderRadius: 8,
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Notifikasi diblokir browser</span>
            <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
              Buka Settings browser → izinkan notifikasi untuk localhost
            </span>
          </div>
        </div>
        <button onClick={() => setDismissed(true)}
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
      </div>
    );
  }

  // status === 'default' — belum diminta
  return (
    <div style={{
      background: '#38BDF811', border: '1px solid #38BDF833', borderRadius: 8,
      padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 18 }}>🔔</span>
        <div>
          <span style={{ fontSize: 12, color: '#38BDF8', fontWeight: 600 }}>Aktifkan notifikasi browser</span>
          <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
            Agar muncul popup otomatis saat ada host DOWN
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRequest}
          style={{
            background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: 5,
            padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', flexShrink: 0,
          }}>
          IZINKAN
        </button>
        <button onClick={() => setDismissed(true)}
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}
