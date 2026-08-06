import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const INTERVALS = [
  { value: 10, label: '10 detik' },
  { value: 30, label: '30 detik' },
  { value: 60, label: '1 menit' },
  { value: 180, label: '3 menit' },
  { value: 600, label: '10 menit' },
];

const DEVICE_TYPES = [
  { value: 'Switch', icon: 'Boxes' },
  { value: 'Access Point', icon: 'Wifi' },
  { value: 'Website', icon: 'Globe' },
  { value: 'Gateway', icon: 'Router' },
];

const labelStyle = { fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 };

export default function AddHostModal({ host, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    target: '',
    type: 'ip',
    category: 'Switch',
    interval: 60,
  });

  useEffect(() => {
    if (host) setForm({ name: host.name, target: host.target, type: host.type, category: host.category || 'Switch', interval: host.interval });
  }, [host]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim() || !form.target.trim()) {
      alert('Nama dan target wajib diisi');
      return;
    }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pop-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              {host ? 'Edit Host' : 'Tambah Host'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {host ? 'Perbarui target monitoring' : 'Tambahkan target monitoring baru'}
            </div>
          </div>
          <button onClick={onClose} title="Tutup" style={{ color: 'var(--text-muted)', background: 'var(--hover)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="X" size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label style={labelStyle}>Nama Host</label>
            <input className="input" placeholder="contoh: Core Router, Google DNS" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Jenis Monitoring</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ip', label: 'Local IP / ICMP', icon: 'Network', desc: 'Ping via ICMP' },
                { value: 'website', label: 'Website / URL', icon: 'Globe', desc: 'HTTP GET request' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => set('type', t.value)}
                  style={{
                    background: form.type === t.value ? 'rgba(99,102,241,0.10)' : 'var(--input-bg)',
                    border: `1px solid ${form.type === t.value ? 'rgba(99,102,241,0.40)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', boxShadow: form.type === t.value ? 'var(--glow)' : 'none',
                  }}
                >
                  <div style={{ marginBottom: 4, color: form.type === t.value ? 'var(--accent)' : 'var(--text-muted)', display: 'flex' }}>
                    <Icon name={t.icon} size={17} />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: form.type === t.value ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'inherit' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, fontFamily: 'inherit' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Device Type */}
          <div>
            <label style={labelStyle}>Tipe Perangkat</label>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => set('category', t.value)}
                  style={{
                    background: form.category === t.value ? 'rgba(16,185,129,0.10)' : 'var(--input-bg)',
                    border: `1px solid ${form.category === t.value ? 'rgba(16,185,129,0.40)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', boxShadow: form.category === t.value ? 'var(--glow)' : 'none',
                  }}
                >
                  <div style={{ marginBottom: 4, color: form.category === t.value ? 'var(--success)' : 'var(--text-muted)', display: 'flex' }}>
                    <Icon name={t.icon} size={17} />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: form.category === t.value ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'inherit' }}>{t.value}</div>
                </button>
              ))}
              <button
                onClick={() => set('category', '')}
                style={{
                  background: 'var(--input-bg)',
                  border: `1px dashed ${form.category !== 'Switch' && form.category !== 'Access Point' && form.category !== 'Website' && form.category !== 'Gateway' ? 'rgba(16,185,129,0.50)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ marginBottom: 4, color: 'var(--text-muted)', display: 'flex' }}>
                  <Icon name="Plus" size={17} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Tambah Tipe Baru</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, fontFamily: 'inherit' }}>Server, Firewall, Printer, dll</div>
              </button>
            </div>
            {form.category !== 'Switch' && form.category !== 'Access Point' && form.category !== 'Website' && form.category !== 'Gateway' && (
              <input
                className="input"
                style={{ marginTop: 10 }}
                placeholder="Ketik tipe perangkat baru, contoh: Firewall, Server, Printer"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              />
            )}
          </div>

          {/* Target */}
          <div>
            <label style={labelStyle}>Target</label>
            <input
              className="input"
              placeholder={form.type === 'ip' ? 'contoh: 192.168.1.1' : 'contoh: https://google.com'}
              value={form.target}
              onChange={e => set('target', e.target.value)}
            />
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 5 }}>
              {form.type === 'ip' ? 'Alamat IPv4 atau hostname untuk ping ICMP' : 'URL lengkap termasuk https://'}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label style={labelStyle}>Interval Pengecekan</label>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map(iv => (
                <button
                  key={iv.value}
                  onClick={() => set('interval', iv.value)}
                  style={{
                    fontSize: 11.5, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                    background: form.interval === iv.value ? 'rgba(99,102,241,0.12)' : 'var(--input-bg)',
                    color: form.interval === iv.value ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${form.interval === iv.value ? 'rgba(99,102,241,0.40)' : 'var(--border)'}`,
                    fontFamily: 'inherit', fontWeight: form.interval === iv.value ? 700 : 500, transition: 'all 0.15s',
                  }}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12, padding: '8px 18px' }}>
            Batal
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {host ? 'Simpan Perubahan' : 'Tambah Host'}
          </button>
        </div>
      </div>
    </div>
  );
}
