import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { categoryMeta, jobDescription } from '../data/sopData';
import ActionMenu from './ActionMenu';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

const CATEGORY_ICONS = {
  pemasangan: 'Wrench',
  perawatan: 'SprayCan',
  perbaikan: 'Settings',
  pengembangan: 'Rocket',
  manajemen: 'ClipboardList',
};

const fieldStyle = {
  width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)',
  border: '1px solid var(--border)', color: 'var(--text)',
  padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none', fontFamily: 'inherit',
};
const labelStyle = { fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 };

export default function SOPPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [showJobDesc, setShowJobDesc] = useState(false);
  const [sopList, setSopList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSop, setEditSop] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [formNo, setFormNo] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('pemasangan');
  const [formKebijakan, setFormKebijakan] = useState('');
  const [formProsedur, setFormProsedur] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/sop`)
      .then(r => setSopList(r.data.docs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sopList.filter(sop => {
      if (filterCategory !== 'all' && sop.category !== filterCategory) return false;
      if (!q) return true;
      return sop.title.toLowerCase().includes(q) ||
        sop.no.toLowerCase().includes(q) ||
        (sop.kebijakan || '').toLowerCase().includes(q) ||
        (Array.isArray(sop.prosedur) ? sop.prosedur : []).some(p => (p || '').toLowerCase().includes(q));
    });
  }, [search, filterCategory, sopList]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    sopList.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return counts;
  }, [sopList]);

  function toggle(no) { setExpanded(prev => ({ ...prev, [no]: !prev[no] })); }
  function expandAll() { const next = {}; filtered.forEach(s => { next[s.no] = true; }); setExpanded(next); }
  function collapseAll() { setExpanded({}); }

  function openAdd() {
    setEditSop(null);
    setFormNo(''); setFormTitle(''); setFormCategory('pemasangan');
    setFormKebijakan(''); setFormProsedur(''); setError('');
    setShowForm(true);
  }

  function openEdit(sop) {
    setEditSop(sop);
    setFormNo(sop.no); setFormTitle(sop.title); setFormCategory(sop.category);
    setFormKebijakan(sop.kebijakan || '');
    setFormProsedur(Array.isArray(sop.prosedur) ? sop.prosedur.join('\n') : '');
    setError(''); setShowForm(true);
  }

  function saveForm(e) {
    e.preventDefault();
    if (!formNo.trim() || !formTitle.trim()) { setError('No dan Judul wajib diisi'); return; }
    setSaving(true); setError('');
    const prosedur = formProsedur.split('\n').map(s => s.trim()).filter(Boolean);
    const payload = { no: formNo.trim(), title: formTitle.trim(), category: formCategory,
      kebijakan: formKebijakan.trim(), prosedur };
    const req = editSop
      ? axios.put(`${API}/api/sop/${editSop.id}`, payload)
      : axios.post(`${API}/api/sop`, payload);
    req.then(() => { setShowForm(false); load(); })
      .catch(err => setError(err?.response?.data?.error || 'Gagal menyimpan'))
      .finally(() => setSaving(false));
  }

  function deleteSop() {
    if (!confirmDelete) return;
    axios.delete(`${API}/api/sop/${confirmDelete.id}`)
      .then(() => { setConfirmDelete(null); load(); })
      .catch(() => {});
  }

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
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{sopList.length} dokumen</span>
        <input
          type="text" value={search} placeholder="Cari SOP (judul, isi prosedur)..."
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, maxWidth: 340, background: 'var(--input-bg)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px',
            fontSize: 11.5, color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
          }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowJobDesc(true)}
            style={{ fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
              border: '1px solid rgba(168,85,247,0.45)', color: 'var(--violet)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700 }}>Job Description</button>
          <button onClick={expandAll}
            style={{ fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Buka Semua</button>
          <button onClick={collapseAll}
            style={{ fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Tutup Semua</button>
          <button onClick={openAdd} className="btn-primary"
            style={{ fontSize: 10.5, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="Plus" size={12} /> Tambah SOP
          </button>
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={() => setFilterCategory('all')} style={chip(filterCategory === 'all', 'var(--info)', 'Semua')}>
          Semua ({sopList.length})
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
          {loading && (
            <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-faint)', fontSize: 12.5 }}>Memuat...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-faint)', fontSize: 12.5 }}>
              Tidak ada SOP yang cocok
            </div>
          )}

          {filtered.map(sop => {
            const meta = categoryMeta[sop.category] || categoryMeta.manajemen;
            const isOpen = !!expanded[sop.no];
            const prosedur = Array.isArray(sop.prosedur) ? sop.prosedur : [];
            return (
              <div key={sop.id || sop.no}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                <div onClick={() => toggle(sop.no)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: meta.color + '18',
                    border: '1px solid ' + meta.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={CATEGORY_ICONS[sop.category] || 'FileText'} size={16} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{sop.title}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                      {sop.no} · {meta.label}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, marginRight: 8 }}>
                    <ActionMenu actions={[
                      { label: 'Edit', icon: '✏️', color: 'var(--info)', onClick: () => openEdit(sop) },
                      { label: 'Hapus', icon: '🗑️', color: 'var(--danger)', onClick: () => setConfirmDelete(sop) },
                    ]} />
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-faint)', transform: isOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s', flexShrink: 0 }}>&rsaquo;</div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginTop: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Kebijakan</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{sop.kebijakan}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>Prosedur</div>
                      <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {prosedur.map((step, i) => (
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

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal pop-in" style={{ maxWidth: 620, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>
              {editSop ? 'Edit SOP' : 'Tambah SOP Baru'}
            </div>
            <form onSubmit={saveForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={labelStyle}>No SOP</div>
                  <input value={formNo} onChange={e => setFormNo(e.target.value)} placeholder="IT/XXX" style={fieldStyle} />
                </div>
                <div>
                  <div style={labelStyle}>Judul</div>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Judul SOP..." style={fieldStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Kategori</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.keys(categoryMeta).map(key => {
                    const meta = categoryMeta[key];
                    const active = formCategory === key;
                    return (
                      <button key={key} type="button" onClick={() => setFormCategory(key)}
                        style={{ fontSize: 10.5, padding: '5px 12px', borderRadius: 999, fontFamily: 'inherit',
                          fontWeight: active ? 700 : 500, cursor: 'pointer',
                          background: active ? meta.color + '22' : 'transparent',
                          color: active ? meta.color : 'var(--text-muted)',
                          border: '1px solid ' + (active ? meta.color + '55' : 'var(--border)') }}>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Kebijakan</div>
                <textarea value={formKebijakan} onChange={e => setFormKebijakan(e.target.value)}
                  rows={3} placeholder="Deskripsi kebijakan..."
                  style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Prosedur (satu langkah per baris)</div>
                <textarea value={formProsedur} onChange={e => setFormProsedur(e.target.value)}
                  rows={6} placeholder={"Langkah 1\nLangkah 2\nLangkah 3"}
                  style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 11.5 }} />
              </div>
              {error && (
                <div style={{ fontSize: 11.5, color: 'var(--danger)', background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}
                  style={{ padding: '8px 16px', fontSize: 12 }}>Batal</button>
                <button type="submit" disabled={saving} className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? 'Menyimpan...' : <><Icon name="Save" size={13} /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal pop-in" style={{ maxWidth: 380, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Hapus SOP?</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
              <strong>{confirmDelete.no}</strong> — {confirmDelete.title} akan dihapus permanen.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}
                style={{ padding: '8px 16px', fontSize: 12 }}>Batal</button>
              <button onClick={deleteSop}
                style={{ padding: '8px 16px', fontSize: 12, borderRadius: 10, background: 'var(--danger)', color: 'white',
                  border: 'none', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="Trash2" size={13} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Description Modal */}
      {showJobDesc && (
        <div className="modal-overlay" onClick={() => setShowJobDesc(false)}>
          <div className="modal pop-in" style={{ border: '1px solid rgba(168,85,247,0.45)', width: '100%', maxWidth: 640,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{jobDescription.title}</div>
              <button onClick={() => setShowJobDesc(false)}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)',
                  border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Icon name="X" size={14} />
              </button>
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
