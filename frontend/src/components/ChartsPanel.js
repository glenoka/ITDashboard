import React, { useEffect, useState, useCallback } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

const API = process.env.REACT_APP_API_URL || '';

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#64748B';
}

export default function ChartsPanel({ hosts, alerts }) {
  const { theme } = useTheme();
  const [selectedHostId, setSelectedHostId] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const accent = cssVar('--accent');
  const danger = cssVar('--danger');
  const success = cssVar('--success');
  const muted = cssVar('--text-muted');
  const faint = cssVar('--text-faint');
  const text = cssVar('--text');
  const border = cssVar('--border');
  const card2 = cssVar('--card-2');
  const info = cssVar('--info');
  const warning = cssVar('--warning');

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
    labels: ['Up', 'Down', 'Unknown'],
    datasets: [{
      data: [upCount || 0, downCount || 0, unknownCount || 0],
      backgroundColor: [success + '33', danger + '33', muted + '33'],
      borderColor: [success, danger, muted],
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
      borderColor: accent,
      backgroundColor: accent + '0A',
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: true,
      tension: 0.35,
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
        backgroundColor: card2,
        borderColor: border,
        borderWidth: 1,
        titleColor: muted,
        bodyColor: text,
        padding: 10,
        callbacks: { label: ctx => ` ${ctx.parsed.y} ms` }
      }
    },
    scales: {
      x: {
        grid: { color: 'transparent' },
        ticks: { maxTicksLimit: 8, color: faint, font: { size: 10 } },
        border: { color: border }
      },
      y: {
        grid: { color: border },
        ticks: { color: faint, callback: v => `${v}ms`, font: { size: 10 } },
        border: { color: border },
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
        labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, color: muted, font: { size: 11 } }
      },
      tooltip: { backgroundColor: card2, borderColor: border, borderWidth: 1, titleColor: text, bodyColor: text }
    }
  };

  const selectedHost = hosts.find(h => h.id === selectedHostId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Latency Chart */}
      <div className="card xl:col-span-2 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Riwayat Latency</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--hover)', padding: '2px 8px', borderRadius: 999 }}>1 jam</span>
            {loading && <span style={{ fontSize: 10, color: 'var(--warning)' }}>memuat...</span>}
            {!loading && validHistory.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{validHistory.length} titik data</span>
            )}
          </div>
          {hosts.length > 0 && (
            <select
              className="input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
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
          <div className="flex items-center gap-4 mb-3 px-1 flex-wrap">
            <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>{selectedHost.target}</span>
            {selectedHost.status && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: selectedHost.status === 'UP' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: selectedHost.status === 'UP' ? 'var(--success)' : 'var(--danger)',
              }}>
                {selectedHost.status === 'UP' ? 'Up' : 'Down'}
              </span>
            )}
            {selectedHost.latency && (
              <span style={{ fontSize: 10, color: 'var(--warning)' }}>
                Saat ini: {Math.round(selectedHost.latency)}ms
              </span>
            )}
          </div>
        )}

        <div style={{ height: 180 }}>
          {validHistory.length > 0 ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <Icon name="RadioTower" size={22} color="var(--text-faint)" />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {loading ? 'Memuat data...' : hosts.length === 0 ? 'Tambahkan host untuk monitoring' : 'Mengumpulkan data latency...'}
              </span>
              {!loading && hosts.length > 0 && (
                <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
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
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Status Host</span>
        </div>
        <div style={{ height: 200, position: 'relative' }}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div style={{
            position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {hosts.length > 0 ? Math.round((upCount / hosts.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>UPTIME</div>
          </div>
        </div>
      </div>
    </div>
  );
}
