import React, { useState, useMemo } from 'react';
import sopData, { categoryMeta, jobDescription } from '../data/sopData';
import Icon from './Icon';

const CATEGORY_ICONS = {
  pemasangan: 'Wrench',
  perawatan: 'SprayCan',
  perbaikan: 'Settings',
  pengembangan: 'Rocket',
  manajemen: 'ClipboardList',
};

export default function SOPPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [showJobDesc, setShowJobDesc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sopData.filter(sop => {
      if (filterCategory !== 'all' && sop.category !== filterCategory) return false;
      if (!q) return true;
      return sop.title.toLowerCase().includes(q) ||
        sop.no.toLowerCase().includes(q) ||
        sop.kebijakan.toLowerCase().includes(q) ||
        sop.prosedur.some(p => p.toLowerCase().includes(q));
    });
  }, [search, filterCategory]);

  function toggle(no) {
    setExpanded(prev => ({ ...prev, [no]: !prev[no] }));
  }

  function expandAll() {
    const next = {};
    filtered.forEach(s => { next[s.no] = true; });
    setExpanded(next);
  }
  function collapseAll() {
    setExpanded({});
  }

  const categoryCounts = useMemo(() => {
    const counts = {};
    sopData.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return counts;
  }, []);

  const chip = (active, accent, label) => ({
    fontSize: 11, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: active ? 700 : 500,
    background: active ? accent + '22' : 'transparent',
    color: active ? accent : 'var(--text-muted)',
    border: '1px solid ' + (active ? accent + '55' : 'var(--border)'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0, flexWrap: 'wrap', minHeight: 52,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>SOP & Policy IT</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{sopData.length} dokumen</span>
        <input
          type="text" value={search} placeholder="Cari SOP (judul, isi prosedur)..."
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, maxWidth: 340, background: 'var(--input-bg)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px',
            fontSize: 11.5, color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
          }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowJobDesc(true)}
            style={{
              fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
              border: '1px solid rgba(168,85,247,0.45)', color: 'var(--violet)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700,
            }}>Job Description</button>
          <button onClick={expandAll} style={{
            fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>Buka Semua</button>
          <button onClick={collapseAll} style={{
            fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>Tutup Semua</button>
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={() => setFilterCategory('all')} style={chip(filterCategory === 'all', 'var(--info)', 'Semua')}>
          Semua ({sopData.length})
        </button>
        {Object.keys(categoryMeta).map(key => {
          const meta = categoryMeta[key];
          const active = filterCategory === key;
          return (
            <button key={key} onClick={() => setFilterCategory(key)} style={chip(active, meta.color, meta.label)}>
              <Icon name={CATEGORY_ICONS[key] || 'FileText'} size={13} style={{ verticalAlign: 'middle' }} /> {meta.label} ({categoryCounts[key] || 0})
            </button>
          );
        })}
      </div>

      {/* SOP list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-faint)', fontSize: 12.5 }}>
              Tidak ada SOP yang cocok dengan pencarian
            </div>
          ) : null}

          {filtered.map(sop => {
            const meta = categoryMeta[sop.category] || categoryMeta.manajemen;
            const isOpen = !!expanded[sop.no];
            return (
              <div key={sop.no} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', flexShrink: 0,
              }}>
                {/* Header row (clickable) */}
                <div onClick={() => toggle(sop.no)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: meta.color + '18',
                    border: '1px solid ' + meta.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={CATEGORY_ICONS[sop.category] || 'FileText'} size={16} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{sop.title}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                      {sop.no} · {meta.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-faint)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>›</div>
                </div>
                {/* Expandable content */}
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginTop: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Kebijakan</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{sop.kebijakan}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>Prosedur</div>
                      <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sop.prosedur.map((step, i) => (
                          <li key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Job Description Modal */}
      {showJobDesc && (
        <div onClick={() => setShowJobDesc(false)} style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} className="modal pop-in" style={{
            border: '1px solid rgba(168,85,247,0.45)', width: '100%', maxWidth: 640,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{jobDescription.title}</div>
              <button
                onClick={() => setShowJobDesc(false)}
                style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)',
                  border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
                }}>✕</button>
            </div>
            <div style={{ padding: '18px 20px', overflowY: 'auto' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>{jobDescription.summary}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>Ruang Lingkup Tanggung Jawab</div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {jobDescription.scope.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
