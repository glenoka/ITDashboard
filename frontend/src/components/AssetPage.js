import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import MarkdownExportModal from './MarkdownExportModal';
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

const EMPTY_FORM = { id: null, asset_code: '', item_name: '', brand: '', model: '', serial_no: '', category: 'Umum', location: '', purchase_date: '', purchase_price: 0, warranty_end: '', pic: '', status: 'active', notes: '' };

const EMPTY_REMINDER = { asset_id: null, reminder_type: 'monthly', reminder_interval: 1, next_reminder: '', notes: '' };

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

  const [showRemPopup, setShowRemPopup] = useState(false);
  const [remTarget, setRemTarget] = useState(null);
  const [remForm, setRemForm] = useState(EMPTY_REMINDER);
  const [remError, setRemError] = useState('');
  const [savingRem, setSavingRem] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!wsRef?.current) return;
    const onMsg = (e) => {
      const msg = JSON.parse(e.data);
      if (['asset_added', 'asset_updated', 'asset_deleted'].includes(msg.type)) load();
    };
    wsRef.current.addEventListener('message', onMsg);
    return () => wsRef.current?.removeEventListener('message', onMsg);
  }, [wsRef, load]);

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); };
  const openEdit = (a) => { setForm({ ...EMPTY_FORM, ...a }); setFormError(''); setShowForm(true); };

  const save = async () => {
    if (!form.item_name.trim()) { setFormError('Nama barang wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = { ...form, purchase_price: parseFloat(form.purchase_price) || 0 };
      if (form.id) await axios.put(`${API}/api/assets/${form.id}`, payload);
      else await axios.post(`${API}/api/assets`, payload);
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

  const openMaintenance = (asset) => {
    setRemTarget(asset);
    const today = new Date().toISOString().slice(0, 10);
    setRemForm({ asset_id: asset.id, reminder_type: 'monthly', reminder_interval: 1, next_reminder: today, notes: '' });
    setRemError('');
    setShowRemPopup(true);
  };

  const saveReminder = async () => {
    if (!remForm.next_reminder) { setRemError('Tanggal wajib diisi'); return; }
    setSavingRem(true);
    try {
      await axios.post(`${API}/api/asset-reminders`, {
        asset_id: remTarget.id,
        reminder_type: remForm.reminder_type,
        reminder_interval: parseInt(remForm.reminder_interval) || 1,
        next_reminder: remForm.next_reminder + ' 08:00:00',
        notes: remForm.notes,
      });
      setShowRemPopup(false);
    } catch (e) {
      setRemError(e?.response?.data?.error || 'Gagal menyimpan reminder');
    }
    setSavingRem(false);
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
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
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => openMaintenance(a)} title="Maintenance"
                        style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>🔧</button>
                      <button onClick={() => openEdit(a)} title="Edit"
                        style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setConfirm({ id: a.id, name: a.item_name })} title="Hapus"
                        style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Asset Modal */}
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

      {/* Maintenance Reminder Popup */}
      {showRemPopup && remTarget && (
        <div className="modal-overlay" onClick={() => setShowRemPopup(false)}>
          <div className="modal pop-in" style={{ maxWidth: 420, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Maintenance Reminder</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              {remTarget.asset_code ? remTarget.asset_code + ' — ' : ''}{remTarget.item_name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Tanggal Mulai</label>
                <input type="date" className="input" value={remForm.next_reminder} onChange={e => setRemForm(f => ({ ...f, next_reminder: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Pengulangan</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {REMINDER_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setRemForm(f => ({ ...f, reminder_type: t.id }))}
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
                  <input type="number" className="input" min={1} value={remForm.reminder_interval} onChange={e => setRemForm(f => ({ ...f, reminder_interval: parseInt(e.target.value) || 1 }))} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Catatan</label>
                <input type="text" className="input" value={remForm.notes} placeholder="cth: Ganti thermal paste, cek kabel..." onChange={e => setRemForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            {remError && (
              <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: 'var(--danger)', borderRadius: 10, padding: '9px 12px', fontSize: 11.5 }}>{remError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setShowRemPopup(false)} style={{ fontSize: 12 }}>Batal</button>
              <button className="btn-primary" onClick={saveReminder} disabled={savingRem} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {savingRem ? 'Menyimpan...' : '🔔 Simpan Reminder'}
              </button>
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
    </main>
  );
}
