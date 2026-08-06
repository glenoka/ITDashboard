import React, { useState } from 'react';

const INTERVALS = { 10: '10s', 30: '30s', 60: '1m', 180: '3m', 600: '10m' };

export default function MonitoringTable({ hosts, onEdit, onDelete, onDetail, onAdd }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = hosts.filter(h => {
    if (filter === 'up' && h.status !== 'UP') return false;
    if (filter === 'down' && h.status !== 'DOWN') return false;
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.target.toLowerCase().includes(search.toLowerCase()) && !(h.category || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="card" style={{ background: 'var(--card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Monitoring</span>
          <span style={{ fontSize: 10, background: 'var(--hover)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 999 }}>
            {hosts.length} hosts
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add host */}
          {onAdd && (
            <button className="btn-primary flex items-center gap-1.5" onClick={onAdd}
              style={{ fontSize: 11, padding: '5px 12px' }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Host
            </button>
          )}
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
                fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 999,
                background: filter === f ? (f === 'up' ? 'rgba(16,185,129,0.12)' : f === 'down' ? 'rgba(239,68,68,0.12)' : 'var(--hover)') : 'transparent',
                color: filter === f ? (f === 'up' ? 'var(--success)' : f === 'down' ? 'var(--danger)' : 'var(--text)') : 'var(--text-muted)',
                border: `1px solid ${filter === f ? (f === 'up' ? 'rgba(16,185,129,0.35)' : f === 'down' ? 'rgba(239,68,68,0.35)' : 'var(--border-strong)') : 'transparent'}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {f === 'all' ? 'Semua' : f === 'up' ? 'Up' : 'Down'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Tipe</th>
              <th>Target</th>
              <th>Metode</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Uptime</th>
              <th>Last Check</th>
              <th>Interval</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '40px 0' }}>
                  {hosts.length === 0 ? 'Belum ada host. Tambahkan host pertama Anda.' : 'Tidak ada hasil.'}
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
  const statusColor = host.status === 'UP' ? 'var(--success)' : host.status === 'DOWN' ? 'var(--danger)' : 'var(--text-muted)';
  const uptimePct = parseFloat(host.uptime) || 0;
  const uptimeColor = uptimePct > 90 ? 'var(--success)' : uptimePct > 70 ? 'var(--warning)' : 'var(--danger)';

  const lastCheck = host.lastCheck
    ? new Date(host.lastCheck).toLocaleTimeString('id-ID', { hour12: false })
    : '—';

  return (
    <tr className="slide-in" style={{ cursor: 'pointer' }} onClick={() => onDetail(host)}>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: statusColor }} />
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{host.name}</span>
        </div>
      </td>
      <td>
        {host.category ? (
          <span style={{
            fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.04em', whiteSpace: 'nowrap',
            background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
            border: '1px solid rgba(16,185,129,0.30)',
          }}>
            {host.category}
          </span>
        ) : (
          <span style={{ color: 'var(--text-faint)' }}>—</span>
        )}
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--mono)' }}>{host.target}</td>
      <td>
        <span style={{
          fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.04em',
          background: host.type === 'ip' ? 'rgba(59,130,246,0.12)' : 'rgba(167,139,250,0.12)',
          color: host.type === 'ip' ? 'var(--info)' : 'var(--violet)',
          border: `1px solid ${host.type === 'ip' ? 'rgba(59,130,246,0.30)' : 'rgba(167,139,250,0.30)'}`,
        }}>
          {host.type === 'ip' ? 'ICMP' : 'HTTP'}
        </span>
      </td>
      <td>
        <span className={`badge badge-${host.status === 'UP' ? 'up' : host.status === 'DOWN' ? 'down' : 'unknown'}`}>
          <span>{host.status === 'UP' ? '●' : host.status === 'DOWN' ? '●' : '○'}</span>
          {host.status === 'UP' ? 'Up' : host.status === 'DOWN' ? 'Down' : 'Unknown'}
        </span>
      </td>
      <td>
        {host.latency != null
          ? <span style={{ color: host.latency < 100 ? 'var(--success)' : host.latency < 300 ? 'var(--warning)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>
              {Math.round(host.latency)}ms
            </span>
          : <span style={{ color: 'var(--text-faint)' }}>—</span>
        }
      </td>
      <td>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full" style={{ width: `${uptimePct}%`, background: uptimeColor, transition: 'width 0.5s' }} />
          </div>
          <span style={{ color: uptimeColor, fontSize: 11, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>{host.uptime}%</span>
        </div>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>{lastCheck}</td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--mono)' }}>{INTERVALS[host.interval] || `${host.interval}s`}</td>
      <td onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(host)}
            className="btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(host.id)}
            className="btn-danger"
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}
