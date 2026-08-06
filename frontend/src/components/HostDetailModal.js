import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export default function HostDetailModal({ host, onClose }) {
  const [history, setHistory] = useState([]);
  const [downtimes, setDowntimes] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, d] = await Promise.all([
          axios.get(`${API}/api/hosts/${host.id}/history`),
          axios.get(`${API}/api/hosts/${host.id}/downtimes`),
        ]);
        setHistory(h.data);
        setDowntimes(d.data);
      } catch (e) {}
    };
    load();
  }, [host.id]);

  const statusColor = host.status === 'UP' ? 'var(--success)' : host.status === 'DOWN' ? 'var(--danger)' : 'var(--text-muted)';
  const accent = cssVar('--accent', '#635BFF');

  const lineData = {
    labels: history.map(l => new Date(l.checked_at).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'Latency (ms)',
      data: history.map(l => l.latency),
      borderColor: accent,
      backgroundColor: `${accent}0F`,
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      tension: 0.4,
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--card-2', '#1E293B'),
        borderColor: cssVar('--border', '#334155'),
        borderWidth: 1,
        bodyColor: accent,
        titleColor: cssVar('--text', '#E2E8F0'),
      }
    },
    scales: {
      x: { grid: { color: cssVar('--input-bg', '#0F172A') }, ticks: { color: cssVar('--text-faint', '#475569'), maxTicksLimit: 6 }, border: { color: cssVar('--border', '#334155') } },
      y: { grid: { color: cssVar('--input-bg', '#0F172A') }, ticks: { color: cssVar('--text-faint', '#475569'), callback: v => `${v}ms` }, border: { color: cssVar('--border', '#334155') }, beginAtZero: true }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pop-in" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: statusColor }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{host.name}</span>
              <span style={{ fontSize: 10, background: 'var(--hover)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: 999, fontFamily: 'var(--mono)' }}>
                {host.type === 'ip' ? 'ICMP' : 'HTTP'}
              </span>
              {host.category && (
                <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', padding: '3px 8px', borderRadius: 999, fontFamily: 'var(--mono)' }}>
                  {host.category}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{host.target}</div>
          </div>
          <button onClick={onClose} title="Tutup" style={{ color: 'var(--text-muted)', background: 'var(--hover)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="X" size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Status', value: host.status || 'UNKNOWN', color: statusColor },
            { label: 'Latency', value: host.latency ? `${Math.round(host.latency)}ms` : '—', color: 'var(--warning)' },
            { label: 'Uptime', value: `${host.uptime}%`, color: parseFloat(host.uptime) > 90 ? 'var(--success)' : 'var(--danger)' },
            { label: 'Downtimes', value: downtimes.length, color: 'var(--text-muted)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Latency chart */}
        <div className="p-5">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 12 }}>Latency — 1 Jam Terakhir</div>
          <div style={{ height: 140 }}>
            {history.length > 0
              ? <Line data={lineData} options={lineOptions} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontSize: 12.5 }}>
                  Belum ada data
                </div>
            }
          </div>
        </div>

        {/* Downtime log */}
        {downtimes.length > 0 && (
          <div className="px-5 pb-5">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>Log Downtime Terbaru</div>
            <div style={{ maxHeight: 150, overflowY: 'auto', background: 'var(--input-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              {downtimes.slice(0, 10).map((d, i) => (
                <div key={i} style={{ padding: '9px 12px', borderBottom: i < downtimes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="AlertTriangle" size={11} /> Down</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(d.checked_at).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
