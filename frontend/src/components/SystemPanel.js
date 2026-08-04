import React from 'react';

function MetricBar({ label, value, max, color, unit }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const barColor = pct > 85 ? '#EF4444' : pct > 60 ? '#F59E0B' : color;
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 10, color: barColor, fontVariantNumeric: 'tabular-nums' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
          {max ? ` / ${parseFloat(max).toFixed(1)}${unit}` : ''}
        </span>
      </div>
      <div style={{ height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.5s, background 0.3s' }} />
      </div>
    </div>
  );
}

export default function SystemPanel({ system }) {
  if (!system) return (
    <div className="card p-4">
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>SYSTEM RESOURCES</span>
      <div style={{ color: '#475569', fontSize: 12, marginTop: 16, textAlign: 'center' }}>Loading...</div>
    </div>
  );

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>SYSTEM RESOURCES</span>
        <span style={{ fontSize: 9, color: '#22C55E', background: '#22C55E11', padding: '2px 6px', borderRadius: 3, border: '1px solid #22C55E22' }}>LIVE</span>
      </div>

      <MetricBar label="CPU USAGE" value={parseFloat(system.cpu_usage)} max={100} color="#38BDF8" unit="%" />
      <MetricBar label="MEMORY" value={parseFloat(system.mem_used)} max={parseFloat(system.mem_total)} color="#A855F7" unit="GB" />
      <MetricBar label="DISK" value={parseFloat(system.disk_used)} max={parseFloat(system.disk_total)} color="#F59E0B" unit="GB" />

      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: 'CPU', value: `${system.cpu_usage}%`, color: '#38BDF8' },
          { label: 'RAM FREE', value: `${system.mem_free}GB`, color: '#A855F7' },
          { label: 'DISK FREE', value: `${system.disk_free}GB`, color: '#F59E0B' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#0F172A', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
