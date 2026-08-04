import React, { useState } from 'react';

const INTERVALS = { 10: '10s', 30: '30s', 60: '1m', 180: '3m', 600: '10m' };

export default function MonitoringTable({ hosts, onEdit, onDelete, onDetail }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = hosts.filter(h => {
    if (filter === 'up' && h.status !== 'UP') return false;
    if (filter === 'down' && h.status !== 'DOWN') return false;
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.target.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="card" style={{ background: '#1E293B' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#334155' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>MONITORING</span>
          <span style={{ fontSize: 10, background: '#334155', color: '#94A3B8', padding: '2px 6px', borderRadius: 4 }}>
            {hosts.length} hosts
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            className="input"
            style={{ width: 160 }}
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {/* Filter tabs */}
          {['all', 'up', 'down'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                background: filter === f ? (f === 'up' ? '#22C55E22' : f === 'down' ? '#EF444422' : '#334155') : 'transparent',
                color: filter === f ? (f === 'up' ? '#22C55E' : f === 'down' ? '#EF4444' : '#E2E8F0') : '#64748B',
                border: `1px solid ${filter === f ? (f === 'up' ? '#22C55E44' : f === 'down' ? '#EF444444' : '#475569') : 'transparent'}`,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>NAME</th>
              <th>TARGET</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>LATENCY</th>
              <th>UPTIME</th>
              <th>LAST CHECK</th>
              <th>INTERVAL</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#475569', padding: '40px 0' }}>
                  {hosts.length === 0 ? '— No hosts configured. Add your first host. —' : '— No results —'}
                </td>
              </tr>
            ) : filtered.map(host => (
              <HostRow
                key={host.id}
                host={host}
                onEdit={onEdit}
                onDelete={onDelete}
                onDetail={onDetail}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HostRow({ host, onEdit, onDelete, onDetail }) {
  const statusColor = host.status === 'UP' ? '#22C55E' : host.status === 'DOWN' ? '#EF4444' : '#64748B';
  const uptimePct = parseFloat(host.uptime) || 0;
  const uptimeColor = uptimePct > 90 ? '#22C55E' : uptimePct > 70 ? '#F59E0B' : '#EF4444';

  const lastCheck = host.lastCheck
    ? new Date(host.lastCheck).toLocaleTimeString('id-ID', { hour12: false })
    : '—';

  return (
    <tr className="slide-in" style={{ cursor: 'pointer' }} onClick={() => onDetail(host)}>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: statusColor }} />
          <span style={{ fontWeight: 600, color: '#E2E8F0' }}>{host.name}</span>
        </div>
      </td>
      <td style={{ color: '#94A3B8', fontSize: 11 }}>{host.target}</td>
      <td>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.08em',
          background: host.type === 'ip' ? '#38BDF822' : '#A855F722',
          color: host.type === 'ip' ? '#38BDF8' : '#A855F7',
          border: `1px solid ${host.type === 'ip' ? '#38BDF833' : '#A855F733'}`,
        }}>
          {host.type === 'ip' ? 'ICMP' : 'HTTP'}
        </span>
      </td>
      <td>
        <span className={`badge badge-${host.status === 'UP' ? 'up' : host.status === 'DOWN' ? 'down' : 'unknown'}`}>
          <span>{host.status === 'UP' ? '●' : host.status === 'DOWN' ? '●' : '○'}</span>
          {host.status || 'UNKNOWN'}
        </span>
      </td>
      <td>
        {host.latency != null
          ? <span style={{ color: host.latency < 100 ? '#22C55E' : host.latency < 300 ? '#F59E0B' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(host.latency)}ms
            </span>
          : <span style={{ color: '#475569' }}>—</span>
        }
      </td>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: '#334155' }}>
            <div className="h-full rounded-full" style={{ width: `${uptimePct}%`, background: uptimeColor, transition: 'width 0.5s' }} />
          </div>
          <span style={{ color: uptimeColor, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{host.uptime}%</span>
        </div>
      </td>
      <td style={{ color: '#64748B', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{lastCheck}</td>
      <td style={{ color: '#64748B', fontSize: 11 }}>{INTERVALS[host.interval] || `${host.interval}s`}</td>
      <td onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(host)}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#334155', color: '#94A3B8', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            EDIT
          </button>
          <button
            onClick={() => onDelete(host.id)}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#EF444411', color: '#EF4444', border: '1px solid #EF444422', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            DEL
          </button>
        </div>
      </td>
    </tr>
  );
}
