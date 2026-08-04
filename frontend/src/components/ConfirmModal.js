import React from 'react';

export default function ConfirmModal({ title, message, confirmText = 'Hapus', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal pop-in" style={{ maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel} style={{ padding: '8px 16px', fontSize: 12 }}>Batal</button>
          <button className="btn-danger" onClick={onConfirm} style={{ padding: '8px 16px', fontSize: 12 }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
