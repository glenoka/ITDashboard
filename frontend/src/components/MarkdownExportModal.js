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
      <div className="modal" style={{ maxWidth: 640, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <pre style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12, fontSize: 11, color: '#94A3B8', maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>{markdown}</pre>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={copy} style={{ fontSize: 12 }}>{copied ? '✓ TERSALIN' : 'SALIN MARKDOWN'}</button>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>TUTUP</button>
        </div>
      </div>
    </div>
  );
}
