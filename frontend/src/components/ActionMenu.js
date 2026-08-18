import React, { useState, useRef, useEffect } from 'react';

export default function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [open]);

  if (!actions || actions.length === 0) return null;

  const visible = actions.filter(a => a !== null && a !== undefined && !a.hidden);

  if (visible.length === 0) return null;
  if (visible.length === 1) {
    const a = visible[0];
    return (
      <button onClick={a.onClick} disabled={a.disabled} title={a.label}
        style={{
          background: a.color ? `${a.color}18` : 'var(--hover)',
          color: a.color || 'var(--text-muted)',
          border: `1px solid ${a.color ? a.color + '40' : 'var(--border)'}`,
          borderRadius: 999, padding: '5px 10px', fontSize: 10, fontWeight: 700,
          cursor: a.disabled ? 'not-allowed' : 'pointer', opacity: a.disabled ? 0.45 : 1,
          fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
        {a.icon && <span style={{ marginRight: 3 }}>{a.icon}</span>}
        {a.label}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(p => !p)} title="Aksi"
        style={{
          background: 'var(--hover)', color: 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: 999,
          padding: '5px 10px', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
        }}>
        ⋮
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow)', minWidth: 150,
          maxHeight: 260, overflowY: 'auto', padding: '4px',
          animation: 'pop 0.15s ease-out',
        }}>
          {visible.map((a, i) => (
            <button key={i} onClick={(e) => { if (!a.disabled) { e.stopPropagation(); a.onClick?.(e); setOpen(false); } }}
              disabled={a.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                background: 'transparent', border: 'none', borderRadius: 7, cursor: a.disabled ? 'not-allowed' : 'pointer',
                color: a.color || 'var(--text)', opacity: a.disabled ? 0.45 : 1,
                textAlign: 'left', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!a.disabled) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {a.icon && <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{a.icon}</span>}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
