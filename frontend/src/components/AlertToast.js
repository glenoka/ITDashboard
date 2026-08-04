import React, { useEffect, useState } from 'react';

export default function AlertToast({ alert, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const isDown = alert.status === 'DOWN';

  useEffect(() => {
    // Trigger fade-in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const color = isDown ? '#EF4444' : '#22C55E';
  const bg = isDown ? '#1a0a0a' : '#0a1a0f';
  const border = isDown ? '#EF444466' : '#22C55E66';
  const icon = isDown ? '🔴' : '🟢';
  const label = isDown ? 'HOST DOWN' : 'HOST RECOVERED';

  return (
    <div
      onClick={onDismiss}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        boxShadow: `0 4px 24px ${color}33, 0 0 0 1px ${color}11`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        minWidth: 280,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.08em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.hostName}
        </div>
        {alert.target && (
          <div style={{ fontSize: 10, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {alert.target}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
          {new Date(alert.timestamp).toLocaleTimeString('id-ID', { hour12: false })}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(); }}
        style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: 2 }}
      >✕</button>
    </div>
  );
}
