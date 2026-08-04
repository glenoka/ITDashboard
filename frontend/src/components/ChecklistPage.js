import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { taskSets, getPeriodKey, shiftPeriod, formatPeriodLabel } from '../data/checklistData';
import ProjectChecklist from './ProjectChecklist';

const API = process.env.REACT_APP_API_URL || '';

const TAB_META = {
  daily:      { label: 'Harian',   color: '#38BDF8', icon: '\u{1F4C5}' },
  weekly:     { label: 'Mingguan', color: '#22C55E', icon: '\u{1F5D3}' },
  monthly:    { label: 'Bulanan',  color: '#A855F7', icon: '\u{1F4C6}' },
  yearly:     { label: 'Tahunan',  color: '#F59E0B', icon: '\u{1F4C8}' },
  occasional: { label: 'Event',    color: '#EC4899', icon: '\u{1F3AA}' },
  project:    { label: 'Project',  color: '#38BDF8', icon: '\u{1F4C1}' },
};

export default function ChecklistPage() {
  var [tab, setTab] = useState('daily');
  var [refDate, setRefDate] = useState(new Date());
  var [completions, setCompletions] = useState({}); // taskId -> {completed, completed_by, completed_at}
  var [loading, setLoading] = useState(false);
  var [savingId, setSavingId] = useState(null);

  var tasks = taskSets[tab] || [];
  var periodKey = useMemo(function () { return getPeriodKey(tab, refDate); }, [tab, refDate]);
  var periodLabel = useMemo(function () { return formatPeriodLabel(tab, refDate); }, [tab, refDate]);
  var isFuture = useMemo(function () {
    var todayKey = getPeriodKey(tab, new Date());
    return periodKey > todayKey;
  }, [tab, periodKey]);

  var load = useCallback(function () {
    setLoading(true);
    axios.get(API + '/api/checklist/' + tab + '/' + periodKey)
      .then(function (r) { setCompletions((r.data && r.data.tasks) || {}); })
      .catch(function () { setCompletions({}); })
      .finally(function () { setLoading(false); });
  }, [tab, periodKey]);

  useEffect(function () { load(); }, [load]);

  function toggleTask(taskId, currentlyCompleted) {
    setSavingId(taskId);
    var newState = !currentlyCompleted;
    axios.post(API + '/api/checklist/toggle', {
      taskId: taskId, periodType: tab, periodKey: periodKey,
      completed: newState,
    }).then(function () {
      setCompletions(function (prev) {
        var next = Object.assign({}, prev);
        next[taskId] = { completed: newState, completed_at: new Date().toISOString() };
        return next;
      });
    }).catch(function () {}).finally(function () { setSavingId(null); });
  }

  var doneCount = tasks.filter(function (t) { return completions[t.id] && completions[t.id].completed; }).length;
  var pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  var meta = TAB_META[tab];

  function goPeriod(dir) {
    setRefDate(function (prev) { return shiftPeriod(tab, prev, dir); });
  }
  function goToday() {
    setRefDate(new Date());
  }

  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: '#080F1E', overflow: 'hidden' }
  },
    // Toolbar
    React.createElement('div', {
      style: { background: '#0D1B2E', borderBottom: '1px solid #1E3A5F', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', minHeight: 52 }
    },
      React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' } }, 'CHECKLIST IT'),
      tab !== 'project' ? React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('div', {
          style: { fontSize: 11, fontWeight: 700, color: meta.color, background: meta.color + '18',
            border: '1px solid ' + meta.color + '44', borderRadius: 20, padding: '4px 12px' }
        }, doneCount + '/' + tasks.length + ' selesai (' + pct + '%)')
      ) : null,
    ),

    // Tabs
    React.createElement('div', { style: { padding: '10px 16px 0', display: 'flex', gap: 6, flexShrink: 0 } },
      Object.keys(TAB_META).map(function (key) {
        var m = TAB_META[key];
        var active = tab === key;
        return React.createElement('button', {
          key: key, onClick: function () { setTab(key); setRefDate(new Date()); },
          style: { fontSize: 11, padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: active ? 700 : 400,
            background: active ? m.color + '22' : 'transparent',
            color: active ? m.color : '#64748B',
            border: '1px solid ' + (active ? m.color + '55' : '#1E3A5F') }
        }, m.icon + ' ' + m.label);
      })
    ),

    // Project checklist (tab khusus, task dinamis buatan user)
    tab === 'project' ? React.createElement(ProjectChecklist) : [
      // Period navigator
      React.createElement('div', { style: { padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 } },
        React.createElement('button', {
          onClick: function () { goPeriod(-1); },
          style: { width: 30, height: 30, borderRadius: 6, background: '#0A1628', border: '1px solid #1E3A5F',
            color: '#94A3B8', cursor: 'pointer', fontSize: 14 }
        }, '\u2039'),
        React.createElement('div', { style: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#E2E8F0' } }, periodLabel),
        React.createElement('button', {
          onClick: function () { goPeriod(1); }, disabled: isFuture,
          style: { width: 30, height: 30, borderRadius: 6, background: '#0A1628', border: '1px solid #1E3A5F',
            color: isFuture ? '#334155' : '#94A3B8', cursor: isFuture ? 'not-allowed' : 'pointer', fontSize: 14 }
        }, '\u203A'),
        React.createElement('button', {
          onClick: goToday,
          style: { fontSize: 10, padding: '6px 12px', borderRadius: 6, background: 'transparent',
            border: '1px solid #1E3A5F', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }
        }, 'Sekarang')
      ),

      // Progress bar
      React.createElement('div', { style: { padding: '12px 16px 0', flexShrink: 0 } },
        React.createElement('div', { style: { height: 6, background: '#0A1628', borderRadius: 3, overflow: 'hidden' } },
          React.createElement('div', { style: { height: '100%', width: pct + '%', background: meta.color, transition: 'width 0.2s' } })
        )
      ),

      // Task list
      React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '12px 16px 20px' } },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        loading ? React.createElement('div', { style: { textAlign: 'center', paddingTop: 40, color: '#334155', fontSize: 12 } }, 'Memuat...') : null,

        !loading ? tasks.map(function (task, idx) {
          var state = completions[task.id] || {};
          var done = !!state.completed;
          var saving = savingId === task.id;
          return React.createElement('div', {
            key: task.id,
            onClick: function () { if (!saving) toggleTask(task.id, done); },
            style: { display: 'flex', gap: 12, background: done ? meta.color + '0D' : '#0A1628',
              border: '1px solid ' + (done ? meta.color + '44' : '#1E3A5F'), borderRadius: 10,
              padding: '12px 14px', cursor: saving ? 'wait' : 'pointer', alignItems: 'flex-start', flexShrink: 0 }
          },
            React.createElement('div', {
              style: { width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: done ? meta.color : 'transparent', border: '2px solid ' + (done ? meta.color : '#334155'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#071018', fontWeight: 800 }
            }, done ? '\u2713' : ''),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
                React.createElement('span', { style: { fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 } }, String(idx + 1).padStart(2, '0')),
                React.createElement('span', {
                  style: { fontSize: 12.5, fontWeight: 700, color: done ? '#94A3B8' : '#E2E8F0',
                    textDecoration: done ? 'line-through' : 'none' }
                }, task.title)
              ),
              React.createElement('div', { style: { fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 1.5 } }, task.desc),
              done && state.completed_at ? React.createElement('div', { style: { fontSize: 9, color: meta.color, marginTop: 5 } },
                '\u2713 Diselesaikan ' + new Date(state.completed_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
              ) : null
            )
          );
        }) : null
        )
      )
    ]
  );
}
