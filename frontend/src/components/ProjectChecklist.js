import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';

const API = process.env.REACT_APP_API_URL || '';
const ACCENT = '#38BDF8';

export default function ProjectChecklist() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/checklist/projects`)
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  function addTask(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Judul wajib diisi'); return; }
    setAdding(true); setError('');
    axios.post(`${API}/api/checklist/projects`, { title, note })
      .then(() => { setTitle(''); setNote(''); load(); })
      .catch(() => setError('Gagal menambah project'))
      .finally(() => setAdding(false));
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!edit.title.trim()) { setError('Judul wajib diisi'); return; }
    setAdding(true); setError('');
    axios.put(`${API}/api/checklist/projects/${edit.id}`, { title: edit.title, note: edit.note })
      .then(() => { setEdit(null); load(); })
      .catch(() => setError('Gagal menyimpan project'))
      .finally(() => setAdding(false));
  }

  function toggleTask(task) {
    setSavingId(task.id);
    axios.post(`${API}/api/checklist/projects/${task.id}/toggle`, { completed: !task.completed })
      .then(() => load())
      .catch(() => {})
      .finally(() => setSavingId(null));
  }

  function deleteTask() {
    if (!confirmDelete) return;
    axios.delete(`${API}/api/checklist/projects/${confirmDelete}`)
      .then(() => { setConfirmDelete(null); load(); })
      .catch(() => {});
  }

  const boxStyle = {
    display: 'flex', gap: 12, background: '#0A1628', border: '1px solid #1E3A5F',
    borderRadius: 10, padding: '12px 14px', alignItems: 'flex-start', flexShrink: 0,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Add form */}
        <form onSubmit={addTask}
          style={{ display: 'flex', gap: 8, background: '#0D1B2E', border: `1px solid ${ACCENT}44`,
            borderRadius: 10, padding: 12, flexWrap: 'wrap' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nama project / task..."
            style={{ flex: '2 1 200px', background: '#060E1C', border: '1px solid #1E3A5F', color: '#E2E8F0',
              padding: '9px 12px', borderRadius: 6, fontSize: 12, outline: 'none' }} />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan (opsional)"
            style={{ flex: '3 1 240px', background: '#060E1C', border: '1px solid #1E3A5F', color: '#E2E8F0',
              padding: '9px 12px', borderRadius: 6, fontSize: 12, outline: 'none' }} />
          <button type="submit" disabled={adding}
            style={{ padding: '9px 20px', borderRadius: 6, background: ACCENT, color: '#071018',
              border: 'none', cursor: adding ? 'wait' : 'pointer', fontFamily: 'inherit',
              fontWeight: 800, fontSize: 12, letterSpacing: '0.05em' }}>
            + TAMBAH
          </button>
        </form>
        {error ? <div style={{ fontSize: 11, color: '#EF4444' }}>{error}</div> : null}

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: '#334155', fontSize: 12 }}>Memuat...</div>
        ) : active.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>🎉</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>Semua project selesai!</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Tambah project baru di atas untuk melanjutkan.</div>
          </div>
        ) : (
          active.map(task => (
            <div key={task.id} style={boxStyle}>
              <button onClick={() => toggleTask(task)} disabled={savingId === task.id}
                title="Tandai selesai"
                style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                  background: 'transparent', border: `2px solid ${ACCENT}`, color: '#071018', fontSize: 13,
                  fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0' }}>{task.title}</div>
                {task.note ? <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>{task.note}</div> : null}
                <div style={{ fontSize: 9, color: '#475569', marginTop: 5 }}>
                  dibuat {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setEdit(task)} title="Edit"
                  style={{ background: 'transparent', border: '1px solid #1E3A5F', color: '#64748B',
                    borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>✎</button>
                <button onClick={() => setConfirmDelete(task.id)} title="Hapus"
                  style={{ background: 'transparent', border: '1px solid #EF444455', color: '#EF4444',
                    borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>🗑</button>
              </div>
            </div>
          ))
        )}

        {/* Done section */}
        {done.length > 0 && (
          <div style={{ marginTop: 16, flexShrink: 0 }}>
            <button onClick={() => setShowDone(!showDone)}
              style={{ width: '100%', textAlign: 'left', background: '#0D1B2E', border: '1px solid #1E3A5F',
                borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em' }}>
                {showDone ? '▾' : '▸'} SELESAI ({done.length})
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT }}>{showDone ? 'sembunyikan' : 'tampilkan'}</span>
            </button>

            {showDone && done.map(task => (
              <div key={task.id} style={{ ...boxStyle, marginTop: 8, background: `${ACCENT}0D`, border: `1px solid ${ACCENT}44` }}>
                <button onClick={() => toggleTask(task)} disabled={savingId === task.id} title="Batalkan selesai"
                  style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                    background: ACCENT, border: `2px solid ${ACCENT}`, color: '#071018', fontSize: 13,
                    fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✓</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#94A3B8', textDecoration: 'line-through' }}>{task.title}</div>
                  {task.note ? <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{task.note}</div> : null}
                  {task.completed_at ? (
                    <div style={{ fontSize: 9, color: ACCENT, marginTop: 5 }}>
                      ✓ Selesai {new Date(task.completed_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  ) : null}
                </div>
                <button onClick={() => setConfirmDelete(task.id)} title="Hapus"
                  style={{ background: 'transparent', border: '1px solid #EF444455', color: '#EF4444',
                    borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', flexShrink: 0 }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', marginBottom: 16 }}>EDIT PROJECT</div>
            <form onSubmit={saveEdit}>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>JUDUL</div>
              <input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: '#060E1C', border: '1px solid #1E3A5F',
                  color: '#E2E8F0', padding: '9px 12px', borderRadius: 6, fontSize: 12, outline: 'none', marginBottom: 12 }} />
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>CATATAN</div>
              <input value={edit.note} onChange={e => setEdit({ ...edit, note: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: '#060E1C', border: '1px solid #1E3A5F',
                  color: '#E2E8F0', padding: '9px 12px', borderRadius: 6, fontSize: 12, outline: 'none', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setEdit(null)}
                  style={{ padding: '8px 16px', fontSize: 12 }}>BATAL</button>
                <button type="submit" className="btn-primary" disabled={adding}
                  style={{ padding: '8px 16px', fontSize: 12 }}>SIMPAN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Hapus project?"
          message="Project akan dihapus permanen dan tidak dapat dikembalikan."
          onConfirm={deleteTask}
          onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}
