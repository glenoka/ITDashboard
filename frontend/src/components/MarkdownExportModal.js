import React, { useState } from 'react';

export default function MarkdownExportModal({ title, markdown, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pop-in" style={{ maxWidth: 640, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} title="Tutup" style={{ background: 'var(--hover)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <pre style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted)', maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', marginBottom: 14 }}>{markdown}</pre>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={copy} style={{ fontSize: 12 }}>{copied ? '✓ Tersalin' : 'Salin Markdown'}</button>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
