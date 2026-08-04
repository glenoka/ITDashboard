import React, { useEffect, useState } from 'react';
import Icon from './Icon';

export default function AlertToast({ alert, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const isDown = alert.status === 'DOWN';

  useEffect(() => {
    // Trigger fade-in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const color = isDown ? 'var(--danger)' : 'var(--success)';
  const bg = isDown ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)';
  const border = isDown ? 'rgba(239,68,68,0.40)' : 'rgba(16,185,129,0.40)';
  const label = isDown ? 'Host Down' : 'Host Pulih';

  return (
    <div
      onClick={onDismiss}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        boxShadow: `var(--shadow), 0 0 0 1px ${color}22`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        minWidth: 280,
      }}
    >
      <Icon name={isDown ? 'XCircle' : 'CheckCircle2'} size={18} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.04em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.hostName}
        </div>
        {alert.target && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
            {alert.target}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>
          {new Date(alert.timestamp).toLocaleTimeString('id-ID', { hour12: false })}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(); }}
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2, display: 'flex' }}
      ><Icon name="X" size={14} /></button>
    </div>
  );
}
