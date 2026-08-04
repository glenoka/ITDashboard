import React, { useState } from 'react';
import Icon from './Icon';

export default function NotificationBanner({ status, onRequest }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === 'granted' || status === 'unsupported') return null;

  const closeBtn = (
    <button onClick={() => setDismissed(true)}
      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4, display: 'flex' }}>
      <Icon name="X" size={15} />
    </button>
  );

  if (status === 'denied') {
    return (
      <div style={{
        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.30)', borderRadius: 10,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div className="flex items-center gap-3">
          <Icon name="AlertTriangle" size={16} color="var(--warning)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--warning)', fontWeight: 700 }}>Notifikasi diblokir browser</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Buka Settings browser → izinkan notifikasi untuk localhost
            </span>
          </div>
        </div>
        {closeBtn}
      </div>
    );
  }

  // status === 'default' — belum diminta
  return (
    <div style={{
      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.30)', borderRadius: 10,
      padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div className="flex items-center gap-3">
        <Icon name="Bell" size={16} color="var(--info)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--info)', fontWeight: 700 }}>Aktifkan notifikasi browser</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Agar muncul popup otomatis saat ada host down
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRequest}
          style={{
            background: 'var(--info)', color: '#FFFFFF', border: 'none', borderRadius: 999,
            padding: '6px 16px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
          }}>
          Izinkan
        </button>
        {closeBtn}
      </div>
    </div>
  );
}
