import React from 'react';
import { Line } from 'react-chartjs-2';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1048576).toFixed(2)} MB/s`;
}

export default function BandwidthPanel({ bandwidth, history }) {
  const labels = history.map((_, i) => '');
  const rxData = history.map(h => (h.rx_sec || 0) / 1024);
  const txData = history.map(h => (h.tx_sec || 0) / 1024);

  const data = {
    labels,
    datasets: [
      {
        label: 'Download',
        data: rxData,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34,197,94,0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Upload',
        data: txData,
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56,189,248,0.05)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} KB/s` }
      }
    },
    scales: {
      x: { display: false },
      y: {
        grid: { color: '#1E293B' },
        ticks: { color: '#475569', callback: v => `${v}K` },
        border: { color: '#334155' },
        beginAtZero: true,
      }
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>BANDWIDTH</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div style={{ width: 8, height: 2, background: '#22C55E', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: '#64748B' }}>DL</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 8, height: 2, background: '#38BDF8', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: '#64748B' }}>UL</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div style={{ background: '#0F172A', borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontSize: 9, color: '#64748B', letterSpacing: '0.08em', marginBottom: 2 }}>↓ DOWNLOAD</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', fontVariantNumeric: 'tabular-nums' }}>
            {formatBytes(bandwidth.rx_sec || 0)}
          </div>
        </div>
        <div style={{ background: '#0F172A', borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontSize: 9, color: '#64748B', letterSpacing: '0.08em', marginBottom: 2 }}>↑ UPLOAD</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', fontVariantNumeric: 'tabular-nums' }}>
            {formatBytes(bandwidth.tx_sec || 0)}
          </div>
        </div>
      </div>

      <div style={{ height: 80 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
