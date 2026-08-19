import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

const CATEGORY_META = {
  host:     { label: 'Host Monitor',  icon: 'Monitor', color: 'var(--info)' },
  cctv:     { label: 'CCTV Camera',   icon: 'Video', color: 'var(--warning)' },
  unifi:    { label: 'UniFi',         icon: 'Network', color: 'var(--success)' },
  ruijie:   { label: 'Ruijie',        icon: 'Router', color: 'var(--violet)' },
};

function formatDuration(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}d`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}d`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return `${h}j ${mm}m`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return `${d}h ${hh}j`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return '';
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 5) return 'baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;
  return `${Math.floor(diffSec / 86400)}h lalu`;
}

export default function HistoryPage({ wsRef }) {
  const [events, setEvents]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('all');
  const [status, setStatus]       = useState('all');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]           = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const pageSize = 50;
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        category, status,
        limit: pageSize, offset: page * pageSize,
      };
      if (search) params.search = search;
      const [evRes, sumRes] = await Promise.all([
        axios.get(`${API}/api/history`, { params }),
        axios.get(`${API}/api/history/summary`),
      ]);
      setEvents(evRes.data.events || []);
      setTotal(evRes.data.total || 0);
      setSummary(sumRes.data);
    } catch (e) {
      setEvents([]);
    }
    setLoading(false);
  }, [category, status, search, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [category, status, search]);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Auto-refresh every 10s if enabled and on first page
  useEffect(() => {
    if (!autoRefresh || page !== 0) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, page, load]);

  // Listen for realtime alerts via WebSocket to prepend new events live
  useEffect(() => {
    const handleMsg = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'alert' && page === 0 && autoRefresh) {
          // Just trigger a reload — simplest way to stay consistent with filters
          load();
        }
      } catch (err) {}
    };
    const ws = wsRef?.current;
    if (ws) ws.addEventListener('message', handleMsg);
    return () => { if (ws) ws.removeEventListener('message', handleMsg); };
  }, [wsRef, page, autoRefresh, load]);

  const handleClearHistory = async () => {
    try {
      const params = category !== 'all' ? { category } : {};
      await axios.delete(`${API}/api/history`, { params });
      setConfirmClear(false);
      setPage(0);
      load();
    } catch (e) {}
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 84px)', background: 'var(--bg)' }}>

      {/* Toolbar */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '8px 16px', display: 'flex', alignItems: 'center',
        gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="History" size={14} color="var(--text)" />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.04em' }}>
            Status History
          </span>
          <span style={{ fontSize: 10, background: 'var(--hover)', color: 'var(--text-muted)',
            padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--mono)' }}>{total} events</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}/>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Auto-refresh</span>
          </label>

          <button onClick={load} disabled={loading} className="btn-ghost"
            style={{ fontSize: 10.5, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="RefreshCw" size={12} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)} className="btn-danger"
              style={{ fontSize: 10.5, padding: '5px 12px', background: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="Trash2" size={12} />
              Hapus Log
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleClearHistory}
                style={{ fontSize: 10.5, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                  background: 'var(--danger)', color: '#fff', border: 'none', fontWeight: 700,
                  fontFamily: 'inherit' }}>
                Yakin hapus?
              </button>
              <button onClick={() => setConfirmClear(false)} className="btn-ghost"
                style={{ fontSize: 10.5, padding: '5px 12px' }}>
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 10, padding: '12px 16px 0' }}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const s = summary[key] || { totalEvents: 0, downEvents: 0, upEvents: 0, last24h: 0 };
            return (
              <div key={key}
                onClick={() => setCategory(category === key ? 'all' : key)}
                style={{
                  background: 'var(--card)', border: `1px solid ${category === key ? meta.color + '66' : 'var(--border)'}`,
                  borderRadius: 14, padding: '12px 14px', cursor: 'pointer', boxShadow: 'var(--shadow)',
                  transition: 'border-color 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon name={meta.icon} size={14} color={meta.color} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
                    {s.last24h} / 24j
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--mono)' }}>
                      {s.downEvents}
                    </div>
                    <div style={{ fontSize: 8.5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>DOWN EVENTS</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--mono)' }}>
                      {s.upEvents}
                    </div>
                    <div style={{ fontSize: 8.5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>UP EVENTS</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Cari nama device / IP..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '7px 12px', borderRadius: 999, fontSize: 11.5, fontFamily: 'inherit',
            outline: 'none', width: 220, maxWidth: '100%' }}
        />

        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { v: 'all',      label: 'Semua',   icon: null },
            { v: 'host',     label: 'Host',    icon: 'Monitor' },
            { v: 'cctv',     label: 'CCTV',    icon: 'Video' },
            { v: 'unifi',    label: 'UniFi',   icon: 'Network' },
            { v: 'ruijie',   label: 'Ruijie',  icon: 'Router' },
          ].map(c => (
            <button key={c.v} onClick={() => setCategory(c.v)}
              style={{ fontSize: 10.5, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                background: category === c.v ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: category === c.v ? 'var(--info)' : 'var(--text-muted)',
                border: `1px solid ${category === c.v ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
                fontFamily: 'inherit', fontWeight: category === c.v ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 5 }}>
              {c.icon && <Icon name={c.icon} size={11} />}
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { v: 'all',     label: 'Semua', color: 'var(--text-muted)' },
            { v: 'UP',      label: '● UP',   color: 'var(--success)' },
            { v: 'DOWN',    label: '● DOWN', color: 'var(--danger)' },
            { v: 'RESTART', label: '⟳ RESTART', color: 'var(--violet)' },
          ].map(s => (
            <button key={s.v} onClick={() => setStatus(s.v)}
              style={{ fontSize: 10.5, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                background: status === s.v ? s.color + '22' : 'transparent',
                color: status === s.v ? s.color : 'var(--text-muted)',
                border: `1px solid ${status === s.v ? s.color + '44' : 'var(--border)'}`,
                fontFamily: 'inherit', fontWeight: status === s.v ? 700 : 400 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {events.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10 }}>
            <div style={{ opacity: 0.12, display: 'flex' }}><Icon name="History" size={44} color="var(--text-faint)" /></div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {loading ? 'Memuat riwayat...' : 'Belum ada riwayat status'}
            </div>
            {!loading && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                Riwayat akan muncul saat ada perubahan status ON/OFF
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {events.map((ev, i) => {
              const meta = CATEGORY_META[ev.category] || { label: ev.category, icon: '•', color: 'var(--text-muted)' };
              const isRestart = ev.status === 'RESTART';
              const isUp = ev.status === 'UP';
              const sc = isRestart ? 'var(--violet)' : (isUp ? 'var(--success)' : 'var(--danger)');
              return (
                <div key={ev.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--card)', border: `1px solid ${sc}22`,
                    borderLeft: `3px solid ${sc}`, borderRadius: 12, boxShadow: 'var(--shadow)',
                    padding: '10px 14px',
                  }}>
                  {/* Status icon */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%',
                    background: sc + '15', border: `1.5px solid ${sc}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0 }}>
                    <Icon name={isRestart ? 'RotateCw' : (isUp ? 'ArrowUp' : 'ArrowDown')} size={13} color={sc} />
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, color: meta.color, fontWeight: 700,
                        background: meta.color + '18', padding: '2px 7px', borderRadius: 999,
                        display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name={meta.icon} size={9} />
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {ev.entity_name}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
                        {ev.entity_target}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: sc, fontWeight: 800, letterSpacing: '0.04em' }}>
                        {isRestart ? 'RESTART DIMULAI' : (isUp ? 'KEMBALI ONLINE' : 'TERPUTUS / OFFLINE')}
                      </span>
                      {ev.latency != null && (
                        <span style={{ fontSize: 10, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>{Math.round(ev.latency)}ms</span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {formatDateTime(ev.occurred_at)}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
                      {relativeTime(ev.occurred_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 999,
              background: 'transparent', color: page === 0 ? 'var(--text-faint)' : 'var(--text-muted)',
              border: '1px solid var(--border)', cursor: page === 0 ? 'default' : 'pointer',
              fontFamily: 'inherit' }}>
            ← Sebelumnya
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            Halaman {page + 1} dari {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 999,
              background: 'transparent', color: page >= totalPages - 1 ? 'var(--text-faint)' : 'var(--text-muted)',
              border: '1px solid var(--border)', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              fontFamily: 'inherit' }}>
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}
