import React from 'react';
import Icon from './Icon';

export default function SummaryCards({ stats }) {
  const cards = [
    { label: 'Total Hosts', value: stats.total, icon: 'Monitor', color: 'var(--text)' },
    { label: 'Hosts Up', value: stats.up, icon: 'CheckCircle2', color: 'var(--success)' },
    { label: 'Hosts Down', value: stats.down, icon: 'XCircle', color: 'var(--danger)' },
    {
      label: 'Availability', value: `${stats.availability}%`, icon: 'Activity', color: 'var(--text)',
      isPercent: true, pct: parseFloat(stats.availability),
    },
    { label: 'Avg Latency', value: `${stats.avgLatency}ms`, icon: 'Gauge', color: 'var(--text)' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="card p-4 fade-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>{card.label}</span>
            <Icon name={card.icon} size={16} color="var(--text-faint)" />
          </div>

          <div style={{ fontSize: 26, fontWeight: 700, color: card.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {card.value}
          </div>

          {card.isPercent && (
            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, card.pct)}%`,
                  background: card.pct > 90 ? 'var(--success)' : card.pct > 70 ? 'var(--warning)' : 'var(--danger)',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
