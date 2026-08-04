import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { taskSets, getPeriodKey, shiftPeriod, formatPeriodLabel } from '../data/checklistData';
import ProjectChecklist from './ProjectChecklist';
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

export default function ChecklistPage() {
  const [tab, setTab] = useState('daily');
  const [refDate, setRefDate] = useState(new Date());
  const [completions, setCompletions] = useState({}); // taskId -> {completed, completed_by, completed_at}
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const tasks = taskSets[tab] || [];
  const periodKey = useMemo(() => getPeriodKey(tab, refDate), [tab, refDate]);
  const periodLabel = useMemo(() => formatPeriodLabel(tab, refDate), [tab, refDate]);
  const isFuture = useMemo(() => {
    const todayKey = getPeriodKey(tab, new Date());
    return periodKey > todayKey;
  }, [tab, periodKey]);

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/checklist/${tab}/${periodKey}`)
      .then(r => setCompletions((r.data && r.data.tasks) || {}))
      .catch(() => setCompletions({}))
      .finally(() => setLoading(false));
  }, [tab, periodKey]);

  useEffect(() => { load(); }, [load]);

  function toggleTask(taskId, currentlyCompleted) {
    setSavingId(taskId);
    const newState = !currentlyCompleted;
    axios.post(`${API}/api/checklist/toggle`, {
      taskId, periodType: tab, periodKey,
      completed: newState,
    }).then(() => {
      setCompletions(prev => ({
        ...prev,
        [taskId]: { completed: newState, completed_at: new Date().toISOString() },
      }));
    }).catch(() => {}).finally(() => setSavingId(null));
  }

  const doneCount = tasks.filter(t => completions[t.id] && completions[t.id].completed).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const meta = TAB_META[tab];

  function goPeriod(dir) {
    setRefDate(prev => shiftPeriod(tab, prev, dir));
  }
  function goToday() {
    setRefDate(new Date());
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
            <div style={{
              fontSize: 11, fontWeight: 700, color: meta.color, background: 'var(--hover)',
              border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px',
            }}>
              {doneCount}/{tasks.length} selesai ({pct}%)
            </div>
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

      {/* Project checklist (tab khusus, task dinamis buatan user) */}
      {tab === 'project' ? (
        <ProjectChecklist />
      ) : (
        <>
          {/* Period navigator */}
          <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button onClick={() => goPeriod(-1)} style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--card)',
              border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{periodLabel}</div>
            <button onClick={() => goPeriod(1)} disabled={isFuture} style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)',
              color: isFuture ? 'var(--text-faint)' : 'var(--text-muted)', cursor: isFuture ? 'not-allowed' : 'pointer', fontSize: 14,
            }}>›</button>
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
              {loading ? (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-faint)', fontSize: 12.5 }}>Memuat...</div>
              ) : null}

              {!loading && tasks.map((task, idx) => {
                const state = completions[task.id] || {};
                const done = !!state.completed;
                const saving = savingId === task.id;
                return (
                  <div key={task.id}
                    onClick={() => { if (!saving) toggleTask(task.id, done); }}
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{task.desc}</div>
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
    </div>
  );
}
