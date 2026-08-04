import React from 'react';

function MetricBar({ label, value, max, color, unit }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const barColor = pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : color;
  return (
    <div className="mb-3.5">
      <div className="flex justify-between mb-1.5">
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: barColor, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
          {max ? ` / ${parseFloat(max).toFixed(1)}${unit}` : ''}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 999, transition: 'width 0.5s, background 0.3s' }} />
      </div>
    </div>
  );
}

export default function SystemPanel({ system }) {
  if (!system) return (
    <div className="card p-5">
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Sistem</span>
      <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 16, textAlign: 'center' }}>Memuat...</div>
    </div>
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Sistem</span>
        <span style={{ fontSize: 10, color: 'var(--success)', background: 'rgba(16,185,129,0.12)', padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.30)' }}>Live</span>
      </div>

      <MetricBar label="Penggunaan CPU" value={parseFloat(system.cpu_usage)} max={100} color="var(--info)" unit="%" />
      <MetricBar label="Memori" value={parseFloat(system.mem_used)} max={parseFloat(system.mem_total)} color="var(--violet)" unit="GB" />
      <MetricBar label="Disk" value={parseFloat(system.disk_used)} max={parseFloat(system.disk_total)} color="var(--warning)" unit="GB" />

      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: 'CPU', value: `${system.cpu_usage}%`, color: 'var(--info)' },
          { label: 'RAM Free', value: `${system.mem_free}GB`, color: 'var(--violet)' },
          { label: 'Disk Free', value: `${system.disk_free}GB`, color: 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--input-bg)', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
