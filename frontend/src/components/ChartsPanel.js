import React, { useEffect, useState, useCallback } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

const API = process.env.REACT_APP_API_URL || '';

ChartJS.defaults.color = '#64748B';
ChartJS.defaults.font.family = 'JetBrains Mono';
ChartJS.defaults.font.size = 10;

export default function ChartsPanel({ hosts, alerts }) {
  const [selectedHostId, setSelectedHostId] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set default selected host
  useEffect(() => {
    if (hosts.length > 0 && !selectedHostId) {
      setSelectedHostId(hosts[0].id);
    }
  }, [hosts, selectedHostId]);

  // Load latency history whenever selectedHostId changes
  const loadHistory = useCallback(async (hostId) => {
    if (!hostId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/hosts/${hostId}/history`);
      setLatencyHistory(res.data || []);
    } catch (e) {
      setLatencyHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedHostId) return;
    loadHistory(selectedHostId);
    const t = setInterval(() => loadHistory(selectedHostId), 15000);
    return () => clearInterval(t);
  }, [selectedHostId, loadHistory]);

  // Doughnut data
  const upCount = hosts.filter(h => h.status === 'UP').length;
  const downCount = hosts.filter(h => h.status === 'DOWN').length;
  const unknownCount = hosts.filter(h => !h.status || h.status === 'UNKNOWN').length;

  const doughnutData = {
    labels: ['UP', 'DOWN', 'UNKNOWN'],
    datasets: [{
      data: [upCount || 0, downCount || 0, unknownCount || 0],
      backgroundColor: ['#22C55E33', '#EF444433', '#64748B33'],
      borderColor: ['#22C55E', '#EF4444', '#64748B'],
      borderWidth: 2,
    }]
  };

  // Filter valid latency points
  const validHistory = latencyHistory.filter(l => l.latency != null && l.latency > 0);

  const latencyLabels = validHistory.map(l => {
    const d = new Date(l.checked_at);
    return isNaN(d) ? l.checked_at : d.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
  });
  const latencyValues = validHistory.map(l => parseFloat(l.latency).toFixed(1));

  const lineData = {
    labels: latencyLabels,
    datasets: [{
      label: 'Latency (ms)',
      data: latencyValues,
      borderColor: '#22C55E',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: true,
      tension: 0.4,
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#64748B',
        bodyColor: '#22C55E',
        padding: 10,
        callbacks: { label: ctx => ` ${ctx.parsed.y} ms` }
      }
    },
    scales: {
      x: {
        grid: { color: '#1a2744' },
        ticks: { maxTicksLimit: 8, color: '#475569', font: { size: 10 } },
        border: { color: '#334155' }
      },
      y: {
        grid: { color: '#1a2744' },
        ticks: { color: '#475569', callback: v => `${v}ms`, font: { size: 10 } },
        border: { color: '#334155' },
        beginAtZero: true,
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, color: '#64748B', font: { size: 11 } }
      },
      tooltip: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 }
    }
  };

  const selectedHost = hosts.find(h => h.id === selectedHostId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Latency Chart */}
      <div className="card xl:col-span-2 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>LATENCY HISTORY</span>
            <span style={{ fontSize: 10, color: '#475569', background: '#334155', padding: '2px 6px', borderRadius: 3 }}>1h</span>
            {loading && <span style={{ fontSize: 10, color: '#F59E0B' }}>loading...</span>}
            {!loading && validHistory.length > 0 && (
              <span style={{ fontSize: 10, color: '#475569' }}>{validHistory.length} data points</span>
            )}
          </div>
          {hosts.length > 0 && (
            <select
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#94A3B8', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              value={selectedHostId || ''}
              onChange={e => {
                setLatencyHistory([]);
                setSelectedHostId(parseInt(e.target.value));
              }}
            >
              {hosts.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.type === 'ip' ? 'ICMP' : 'HTTP'})</option>
              ))}
            </select>
          )}
        </div>

        {/* Selected host info */}
        {selectedHost && (
          <div className="flex items-center gap-4 mb-3 px-1">
            <span style={{ fontSize: 10, color: '#475569' }}>{selectedHost.target}</span>
            {selectedHost.status && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                background: selectedHost.status === 'UP' ? '#22C55E22' : '#EF444422',
                color: selectedHost.status === 'UP' ? '#22C55E' : '#EF4444',
              }}>
                {selectedHost.status}
              </span>
            )}
            {selectedHost.latency && (
              <span style={{ fontSize: 10, color: '#F59E0B' }}>
                Current: {Math.round(selectedHost.latency)}ms
              </span>
            )}
          </div>
        )}

        <div style={{ height: 180 }}>
          {validHistory.length > 0 ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📡</span>
              <span style={{ color: '#475569', fontSize: 12 }}>
                {loading ? 'Loading data...' : hosts.length === 0 ? 'Tambahkan host untuk monitoring' : 'Mengumpulkan data latency...'}
              </span>
              {!loading && hosts.length > 0 && (
                <span style={{ color: '#334155', fontSize: 11 }}>
                  Data muncul setelah beberapa siklus monitoring
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Host Status Doughnut */}
      <div className="card p-4">
        <div className="mb-4">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>HOST STATUS</span>
        </div>
        <div style={{ height: 200, position: 'relative' }}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div style={{
            position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none'
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#22C55E', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
              {hosts.length > 0 ? Math.round((upCount / hosts.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: 9, color: '#64748B', letterSpacing: '0.1em' }}>UPTIME</div>
          </div>
        </div>
      </div>
    </div>
  );
}
