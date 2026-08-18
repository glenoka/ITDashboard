import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import { fmtID } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const REMINDER_TYPES = [
  { id: 'once', label: 'Sekali' },
  { id: 'daily', label: 'Harian' },
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'yearly', label: 'Tahunan' },
  { id: 'custom', label: 'Custom (hari)' },
];

const REMINDER_STATUS = {
  active:    { label: 'Aktif', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
  completed: { label: 'Selesai', color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
  paused:    { label: 'Jeda', color: 'var(--warning)', bg: 'rgba(251,191,36,0.12)' },
};

const EMPTY_FORM = { id: null, title: '', asset_id: '', reminder_type: 'once', reminder_interval: 1, next_date: '', next_time: '08:00', notes: '' };

export default function RemindersPage({ wsRef }) {
  const [reminders, setReminders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [snoozeTarget, setSnoozeTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      const [remRes, assetRes] = await Promise.all([
        axios.get(`${API}/api/asset-reminders?${params.toString()}`),
        axios.get(`${API}/api/assets?limit=999`),
      ]);
      setReminders(remRes.data.reminders || []);
      setAssets(assetRes.data.assets || []);
    } catch (e) {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!wsRef?.current) return;
    const onMsg = (e) => {
      const msg = JSON.parse(e.data);
      if (['reminder_added', 'reminder_updated', 'reminder_deleted', 'reminder_completed', 'reminder_snoozed'].includes(msg.type)) load();
    };
    wsRef.current.addEventListener('message', onMsg);
    return () => wsRef.current?.removeEventListener('message', onMsg);
  }, [wsRef, load]);

  const openAdd = () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setForm({ id: null, title: '', asset_id: '', reminder_type: 'once', reminder_interval: 1, next_date: today, next_time: `${hh}:${mm}`, notes: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (r) => {
    const dt = r.next_reminder ? r.next_reminder.slice(0, 16) : '';
    setForm({
      id: r.id,
      title: r.title || '',
      asset_id: r.asset_id || '',
      reminder_type: r.reminder_type || 'once',
      reminder_interval: r.reminder_interval || 1,
      next_date: dt ? dt.slice(0, 10) : '',
      next_time: dt ? dt.slice(11, 16) : '08:00',
      notes: r.notes || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const save = async () => {
    const displayTitle = form.title || (form.asset_id ? assets.find(a => a.id === parseInt(form.asset_id))?.item_name : '');
    if (!displayTitle) { setFormError('Nama reminder atau aset wajib dipilih'); return; }
    if (!form.next_date) { setFormError('Tanggal wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title || undefined,
        asset_id: form.asset_id ? parseInt(form.asset_id) : null,
        reminder_type: form.reminder_type,
        reminder_interval: parseInt(form.reminder_interval) || 1,
        next_reminder: `${form.next_date} ${form.next_time || '08:00'}:00`,
        notes: form.notes,
      };
      if (form.id) await axios.put(`${API}/api/asset-reminders/${form.id}`, payload);
      else await axios.post(`${API}/api/asset-reminders`, payload);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e?.response?.data?.error || 'Gagal menyimpan reminder');
    }
    setSaving(false);
  };

  const remove = async () => {
    try { await axios.delete(`${API}/api/asset-reminders/${confirm.id}`); } catch (e) {}
    setConfirm(null);
    load();
  };

  const completeReminder = async (id) => {
    try { await axios.post(`${API}/api/asset-reminders/${id}/complete`); load(); } catch (e) {}
  };

  const openSnooze = (r) => {
    setSnoozeTarget(r);
  };

  const doSnooze = async (date) => {
    if (!snoozeTarget) return;
    try {
      await axios.post(`${API}/api/asset-reminders/${snoozeTarget.id}/snooze`, { date });
      setSnoozeTarget(null);
      load();
    } catch (e) {}
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getTypeLabel = (type, interval) => {
    const found = REMINDER_TYPES.find(t => t.id === type);
    return type === 'custom' ? `Custom (${interval}h)` : (found?.label || type);
  };

  const getNextDates = () => {
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    }
    return dates;
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[{ id: 'all', label: 'Semua' }, { id: 'active', label: 'Aktif' }, { id: 'completed', label: 'Selesai' }, { id: 'paused', label: 'Jeda' }].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                border: filter === s.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: filter === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: filter === s.id ? 'var(--accent)' : 'var(--text-muted)',
              }}>{s.label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ fontSize: 11, padding: '8px 14px' }}>+ Tambah Reminder</button>
      </div>

      <div className="card overflow-hidden table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nama Reminder</th><th>Aset</th><th>Pengulangan</th><th>Tgl Berikutnya</th><th>Tgl Terakhir</th><th>Status</th><th>Catatan</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading && reminders.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                Belum ada reminder. Klik "+ Tambah Reminder" untuk membuat.
              </td></tr>
            )}
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Memuat...</td></tr>}
            {reminders.map(r => {
              const st = REMINDER_STATUS[r.status] || REMINDER_STATUS.active;
              const displayName = r.title || r.asset_name || (r.asset_id ? 'Aset #' + r.asset_id : 'Reminder');
              const assetLabel = r.asset_name || (r.asset_id ? '#' + r.asset_id : '-');
              const nextDate = r.next_reminder ? fmtID(r.next_reminder) + ' ' + r.next_reminder.slice(11, 16) : '-';
              const lastDate = r.last_reminder ? fmtID(r.last_reminder) : '-';
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{displayName}</td>
                  <td style={{ color: r.asset_id ? 'var(--info)' : 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{assetLabel}</td>
                  <td>{getTypeLabel(r.reminder_type, r.reminder_interval)}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{nextDate}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{lastDate}</td>
                  <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.status === 'active' && (
                        <>
                          <button onClick={() => completeReminder(r.id)} title="Selesai"
                            style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                          <button onClick={() => openSnooze(r)} title="Tunda"
                            style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📅</button>
                        </>
                      )}
                      <button onClick={() => openEdit(r)} title="Edit"
                        style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setConfirm({ id: r.id, name: r.title || r.asset_name || 'Reminder' })} title="Hapus"
                        style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal pop-in" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              {form.id ? 'Edit Reminder' : 'Tambah Reminder'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Nama Reminder</label>
                <input type="text" className="input" value={form.title} placeholder="cth: Service laptop, Cek printer..." onChange={e => setField('title', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Kaitkan ke Aset (opsional)</label>
                <select className="input" value={form.asset_id} onChange={e => setField('asset_id', e.target.value)}>
                  <option value="">— Tanpa aset (reminder umum) —</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code ? a.asset_code + ' — ' : ''}{a.item_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Pengulangan</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {REMINDER_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setField('reminder_type', t.id)}
                      style={{
                        padding: '6px 12px', fontSize: 10, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                        background: form.reminder_type === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                        border: form.reminder_type === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        color: form.reminder_type === t.id ? 'var(--accent)' : 'var(--text-muted)',
                      }}>{t.label}</button>
                  ))}
                </div>
              </div>
              {form.reminder_type === 'custom' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Interval (hari)</label>
                  <input type="number" className="input" min={1} value={form.reminder_interval} onChange={e => setField('reminder_interval', parseInt(e.target.value) || 1)} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Tanggal</label>
                  <input type="date" className="input" value={form.next_date} onChange={e => setField('next_date', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Jam</label>
                  <input type="time" className="input" value={form.next_time} onChange={e => setField('next_time', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Catatan</label>
                <input type="text" className="input" value={form.notes} placeholder="cth: Ganti thermal paste, Update firmware..." onChange={e => setField('notes', e.target.value)} />
              </div>
            </div>
            {formError && (
              <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: 'var(--danger)', borderRadius: 10, padding: '9px 12px', fontSize: 11.5 }}>{formError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)} style={{ fontSize: 12 }}>Batal</button>
              <button className="btn-primary" onClick={save} disabled={saving} style={{ fontSize: 12 }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Snooze Date Picker */}
      {snoozeTarget && (
        <div className="modal-overlay" onClick={() => setSnoozeTarget(null)}>
          <div className="modal pop-in" style={{ maxWidth: 380, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📅 Tunda Reminder</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              {snoozeTarget.title || snoozeTarget.asset_name || 'Reminder'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {getNextDates().map(d => (
                <button key={d.value} onClick={() => doSnooze(d.value)}
                  style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.target.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                >{d.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setSnoozeTarget(null)} style={{ fontSize: 12 }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal title="Hapus Reminder"
          message={`Hapus reminder "${confirm.name}"?`}
          onConfirm={remove} onCancel={() => setConfirm(null)} />
      )}
    </main>
  );
}
