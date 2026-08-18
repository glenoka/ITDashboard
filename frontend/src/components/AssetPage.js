import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import MarkdownExportModal from './MarkdownExportModal';
import Icon from './Icon';
import { toMarkdownTable, fmtID, rupiah } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const STATUS_META = {
  active:  { label: 'Dipakai', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
  standby: { label: 'Standby', color: 'var(--info)', bg: 'rgba(59,130,246,0.12)' },
  repair:  { label: 'Perbaikan', color: 'var(--warning)', bg: 'rgba(251,191,36,0.12)' },
  disposed:{ label: 'Dihapus', color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
};

const CATEGORIES = ['Umum', 'Komputer', 'Jaringan', 'CCTV', 'Printer', 'UPS', 'Lainnya'];

const REMINDER_TYPES = [
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

const EMPTY_FORM = { id: null, asset_code: '', item_name: '', brand: '', model: '', serial_no: '', category: 'Umum', location: '', purchase_date: '', purchase_price: 0, warranty_end: '', pic: '', status: 'active', notes: '' };

const EMPTY_REMINDER_FORM = { id: null, asset_id: '', reminder_type: 'monthly', reminder_interval: 1, next_reminder: '', notes: '' };

export default function AssetPage({ wsRef }) {
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [exportData, setExportData] = useState(null);

  // Reminder state
  const [activeTab, setActiveTab] = useState('assets');
  const [reminders, setReminders] = useState([]);
  const [remFilter, setRemFilter] = useState('all');
  const [remLoading, setRemLoading] = useState(true);
  const [showRemForm, setShowRemForm] = useState(false);
  const [remForm, setRemForm] = useState(EMPTY_REMINDER_FORM);
  const [remFormError, setRemFormError] = useState('');
  const [savingRem, setSavingRem] = useState(false);
  const [confirmRem, setConfirmRem] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (cat !== 'all') params.set('category', cat);
      if (search) params.set('search', search);
      const res = await axios.get(`${API}/api/assets?${params.toString()}`);
      setAssets(res.data.assets || []);
    } catch (e) {}
    setLoading(false);
  }, [filter, cat, search]);

  const loadReminders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (remFilter !== 'all') params.set('status', remFilter);
      const res = await axios.get(`${API}/api/asset-reminders?${params.toString()}`);
      setReminders(res.data.reminders || []);
    } catch (e) {}
    setRemLoading(false);
  }, [remFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadReminders(); }, [loadReminders]);

  useEffect(() => {
    if (!wsRef?.current) return;
    const onMsg = (e) => {
      const msg = JSON.parse(e.data);
      if (['asset_added', 'asset_updated', 'asset_deleted'].includes(msg.type)) load();
      if (['reminder_added', 'reminder_updated', 'reminder_deleted', 'reminder_completed', 'reminder_snoozed'].includes(msg.type)) loadReminders();
    };
    wsRef.current.addEventListener('message', onMsg);
    return () => wsRef.current?.removeEventListener('message', onMsg);
  }, [wsRef, load, loadReminders]);

  // Asset CRUD
  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); };
  const openEdit = (a) => { setForm({ ...EMPTY_FORM, ...a }); setFormError(''); setShowForm(true); };

  const save = async () => {
    if (!form.item_name.trim()) { setFormError('Nama barang wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = { ...form, purchase_price: parseFloat(form.purchase_price) || 0 };
      let res;
      if (form.id) res = await axios.put(`${API}/api/assets/${form.id}`, payload);
      else res = await axios.post(`${API}/api/assets`, payload);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e?.response?.data?.error || 'Gagal menyimpan aset');
    }
    setSaving(false);
  };

  const remove = async () => {
    try { await axios.delete(`${API}/api/assets/${confirm.id}`); } catch (e) {}
    setConfirm(null);
    load();
  };

  const doExport = () => {
    const headers = ['Kode', 'Barang', 'Brand', 'Serial', 'Kategori', 'Lokasi', 'Tgl Beli', 'Harga', 'PIC', 'Status'];
    const rows = assets.map(a => [
      a.asset_code || '-', a.item_name, a.brand || '-', a.serial_no || '-', a.category || '-',
      a.location || '-', fmtID(a.purchase_date), rupiah(a.purchase_price), a.pic || '-',
      STATUS_META[a.status]?.label || a.status,
    ]);
    const markdown = toMarkdownTable({
      title: `Daftar Aset IT (${new Date().toLocaleDateString('id-ID')})`,
      subtitle: `Total ${assets.length} aset`,
      headers, rows,
    });
    setExportData({ title: 'Export Markdown — Aset IT', markdown });
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const field = (label, key, type = 'text', placeholder = '', span = false) => (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} className="input" value={form[key] ?? ''} placeholder={placeholder} onChange={e => setField(key, e.target.value)} />
    </div>
  );

  // Reminder CRUD
  const openAddReminder = () => { setRemForm(EMPTY_REMINDER_FORM); setRemFormError(''); setShowRemForm(true); };
  const openEditReminder = (r) => {
    setRemForm({
      id: r.id,
      asset_id: r.asset_id || '',
      reminder_type: r.reminder_type || 'monthly',
      reminder_interval: r.reminder_interval || 1,
      next_reminder: r.next_reminder ? r.next_reminder.slice(0, 10) : '',
      notes: r.notes || '',
    });
    setRemFormError('');
    setShowRemForm(true);
  };

  const saveReminder = async () => {
    if (!remForm.asset_id) { setRemFormError('Aset wajib dipilih'); return; }
    setSavingRem(true);
    try {
      const payload = { ...remForm, asset_id: parseInt(remForm.asset_id), reminder_interval: parseInt(remForm.reminder_interval) || 1 };
      if (remForm.id) await axios.put(`${API}/api/asset-reminders/${remForm.id}`, payload);
      else await axios.post(`${API}/api/asset-reminders`, payload);
      setShowRemForm(false);
      loadReminders();
    } catch (e) {
      setRemFormError(e?.response?.data?.error || 'Gagal menyimpan reminder');
    }
    setSavingRem(false);
  };

  const removeReminder = async () => {
    try { await axios.delete(`${API}/api/asset-reminders/${confirmRem.id}`); } catch (e) {}
    setConfirmRem(null);
    loadReminders();
  };

  const snoozeReminder = async (id, date) => {
    try {
      await axios.post(`${API}/api/asset-reminders/${id}/snooze`, { date });
      loadReminders();
    } catch (e) {}
  };

  const completeReminder = async (id) => {
    try {
      await axios.post(`${API}/api/asset-reminders/${id}/complete`);
      loadReminders();
    } catch (e) {}
  };

  const setRemField = (k, v) => setRemForm(f => ({ ...f, [k]: v }));

  const tabBtnStyle = (active) => ({
    padding: '7px 16px', fontSize: 11, fontWeight: 700, borderRadius: 999, cursor: 'pointer', border: 'none',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--input-bg)', borderRadius: 12, width: 'fit-content' }}>
        <button onClick={() => setActiveTab('assets')} style={tabBtnStyle(activeTab === 'assets')}>
          <Icon name="Boxes" size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Aset IT
        </button>
        <button onClick={() => setActiveTab('reminders')} style={tabBtnStyle(activeTab === 'reminders')}>
          <Icon name="Bell" size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Reminder Maintenance
        </button>
      </div>

      {/* ═══ ASSETS TAB ═══ */}
      {activeTab === 'assets' && (
        <>
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[{ id: 'all', label: 'Semua' }, { id: 'active', label: 'Dipakai' }, { id: 'standby', label: 'Standby' }, { id: 'repair', label: 'Perbaikan' }, { id: 'disposed', label: 'Dihapus' }].map(s => (
                <button key={s.id} onClick={() => setFilter(s.id)}
                  style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                    border: filter === s.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: filter === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: filter === s.id ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{s.label}</button>
              ))}
              <select className="input" style={{ width: 150, marginLeft: 4 }} value={cat} onChange={e => setCat(e.target.value)}>
                <option value="all">Semua kategori</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input className="input" style={{ width: 220 }} placeholder="Cari kode / barang / serial..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn-ghost" onClick={doExport} style={{ fontSize: 11, padding: '8px 14px' }}>⬇ Export Markdown</button>
              <button className="btn-primary" onClick={openAdd} style={{ fontSize: 11, padding: '8px 14px' }}>+ Tambah Aset</button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Kode Aset</th><th>Barang</th><th>Brand</th><th>Serial</th><th>Kategori</th>
                  <th>Lokasi</th><th>Tgl Beli</th><th>Harga</th><th>PIC</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!loading && assets.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Belum ada aset terdaftar. Klik "+ Tambah Aset" atau tandai order "Tiba → Aset".
                  </td></tr>
                )}
                {loading && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Memuat...</td></tr>}
                {assets.map(a => {
                  const st = STATUS_META[a.status] || STATUS_META.active;
                  return (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--info)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{a.asset_code || '-'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{a.item_name}</td>
                      <td>{a.brand || '-'}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{a.serial_no || '-'}</td>
                      <td>{a.category || '-'}</td>
                      <td>{a.location || '-'}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{fmtID(a.purchase_date)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>{rupiah(a.purchase_price)}</td>
                      <td>{a.pic || '-'}</td>
                      <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(a)} style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.30)', borderRadius: 999, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setConfirm({ id: a.id, name: a.item_name })} style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 999, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal pop-in" style={{ maxWidth: 660, padding: 24 }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                  {form.id ? 'Edit Aset' : 'Tambah Aset'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {field('Kode Aset (kosong = otomatis)', 'asset_code', 'text', 'cth: AST-20260804-001')}
                  {field('Nama Barang *', 'item_name', 'text', 'cth: Laptop ThinkPad X1')}
                  {field('Brand', 'brand')}
                  {field('Model', 'model')}
                  {field('Serial Number', 'serial_no')}
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Kategori</label>
                    <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {field('Lokasi', 'location', 'text', 'cth: Ruang Server')}
                  {field('Tgl Pembelian', 'purchase_date', 'date')}
                  {field('Harga (Rp)', 'purchase_price', 'number')}
                  {field('Masa Garansi S/D', 'warranty_end', 'date')}
                  {field('PIC / Pengguna', 'pic', 'text', 'cth: Budi')}
                  {field('Catatan', 'notes', 'text', 'opsional', true)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <button key={k} onClick={() => setField('status', k)} type="button"
                      style={{
                        padding: '6px 12px', fontSize: 10, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                        background: form.status === k ? v.bg : 'transparent',
                        border: form.status === k ? `1px solid ${v.color}` : '1px solid var(--border)',
                        color: form.status === k ? v.color : 'var(--text-muted)',
                      }}>{v.label}</button>
                  ))}
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

          {confirm && (
            <ConfirmModal title="Hapus Aset"
              message={`Hapus aset "${confirm.name}"?`}
              onConfirm={remove} onCancel={() => setConfirm(null)} />
          )}

          {exportData && (
            <MarkdownExportModal title={exportData.title} markdown={exportData.markdown} onClose={() => setExportData(null)} />
          )}
        </>
      )}

      {/* ═══ REMINDERS TAB ═══ */}
      {activeTab === 'reminders' && (
        <>
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[{ id: 'all', label: 'Semua' }, { id: 'active', label: 'Aktif' }, { id: 'completed', label: 'Selesai' }, { id: 'paused', label: 'Jeda' }].map(s => (
                <button key={s.id} onClick={() => setRemFilter(s.id)}
                  style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                    border: remFilter === s.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: remFilter === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: remFilter === s.id ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{s.label}</button>
              ))}
            </div>
            <button className="btn-primary" onClick={openAddReminder} style={{ fontSize: 11, padding: '8px 14px' }}>+ Tambah Reminder</button>
          </div>

          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Aset</th><th>Tipe</th><th>Interval</th><th>Tgl Berikutnya</th><th>Tgl Terakhir</th><th>Status</th><th>Catatan</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!remLoading && reminders.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Belum ada reminder maintenance. Klik "+ Tambah Reminder" untuk membuat.
                  </td></tr>
                )}
                {remLoading && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Memuat...</td></tr>}
                {reminders.map(r => {
                  const st = REMINDER_STATUS[r.status] || REMINDER_STATUS.active;
                  const typeLabel = REMINDER_TYPES.find(t => t.id === r.reminder_type)?.label || r.reminder_type;
                  const nextDate = r.next_reminder ? fmtID(r.next_reminder) : '-';
                  const lastDate = r.last_reminder ? fmtID(r.last_reminder) : '-';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.asset_name || r.asset_item_name || 'Aset #' + r.asset_id}</td>
                      <td>{typeLabel}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{r.reminder_type === 'custom' ? `${r.reminder_interval} hari` : typeLabel}</td>
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
                              <button onClick={() => {
                                const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                                snoozeReminder(r.id, tomorrow.toISOString().slice(0, 10));
                              }} title="Tunda 1 hari"
                                style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>+1h</button>
                            </>
                          )}
                          <button onClick={() => openEditReminder(r)} title="Edit"
                            style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setConfirmRem({ id: r.id, name: r.asset_name || 'Aset #' + r.asset_id })} title="Hapus"
                            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Reminder Form Modal */}
          {showRemForm && (
            <div className="modal-overlay" onClick={() => setShowRemForm(false)}>
              <div className="modal pop-in" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                  {remForm.id ? 'Edit Reminder' : 'Tambah Reminder Maintenance'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Aset *</label>
                    <select className="input" value={remForm.asset_id} onChange={e => setRemField('asset_id', e.target.value)}>
                      <option value="">— Pilih Aset —</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code ? a.asset_code + ' — ' : ''}{a.item_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Tipe Pengulangan</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {REMINDER_TYPES.map(t => (
                        <button key={t.id} type="button" onClick={() => setRemField('reminder_type', t.id)}
                          style={{
                            padding: '6px 12px', fontSize: 10, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                            background: remForm.reminder_type === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                            border: remForm.reminder_type === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                            color: remForm.reminder_type === t.id ? 'var(--accent)' : 'var(--text-muted)',
                          }}>{t.label}</button>
                      ))}
                    </div>
                  </div>
                  {remForm.reminder_type === 'custom' && (
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Interval (hari)</label>
                      <input type="number" className="input" min={1} value={remForm.reminder_interval} onChange={e => setRemField('reminder_interval', parseInt(e.target.value) || 1)} />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Tanggal Mulai / Berikutnya</label>
                    <input type="date" className="input" value={remForm.next_reminder} onChange={e => setRemField('next_reminder', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Catatan</label>
                    <input type="text" className="input" value={remForm.notes} placeholder="cth: Ganti thermal paste, cek kabel..." onChange={e => setRemField('notes', e.target.value)} />
                  </div>
                </div>
                {remFormError && (
                  <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: 'var(--danger)', borderRadius: 10, padding: '9px 12px', fontSize: 11.5 }}>{remFormError}</div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn-ghost" onClick={() => setShowRemForm(false)} style={{ fontSize: 12 }}>Batal</button>
                  <button className="btn-primary" onClick={saveReminder} disabled={savingRem} style={{ fontSize: 12 }}>{savingRem ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
              </div>
            </div>
          )}

          {confirmRem && (
            <ConfirmModal title="Hapus Reminder"
              message={`Hapus reminder untuk "${confirmRem.name}"?`}
              onConfirm={removeReminder} onCancel={() => setConfirmRem(null)} />
          )}
        </>
      )}
    </main>
  );
}
