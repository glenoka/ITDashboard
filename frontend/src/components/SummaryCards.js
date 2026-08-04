import React from 'react';

export default function SummaryCards({ stats }) {
  const cards = [
    {
      label: 'TOTAL HOSTS',
      value: stats.total,
      icon: '◈',
      color: '#38BDF8',
      bg: '#38BDF822',
      border: '#38BDF833',
    },
    {
      label: 'HOSTS UP',
      value: stats.up,
      icon: '▲',
      color: '#22C55E',
      bg: '#22C55E22',
      border: '#22C55E33',
    },
    {
      label: 'HOSTS DOWN',
      value: stats.down,
      icon: '▼',
      color: '#EF4444',
      bg: '#EF444422',
      border: '#EF444433',
    },
    {
      label: 'AVAILABILITY',
      value: `${stats.availability}%`,
      icon: '◎',
      color: '#22C55E',
      bg: '#22C55E11',
      border: '#22C55E22',
      isPercent: true,
      pct: parseFloat(stats.availability),
    },
    {
      label: 'AVG LATENCY',
      value: `${stats.avgLatency}ms`,
      icon: '⟳',
      color: '#F59E0B',
      bg: '#F59E0B22',
      border: '#F59E0B33',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="card card-hover p-4 fade-in"
          style={{ animationDelay: `${i * 60}ms`, borderColor: card.border }}
        >
          <div className="flex items-start justify-between mb-3">
            <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em' }}>{card.label}</span>
            <span style={{ fontSize: 18, color: card.color, opacity: 0.7 }}>{card.icon}</span>
          </div>

          <div style={{ fontSize: 28, fontWeight: 700, color: card.color, fontFamily: 'Syne, sans-serif', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {card.value}
          </div>

          {card.isPercent && (
            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: '#334155' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, card.pct)}%`,
                  background: card.pct > 90 ? '#22C55E' : card.pct > 70 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
