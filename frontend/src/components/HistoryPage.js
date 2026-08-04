import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';
const BACKEND = API || 'http://localhost:3002';

const CATEGORY_META = {
  host:     { label: 'Host Monitor',  icon: '◈', color: '#38BDF8' },
  cctv:     { label: 'CCTV Camera',   icon: '📹', color: '#F59E0B' },
  unifi:    { label: 'UniFi',         icon: '🌐', color: '#22C55E' },
  ruijie:   { label: 'Ruijie',        icon: '🛜', color: '#A855F7' },
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
        axios.get(`${BACKEND}/api/history`, { params }),
        axios.get(`${BACKEND}/api/history/summary`),
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
      await axios.delete(`${BACKEND}/api/history`, { params });
      setConfirmClear(false);
      setPage(0);
      load();
    } catch (e) {}
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 84px)', background: '#080F1E' }}>

      {/* Toolbar */}
      <div style={{ background: '#0D1B2E', borderBottom: '1px solid #1E3A5F',
        padding: '8px 16px', display: 'flex', alignItems: 'center',
        gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>
            🕐 STATUS HISTORY
          </span>
          <span style={{ fontSize: 10, background: '#1E3A5F', color: '#94A3B8',
            padding: '2px 8px', borderRadius: 4 }}>{total} events</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: '#22C55E', cursor: 'pointer' }}/>
            <span style={{ fontSize: 10, color: '#64748B' }}>Auto-refresh</span>
          </label>

          <button onClick={load} disabled={loading}
            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
              background: 'transparent', color: '#64748B', border: '1px solid #1E3A5F',
              fontFamily: 'inherit' }}>
            {loading ? '⟳' : '↻'} Refresh
          </button>

          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)}
              style={{ fontSize: 10, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                background: '#EF444411', color: '#EF4444', border: '1px solid #EF444433',
                fontFamily: 'inherit' }}>
              🗑 Hapus Log
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleClearHistory}
                style={{ fontSize: 10, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                  background: '#EF4444', color: '#fff', border: 'none', fontWeight: 700,
                  fontFamily: 'inherit' }}>
                Yakin hapus?
              </button>
              <button onClick={() => setConfirmClear(false)}
                style={{ fontSize: 10, padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                  background: 'transparent', color: '#64748B', border: '1px solid #1E3A5F',
                  fontFamily: 'inherit' }}>
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, padding: '12px 16px 0' }}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const s = summary[key] || { totalEvents: 0, downEvents: 0, upEvents: 0, last24h: 0 };
            return (
              <div key={key}
                onClick={() => setCategory(category === key ? 'all' : key)}
                style={{
                  background: '#0A1628', border: `1px solid ${category === key ? meta.color + '66' : '#1E3A5F'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#475569' }}>
                    {s.last24h} / 24j
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#EF4444', fontFamily: 'JetBrains Mono' }}>
                      {s.downEvents}
                    </div>
                    <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em' }}>DOWN EVENTS</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#22C55E', fontFamily: 'JetBrains Mono' }}>
                      {s.upEvents}
                    </div>
                    <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em' }}>UP EVENTS</div>
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
          style={{ background: '#080F1E', border: '1px solid #1E3A5F', color: '#E2E8F0',
            padding: '6px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit',
            outline: 'none', width: 220 }}
        />

        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { v: 'all',      label: 'Semua' },
            { v: 'host',     label: '◈ Host' },
            { v: 'cctv',     label: '📹 CCTV' },
            { v: 'unifi',    label: '🌐 UniFi' },
            { v: 'ruijie',   label: '🛜 Ruijie' },
          ].map(c => (
            <button key={c.v} onClick={() => setCategory(c.v)}
              style={{ fontSize: 10, padding: '5px 11px', borderRadius: 5, cursor: 'pointer',
                background: category === c.v ? '#38BDF822' : 'transparent',
                color: category === c.v ? '#38BDF8' : '#64748B',
                border: `1px solid ${category === c.v ? '#38BDF844' : '#1E3A5F'}`,
                fontFamily: 'inherit', fontWeight: category === c.v ? 700 : 400 }}>
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { v: 'all',  label: 'Semua', color: '#64748B' },
            { v: 'UP',   label: '● UP',   color: '#22C55E' },
            { v: 'DOWN', label: '● DOWN', color: '#EF4444' },
          ].map(s => (
            <button key={s.v} onClick={() => setStatus(s.v)}
              style={{ fontSize: 10, padding: '5px 11px', borderRadius: 5, cursor: 'pointer',
                background: status === s.v ? s.color + '22' : 'transparent',
                color: status === s.v ? s.color : '#64748B',
                border: `1px solid ${status === s.v ? s.color + '44' : '#1E3A5F'}`,
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
            <div style={{ fontSize: 48, opacity: 0.12 }}>🕐</div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              {loading ? 'Memuat riwayat...' : 'Belum ada riwayat status'}
            </div>
            {!loading && (
              <div style={{ fontSize: 11, color: '#334155' }}>
                Riwayat akan muncul saat ada perubahan status ON/OFF
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {events.map((ev, i) => {
              const meta = CATEGORY_META[ev.category] || { label: ev.category, icon: '•', color: '#64748B' };
              const isUp = ev.status === 'UP';
              const sc = isUp ? '#22C55E' : '#EF4444';
              return (
                <div key={ev.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#0A1628', border: `1px solid ${sc}22`,
                    borderLeft: `3px solid ${sc}`, borderRadius: 8,
                    padding: '10px 14px',
                  }}>
                  {/* Status icon */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%',
                    background: sc + '15', border: `1.5px solid ${sc}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0 }}>
                    <span style={{ fontSize: 13 }}>{isUp ? '▲' : '▼'}</span>
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, color: meta.color, fontWeight: 700,
                        background: meta.color + '18', padding: '1px 6px', borderRadius: 4 }}>
                        {meta.icon} {meta.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>
                        {ev.entity_name}
                      </span>
                      <span style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono' }}>
                        {ev.entity_target}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: sc, fontWeight: 800, letterSpacing: '0.06em' }}>
                        {isUp ? 'KEMBALI ONLINE' : 'TERPUTUS / OFFLINE'}
                      </span>
                      {ev.latency != null && (
                        <span style={{ fontSize: 10, color: '#F59E0B' }}>{Math.round(ev.latency)}ms</span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'JetBrains Mono' }}>
                      {formatDateTime(ev.occurred_at)}
                    </div>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
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
          gap: 12, padding: '10px 16px', borderTop: '1px solid #1E3A5F', flexShrink: 0 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 5,
              background: 'transparent', color: page === 0 ? '#334155' : '#94A3B8',
              border: '1px solid #1E3A5F', cursor: page === 0 ? 'default' : 'pointer',
              fontFamily: 'inherit' }}>
            ← Sebelumnya
          </button>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'JetBrains Mono' }}>
            Halaman {page + 1} dari {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 5,
              background: 'transparent', color: page >= totalPages - 1 ? '#334155' : '#94A3B8',
              border: '1px solid #1E3A5F', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              fontFamily: 'inherit' }}>
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}
