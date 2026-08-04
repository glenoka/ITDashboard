import React, { useState, useEffect } from 'react';

const INTERVALS = [
  { value: 10, label: '10 Seconds' },
  { value: 30, label: '30 Seconds' },
  { value: 60, label: '1 Minute' },
  { value: 180, label: '3 Minutes' },
  { value: 600, label: '10 Minutes' },
];

export default function AddHostModal({ host, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    target: '',
    type: 'ip',
    interval: 60,
  });

  useEffect(() => {
    if (host) setForm({ name: host.name, target: host.target, type: host.type, interval: host.interval });
  }, [host]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim() || !form.target.trim()) {
      alert('Name and target are required');
      return;
    }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#334155' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#E2E8F0' }}>
              {host ? 'EDIT HOST' : 'ADD HOST'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              {host ? 'Modify monitoring target' : 'Add new monitoring target'}
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>HOST NAME</label>
            <input className="input" placeholder="e.g. Core Router, Google DNS" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ip', label: 'Local IP / ICMP', icon: '◈', desc: 'Ping via ICMP' },
                { value: 'website', label: 'Website / URL', icon: '⌁', desc: 'HTTP GET request' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => set('type', t.value)}
                  style={{
                    background: form.type === t.value ? '#22C55E11' : '#0F172A',
                    border: `1px solid ${form.type === t.value ? '#22C55E44' : '#334155'}`,
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 4, color: form.type === t.value ? '#22C55E' : '#64748B' }}>{t.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: form.type === t.value ? '#E2E8F0' : '#94A3B8', fontFamily: 'inherit' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontFamily: 'inherit' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          <div>
            <label style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TARGET</label>
            <input
              className="input"
              placeholder={form.type === 'ip' ? 'e.g. 192.168.1.1' : 'e.g. https://google.com'}
              value={form.target}
              onChange={e => set('target', e.target.value)}
            />
            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
              {form.type === 'ip' ? 'IPv4 address or hostname for ICMP ping' : 'Full URL including https://'}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CHECK INTERVAL</label>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map(iv => (
                <button
                  key={iv.value}
                  onClick={() => set('interval', iv.value)}
                  style={{
                    fontSize: 11, padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
                    background: form.interval === iv.value ? '#22C55E22' : '#0F172A',
                    color: form.interval === iv.value ? '#22C55E' : '#64748B',
                    border: `1px solid ${form.interval === iv.value ? '#22C55E44' : '#334155'}`,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: '#334155' }}>
          <button
            onClick={onClose}
            style={{ fontSize: 11, padding: '7px 16px', borderRadius: 5, background: 'transparent', color: '#64748B', border: '1px solid #334155', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            CANCEL
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {host ? 'SAVE CHANGES' : 'ADD HOST'}
          </button>
        </div>
      </div>
    </div>
  );
}
