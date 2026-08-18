import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { getPeriodKey, shiftPeriod, formatPeriodLabel } from '../data/checklistData';
import ProjectChecklist from './ProjectChecklist';
import ActionMenu from './ActionMenu';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

const TAB_META = {
  daily:      { label: 'Harian',   color: 'var(--info)',   icon: 'CalendarCheck' },
  weekly:     { label: 'Mingguan', color: 'var(--success)', icon: 'CalendarDays' },
  monthly:    { label: 'Bulanan',  color: 'var(--violet)', icon: 'CalendarRange' },
  yearly:     { label: 'Tahunan',  color: 'var(--warning)', icon: 'Calendar' },
  occasional: { label: 'Event',    color: 'var(--pink)',   icon: 'PartyPopper' },
  project:    { label: 'Project',  color: 'var(--info)',   icon: 'FolderKanban' },
};

const PERIOD_OPTIONS = ['daily', 'weekly', 'monthly', 'yearly', 'occasional'];
const fieldStyle = {
  width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)',
  border: '1px solid var(--border)', color: 'var(--text)',
  padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none', fontFamily: 'inherit',
};
const labelStyle = { fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 };

export default function ChecklistPage() {
  const [tab, setTab] = useState('daily');
  const [refDate, setRefDate] = useState(new Date());
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // Task definitions from API
  const [apiTasks, setApiTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Manage tasks modal
  const [showManage, setShowManage] = useState(false);
  const [manageTasks, setManageTasks] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageForm, setManageForm] = useState({ period_type: 'daily', title: '', description: '' });
  const [manageSaving, setManageSaving] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [manageError, setManageError] = useState('');

  const tasks = tab === 'project' ? [] : (tab === 'occasional' ? apiTasks : apiTasks);
  const periodKey = useMemo(() => getPeriodKey(tab, refDate), [tab, refDate]);
  const periodLabel = useMemo(() => formatPeriodLabel(tab, refDate), [tab, refDate]);
  const isFuture = useMemo(() => {
    const todayKey = getPeriodKey(tab, new Date());
    return periodKey > todayKey;
  }, [tab, periodKey]);

  const loadCompletions = useCallback(() => {
    if (tab === 'project') return;
    setLoading(true);
    axios.get(`${API}/api/checklist/${tab}/${periodKey}`)
      .then(r => setCompletions((r.data && r.data.tasks) || {}))
      .catch(() => setCompletions({}))
      .finally(() => setLoading(false));
  }, [tab, periodKey]);

  const loadTasks = useCallback(() => {
    if (tab === 'project') return;
    setTasksLoading(true);
    axios.get(`${API}/api/checklist/tasks?periodType=${tab}`)
      .then(r => setApiTasks(r.data.tasks || []))
      .catch(() => setApiTasks([]))
      .finally(() => setTasksLoading(false));
  }, [tab]);

  useEffect(() => { loadCompletions(); }, [loadCompletions]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  function toggleTask(taskId, currentlyCompleted) {
    setSavingId(taskId);
    const newState = !currentlyCompleted;
    axios.post(`${API}/api/checklist/toggle`, {
      taskId, periodType: tab, periodKey, completed: newState,
    }).then(() => {
      setCompletions(prev => ({
        ...prev,
        [taskId]: { completed: newState, completed_at: new Date().toISOString() },
      }));
    }).catch(() => {}).finally(() => setSavingId(null));
  }

  const doneCount = tasks.filter(t => completions[t.task_id] && completions[t.task_id].completed).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const meta = TAB_META[tab];

  function goPeriod(dir) { setRefDate(prev => shiftPeriod(tab, prev, dir)); }
  function goToday() { setRefDate(new Date()); }

  // ── Manage Tasks Modal ──────────────────────────────
  function openManage() {
    setEditTask(null);
    setManageForm({ period_type: tab === 'project' ? 'daily' : tab, title: '', description: '' });
    setManageError('');
    loadManageTasks(tab === 'project' ? 'daily' : tab);
    setShowManage(true);
  }

  function loadManageTasks(pt) {
    setManageLoading(true);
    axios.get(`${API}/api/checklist/tasks?periodType=${pt}`)
      .then(r => setManageTasks(r.data.tasks || []))
      .catch(() => setManageTasks([]))
      .finally(() => setManageLoading(false));
  }

  function saveTask(e) {
    e.preventDefault();
    if (!manageForm.title.trim()) { setManageError('Judul wajib diisi'); return; }
    setManageSaving(true); setManageError('');
    const payload = { period_type: manageForm.period_type, title: manageForm.title.trim(), description: manageForm.description.trim() };
    const req = editTask
      ? axios.put(`${API}/api/checklist/tasks/${editTask.id}`, payload)
      : axios.post(`${API}/api/checklist/tasks`, payload);
    req.then(() => {
        setManageForm({ period_type: manageForm.period_type, title: '', description: '' });
        setEditTask(null);
        loadManageTasks(manageForm.period_type);
        loadTasks();
      })
      .catch(err => setManageError(err?.response?.data?.error || 'Gagal menyimpan'))
      .finally(() => setManageSaving(false));
  }

  function deleteTask(task) {
    axios.delete(`${API}/api/checklist/tasks/${task.id}`)
      .then(() => { loadManageTasks(manageForm.period_type); loadTasks(); })
      .catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        flexWrap: 'wrap', minHeight: 52,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>Checklist IT</span>
        {tab !== 'project' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: 'var(--hover)',
              border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px' }}>
              {doneCount}/{tasks.length} selesai ({pct}%)
            </div>
            <button onClick={openManage}
              style={{ fontSize: 10.5, padding: '5px 12px', borderRadius: 999, background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="Settings" size={12} /> Kelola Tugas
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {Object.keys(TAB_META).map(key => {
          const m = TAB_META[key];
          const active = tab === key;
          return (
            <button key={key} onClick={() => { setTab(key); setRefDate(new Date()); }}
              style={{
                fontSize: 11, padding: '7px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: active ? 700 : 500,
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Icon name={m.icon} size={12} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Project checklist (tab khusus) */}
      {tab === 'project' ? (
        <ProjectChecklist />
      ) : (
        <>
          {/* Period navigator */}
          <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button onClick={() => goPeriod(-1)} style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--card)',
              border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            }}>&lsaquo;</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{periodLabel}</div>
            <button onClick={() => goPeriod(1)} disabled={isFuture} style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)',
              color: isFuture ? 'var(--text-faint)' : 'var(--text-muted)', cursor: isFuture ? 'not-allowed' : 'pointer', fontSize: 14,
            }}>&rsaquo;</button>
            <button onClick={goToday} style={{
              fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
            }}>Sekarang</button>
          </div>

          {/* Progress bar */}
          <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
            <div style={{ height: 6, background: 'var(--input-bg)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', transition: 'width 0.2s' }} />
            </div>
          </div>

          {/* Task list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(loading || tasksLoading) && (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-faint)', fontSize: 12.5 }}>Memuat...</div>
              )}
              {!loading && !tasksLoading && tasks.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-faint)', fontSize: 12 }}>
                  Tidak ada tugas untuk periode ini. Klik <strong>"Kelola Tugas"</strong> untuk menambah tugas.
                </div>
              )}
              {!loading && !tasksLoading && tasks.map((task, idx) => {
                const state = completions[task.task_id] || {};
                const done = !!state.completed;
                const saving = savingId === task.task_id;
                return (
                  <div key={task.task_id}
                    onClick={() => { if (!saving) toggleTask(task.task_id, done); }}
                    style={{
                      display: 'flex', gap: 12, background: done ? 'rgba(16,185,129,0.06)' : 'var(--card)',
                      border: '1px solid ' + (done ? 'rgba(16,185,129,0.35)' : 'var(--border)'), borderRadius: 12,
                      padding: '12px 14px', cursor: saving ? 'wait' : 'pointer', alignItems: 'flex-start', flexShrink: 0,
                    }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 8, flexShrink: 0, marginTop: 1,
                      background: done ? 'var(--success)' : 'transparent',
                      border: '2px solid ' + (done ? 'var(--success)' : 'var(--border-strong)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                      color: 'var(--on-accent)', fontWeight: 800,
                    }}>{done ? '✓' : ''}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span style={{
                          fontSize: 12.5, fontWeight: 700, color: done ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}>{task.title}</span>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{task.description}</div>
                      )}
                      {done && state.completed_at ? (
                        <div style={{ fontSize: 9.5, color: 'var(--success)', marginTop: 5 }}>
                          ✓ Diselesaikan {new Date(state.completed_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Manage Tasks Modal ────────────────────────── */}
      {showManage && (
        <div className="modal-overlay" onClick={() => setShowManage(false)}>
          <div className="modal pop-in" style={{ maxWidth: 520, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Kelola Tugas Checklist</div>
              <button onClick={() => setShowManage(false)}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)',
                  border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="X" size={14} />
              </button>
            </div>

            {/* Period type selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {PERIOD_OPTIONS.map(pt => {
                const m = TAB_META[pt];
                const active = manageForm.period_type === pt;
                return (
                  <button key={pt} onClick={() => { setManageForm(f => ({ ...f, period_type: pt })); loadManageTasks(pt); }}
                    style={{ fontSize: 10.5, padding: '5px 12px', borderRadius: 999, fontFamily: 'inherit',
                      fontWeight: active ? 700 : 500, cursor: 'pointer',
                      background: active ? m.color + '22' : 'transparent',
                      color: active ? m.color : 'var(--text-muted)',
                      border: '1px solid ' + (active ? m.color + '55' : 'var(--border)') }}>
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Add/Edit form */}
            <form onSubmit={saveTask}
              style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                {editTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={labelStyle}>Judul</div>
                <input value={manageForm.title} onChange={e => setManageForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nama tugas..." style={fieldStyle} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={labelStyle}>Deskripsi (opsional)</div>
                <textarea value={manageForm.description} onChange={e => setManageForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Deskripsi singkat..." style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              {manageError && (
                <div style={{ fontSize: 11, color: 'var(--danger)', background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>{manageError}</div>
              )}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {editTask && (
                  <button type="button" onClick={() => { setEditTask(null); setManageForm(f => ({ ...f, title: '', description: '' })); }}
                    style={{ fontSize: 10.5, padding: '6px 12px', borderRadius: 999, background: 'transparent',
                      border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Batal Edit</button>
                )}
                <button type="submit" disabled={manageSaving} className="btn-primary"
                  style={{ fontSize: 10.5, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {manageSaving ? 'Menyimpan...' : <><Icon name={editTask ? 'Save' : 'Plus'} size={12} /> {editTask ? 'Update' : 'Tambah'}</>}
                </button>
              </div>
            </form>

            {/* Task list */}
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {manageLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-faint)', fontSize: 11.5 }}>Memuat...</div>
              ) : manageTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-faint)', fontSize: 11.5 }}>Belum ada tugas</div>
              ) : (
                manageTasks.map(task => (
                  <div key={task.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-faint)', flexShrink: 0, width: 36 }}>{task.task_id}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 10, color: 'var(--text-faint)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                    </div>
                    <ActionMenu actions={[
                      { label: 'Edit', icon: '✏️', color: 'var(--info)', onClick: () => { setEditTask(task); setManageForm(f => ({ ...f, title: task.title, description: task.description || '' })); } },
                      { label: 'Hapus', icon: '🗑️', color: 'var(--danger)', onClick: () => { if (window.confirm(`Hapus tugas "${task.title}"?`)) deleteTask(task); } },
                    ]} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
