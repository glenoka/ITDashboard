import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

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

  const statusColor = host.status === 'UP' ? '#22C55E' : host.status === 'DOWN' ? '#EF4444' : '#64748B';

  const lineData = {
    labels: history.map(l => new Date(l.checked_at).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'Latency (ms)',
      data: history.map(l => l.latency),
      borderColor: '#22C55E',
      backgroundColor: 'rgba(34, 197, 94, 0.06)',
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
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        bodyColor: '#22C55E',
      }
    },
    scales: {
      x: { grid: { color: '#0F172A' }, ticks: { color: '#475569', maxTicksLimit: 6 }, border: { color: '#334155' } },
      y: { grid: { color: '#0F172A' }, ticks: { color: '#475569', callback: v => `${v}ms` }, border: { color: '#334155' }, beginAtZero: true }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b" style={{ borderColor: '#334155' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: statusColor }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#E2E8F0' }}>{host.name}</span>
              <span style={{ fontSize: 10, background: '#334155', color: '#94A3B8', padding: '2px 6px', borderRadius: 3 }}>
                {host.type === 'ip' ? 'ICMP' : 'HTTP'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'JetBrains Mono' }}>{host.target}</div>
          </div>
          <button onClick={onClose} style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: '#334155' }}>
          {[
            { label: 'STATUS', value: host.status || 'UNKNOWN', color: statusColor },
            { label: 'LATENCY', value: host.latency ? `${Math.round(host.latency)}ms` : '—', color: '#F59E0B' },
            { label: 'UPTIME', value: `${host.uptime}%`, color: parseFloat(host.uptime) > 90 ? '#22C55E' : '#EF4444' },
            { label: 'DOWNTIMES', value: downtimes.length, color: '#64748B' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid #334155' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Latency chart */}
        <div className="p-5">
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', marginBottom: 12 }}>LATENCY — LAST 1 HOUR</div>
          <div style={{ height: 140 }}>
            {history.length > 0
              ? <Line data={lineData} options={lineOptions} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: 12 }}>
                  No data yet
                </div>
            }
          </div>
        </div>

        {/* Downtime log */}
        {downtimes.length > 0 && (
          <div className="px-5 pb-5">
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', marginBottom: 8 }}>RECENT DOWNTIME LOG</div>
            <div style={{ maxHeight: 150, overflowY: 'auto', background: '#0F172A', borderRadius: 6, border: '1px solid #334155' }}>
              {downtimes.slice(0, 10).map((d, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: i < downtimes.length - 1 ? '1px solid #1E293B' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#EF4444' }}>⚠ DOWN</span>
                  <span style={{ fontSize: 10, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
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
