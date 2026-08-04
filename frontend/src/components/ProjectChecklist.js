import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';
const ACCENT = 'var(--info)';

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
    display: 'flex', gap: 12, background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '12px 14px', alignItems: 'flex-start', flexShrink: 0,
  };

  const iconBtn = (color, title, onClick, iconName, disabled) => ({
    background: 'transparent', border: `1px solid ${color}`, color,
    borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
    fontFamily: 'inherit', flexShrink: 0, ...(disabled ? { opacity: 0.5 } : {}), onClick, title,
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Add form */}
        <form onSubmit={addTask}
          style={{ display: 'flex', gap: 8, background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 12, flexWrap: 'wrap' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nama project / task..."
            style={{ flex: '2 1 200px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)',
              padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none' }} />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan (opsional)"
            style={{ flex: '3 1 240px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)',
              padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none' }} />
          <button type="submit" disabled={adding}
            style={{ padding: '9px 20px', borderRadius: 999, background: 'var(--info)', color: 'var(--on-accent)',
              border: 'none', cursor: adding ? 'wait' : 'pointer', fontFamily: 'inherit',
              fontWeight: 800, fontSize: 12, letterSpacing: '0.05em' }}>
            + Tambah
          </button>
        </form>
        {error ? <div style={{ fontSize: 11.5, color: 'var(--danger)' }}>{error}</div> : null}

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-faint)', fontSize: 12.5 }}>Memuat...</div>
        ) : active.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }}>
            <Icon name="PartyPopper" size={38} color="var(--info)" style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)' }}>Semua project selesai!</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Tambah project baru di atas untuk melanjutkan.</div>
          </div>
        ) : (
          active.map(task => (
            <div key={task.id} style={boxStyle}>
              <button onClick={() => toggleTask(task)} disabled={savingId === task.id}
                title="Tandai selesai"
                style={{ width: 22, height: 22, borderRadius: 8, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                  background: 'transparent', border: '2px solid var(--info)', color: 'var(--on-accent)', fontSize: 13,
                  fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{task.title}</div>
                {task.note ? <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{task.note}</div> : null}
                <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 5, fontFamily: 'var(--mono)' }}>
                  dibuat {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button {...iconBtn('var(--info)', 'Edit', () => setEdit(task), 'Pencil')}><Icon name="Pencil" size={13} /></button>
                <button {...iconBtn('var(--danger)', 'Hapus', () => setConfirmDelete(task.id), 'Trash2')}><Icon name="Trash2" size={13} /></button>
              </div>
            </div>
          ))
        )}

        {/* Done section */}
        {done.length > 0 && (
          <div style={{ marginTop: 16, flexShrink: 0 }}>
            <button onClick={() => setShowDone(!showDone)}
              style={{ width: '100%', textAlign: 'left', background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '9px 14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                {showDone ? '▾' : '▸'} Selesai ({done.length})
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--info)' }}>{showDone ? 'sembunyikan' : 'tampilkan'}</span>
            </button>

            {showDone && done.map(task => (
              <div key={task.id} style={{ ...boxStyle, marginTop: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.30)' }}>
                <button onClick={() => toggleTask(task)} disabled={savingId === task.id} title="Batalkan selesai"
                  style={{ width: 22, height: 22, borderRadius: 8, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                    background: 'var(--info)', border: '2px solid var(--info)', color: 'var(--on-accent)', fontSize: 13,
                    fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✓</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{task.title}</div>
                  {task.note ? <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{task.note}</div> : null}
                  {task.completed_at ? (
                    <div style={{ fontSize: 9.5, color: 'var(--info)', marginTop: 5, fontFamily: 'var(--mono)' }}>
                      ✓ Selesai {new Date(task.completed_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  ) : null}
                </div>
                <button {...iconBtn('var(--danger)', 'Hapus', () => setConfirmDelete(task.id), 'Trash2')}><Icon name="Trash2" size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal pop-in" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Edit Project</div>
            <form onSubmit={saveEdit}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>Judul</div>
              <input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none', marginBottom: 12 }} />
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>Catatan</div>
              <input value={edit.note} onChange={e => setEdit({ ...edit, note: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setEdit(null)}
                  style={{ padding: '8px 16px', fontSize: 12 }}>Batal</button>
                <button type="submit" className="btn-primary" disabled={adding}
                  style={{ padding: '8px 16px', fontSize: 12 }}>Simpan</button>
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
