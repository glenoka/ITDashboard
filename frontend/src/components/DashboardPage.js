import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

export default function DashboardPage({ onNavigate }) {
  const [hosts, setHosts] = useState([]);
  const [cctv, setCctv] = useState([]);
  const [unifiDevices, setUnifiDevices] = useState([]);
  const [ruijieDevices, setRuijieDevices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [hostsRes, cctvRes, unifiRes, ruijieRes, ordersRes, projectsRes] = await Promise.allSettled([
        axios.get(`${API}/api/hosts`),
        axios.get(`${API}/api/cctv`),
        axios.get(`${API}/api/unifi/devices`),
        axios.get(`${API}/api/ruijie/devices`),
        axios.get(`${API}/api/orders`),
        axios.get(`${API}/api/checklist/projects`),
      ]);
      if (hostsRes.status === 'fulfilled') setHosts(hostsRes.value.data || []);
      if (cctvRes.status === 'fulfilled') setCctv(cctvRes.value.data || []);
      if (unifiRes.status === 'fulfilled') setUnifiDevices(unifiRes.value.data?.devices || []);
      if (ruijieRes.status === 'fulfilled') setRuijieDevices(ruijieRes.value.data?.devices || []);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data?.orders || []);
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data?.tasks || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    timerRef.current = setInterval(load, 15000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(timerRef.current); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  const downHosts = hosts.filter(h => h.status === 'DOWN');
  const downCctv = cctv.filter(c => c.online === false);
  const downUnifi = unifiDevices.filter(d => d.online === false);
  const downRuijie = ruijieDevices.filter(d => d.online === false);

  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const oldOrders = orders.filter(o => {
    if (o.status === 'arrived' || o.status === 'cancelled') return false;
    const d = o.order_date ? new Date(o.order_date).getTime() : new Date(o.created_at).getTime();
    return d < twoWeeksAgo;
  });

  const activeProjects = projects.filter(p => !p.completed);

  const toggleProject = (task) => {
    setSavingId(task.id);
    axios.post(`${API}/api/checklist/projects/${task.id}/toggle`, { completed: !task.completed })
      .then(() => load())
      .catch(() => {})
      .finally(() => setSavingId(null));
  };

  const addQuickProject = (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    setQuickAddSaving(true);
    axios.post(`${API}/api/checklist/projects`, { title: quickAdd.trim() })
      .then(() => { setQuickAdd(''); load(); })
      .catch(() => {})
      .finally(() => setQuickAddSaving(false));
  };

  const downCount = downHosts.length + downCctv.length + downUnifi.length + downRuijie.length;
  const allOk = downCount === 0 && oldOrders.length === 0;

  const daysSince = (dateStr) => {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
      {/* All OK banner */}
      {allOk && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.30)',
          borderRadius: 12, marginBottom: 12 }}>
          <Icon name="CheckCircle2" size={18} color="var(--success)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Semua normal</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tidak ada device yang down, semua berjalan dengan baik.</div>
          </div>
        </div>
      )}

      {/* ── PROJECT CHECKLIST (TOP) ─────────────────────────────── */}
      <SectionHeader icon="FolderKanban" label="Checklist Project"
        count={activeProjects.length} countColor="var(--info)"
        actionLabel="Lihat Semua" actionOnClick={() => onNavigate('checklist')} />

      {/* Quick add */}
      <form onSubmit={addQuickProject}
        style={{ display: 'flex', gap: 6, background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
        <Icon name="Plus" size={14} color="var(--text-faint)" style={{ flexShrink: 0, marginTop: 1 }} />
        <input value={quickAdd} onChange={e => setQuickAdd(e.target.value)}
          placeholder="Tambah task baru..." disabled={quickAddSaving}
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text)',
            fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
      </form>

      {activeProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0 16px', color: 'var(--text-faint)', fontSize: 11.5 }}>
          Tidak ada project aktif
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
          {activeProjects.slice(0, 8).map(task => (
            <div key={task.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
              <button onClick={() => toggleProject(task)} disabled={savingId === task.id}
                title="Tandai selesai"
                style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                  background: 'transparent', border: '1.5px solid var(--info)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                {task.note && <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.note}</div>}
              </div>
            </div>
          ))}
          {activeProjects.length > 8 && (
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textAlign: 'center', padding: '6px 0' }}>
              +{activeProjects.length - 8} lainnya
            </div>
          )}
        </div>
      )}

      {/* ── SUMMARY CHIPS ───────────────────────────────────────── */}
      {downCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <DownChip icon="Monitor" label="Jaringan" count={downHosts.length} color="var(--danger)" onClick={() => onNavigate('hosts')} />
          <DownChip icon="Video" label="CCTV" count={downCctv.length} color="var(--warning)" onClick={() => onNavigate('cctv')} />
          <DownChip icon="Network" label="UniFi" count={downUnifi.length} color="var(--violet)" onClick={() => onNavigate('unifi')} />
          <DownChip icon="Router" label="Ruijie" count={downRuijie.length} color="var(--pink)" onClick={() => onNavigate('ruijie')} />
          {oldOrders.length > 0 && (
            <DownChip icon="Package" label="PR Lama" count={oldOrders.length} color="var(--info)" onClick={() => onNavigate('procurement')} />
          )}
        </div>
      )}

      {/* ── DOWN LISTS GRID ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
        <DownCard icon="Monitor" title="Jaringan Down" count={downHosts.length}
          color="var(--danger)" onMore={() => onNavigate('hosts')}
          items={downHosts.map(h => ({ id: h.id, name: h.name, sub: h.target,
            badge: h.latency ? `${Math.round(h.latency)}ms` : null }))} />

        <DownCard icon="Video" title="CCTV Down" count={downCctv.length}
          color="var(--warning)" onMore={() => onNavigate('cctv')}
          items={downCctv.map(c => ({ id: c.id, name: c.name, sub: c.ip,
            badge: c.location || null }))} />

        <DownCard icon="Network" title="UniFi Down" count={downUnifi.length}
          color="var(--violet)" onMore={() => onNavigate('unifi')}
          items={downUnifi.map(d => ({ id: d.mac || d.id, name: d.name, sub: d.ip || d.model || '-',
            badge: d.type || null }))} />

        <DownCard icon="Router" title="Ruijie Down" count={downRuijie.length}
          color="var(--pink)" onMore={() => onNavigate('ruijie')}
          items={downRuijie.map(d => ({ id: d.mac || d.id, name: d.name, sub: d.ip || d.model || '-',
            badge: d.type || null }))} />

        <DownCard icon="Package" title="PR/Order > 2 Minggu" count={oldOrders.length}
          color="var(--info)" onMore={() => onNavigate('procurement')}
          items={oldOrders.map(o => ({ id: o.id, name: o.item_name,
            sub: `${o.no_pr || ''}${o.vendor ? ' — ' + o.vendor : ''}`.trim(),
            badge: `${daysSince(o.order_date || o.created_at)}h` }))} />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-faint)', fontSize: 12 }}>Memuat...</div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, count, countColor, actionLabel, actionOnClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Icon name={icon} size={15} color={countColor || 'var(--text-muted)'} />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
      {count > 0 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: countColor, background: countColor + '18',
          padding: '2px 8px', borderRadius: 999, fontFamily: 'var(--mono)' }}>{count}</span>
      )}
      {actionLabel && (
        <button onClick={actionOnClick}
          style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--accent)', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function DownChip({ icon, label, count, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999,
        background: color + '12', border: `1px solid ${color}44`, color,
        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'transform 0.1s' }}>
      <Icon name={icon} size={12} />
      {label}
      <span style={{ fontFamily: 'var(--mono)' }}>{count}</span>
    </button>
  );
}

function DownCard({ icon, title, count, color, items, onMore }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderBottom: '1px solid var(--border)', background: 'var(--card-2)' }}>
        <Icon name={icon} size={14} color={count > 0 ? color : 'var(--text-faint)'} />
        <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)',
          color: count > 0 ? color : 'var(--success)', background: count > 0 ? color + '18' : 'rgba(16,185,129,0.12)',
          padding: '2px 10px', borderRadius: 999 }}>{count}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200 }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '18px 14px', color: 'var(--text-faint)', fontSize: 11.5 }}>
            <Icon name="CheckCircle2" size={14} color="var(--success)" />
            <span>Semua normal</span>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                {item.sub && <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>}
              </div>
              {item.badge && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color, background: color + '18',
                  padding: '2px 7px', borderRadius: 999, fontFamily: 'var(--mono)', flexShrink: 0 }}>{item.badge}</span>
              )}
            </div>
          ))
        )}
      </div>
      {count > 0 && (
        <button onClick={onMore}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'transparent',
            border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 10.5, color, fontWeight: 700, fontFamily: 'inherit' }}>
          Lihat semua
          <Icon name="ArrowRight" size={11} />
        </button>
      )}
    </div>
  );
}
