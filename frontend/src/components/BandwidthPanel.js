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
        borderColor: 'var(--accent)',
        backgroundColor: 'rgba(99,102,241,0.05)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Upload',
        data: txData,
        borderColor: 'var(--info)',
        backgroundColor: 'rgba(59,130,246,0.04)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.35,
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
        backgroundColor: 'var(--card-2)',
        borderColor: 'var(--border)',
        borderWidth: 1,
        titleColor: 'var(--text)',
        bodyColor: 'var(--text-muted)',
        callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} KB/s` }
      }
    },
    scales: {
      x: { display: false },
      y: {
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--text-faint)', callback: v => `${v}K` },
        border: { color: 'var(--border)' },
        beginAtZero: true,
      }
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Bandwidth</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div style={{ width: 12, height: 3, background: 'var(--accent)', borderRadius: 999 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>DL</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 12, height: 3, background: 'var(--info)', borderRadius: 999 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>UL</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div style={{ background: 'var(--input-bg)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 700, marginBottom: 2 }}>↓ Download</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>
            {formatBytes(bandwidth.rx_sec || 0)}
          </div>
        </div>
        <div style={{ background: 'var(--input-bg)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 700, marginBottom: 2 }}>↑ Upload</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>
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
