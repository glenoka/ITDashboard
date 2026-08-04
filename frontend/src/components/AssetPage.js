import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import MarkdownExportModal from './MarkdownExportModal';
import { toMarkdownTable, fmtID, rupiah } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const STATUS_META = {
  active:  { label: 'DIPAKAI', color: '#22C55E', bg: '#22C55E22' },
  standby: { label: 'STANDBY', color: '#38BDF8', bg: '#38BDF822' },
  repair:  { label: 'PERBAIKAN', color: '#F59E0B', bg: '#F59E0B22' },
  disposed:{ label: 'DIHAPUS', color: '#64748B', bg: '#64748B22' },
};

const CATEGORIES = ['Umum', 'Komputer', 'Jaringan', 'CCTV', 'Printer', 'UPS', 'Lainnya'];

const EMPTY_FORM = { id: null, asset_code: '', item_name: '', brand: '', model: '', serial_no: '', category: 'Umum', location: '', purchase_date: '', purchase_price: 0, warranty_end: '', pic: '', status: 'active', notes: '' };

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
      <label style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} className="input" value={form[key] ?? ''} placeholder={placeholder} onChange={e => setField(key, e.target.value)} />
    </div>
  );

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[{ id: 'all', label: 'SEMUA' }, { id: 'active', label: 'DIPAKAI' }, { id: 'standby', label: 'STANDBY' }, { id: 'repair', label: 'PERBAIKAN' }, { id: 'disposed', label: 'DIHAPUS' }].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                border: filter === s.id ? '1px solid #22C55E' : '1px solid #334155',
                background: filter === s.id ? '#22C55E22' : 'transparent',
                color: filter === s.id ? '#22C55E' : '#64748B',
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
          <button className="btn-ghost" onClick={doExport} style={{ fontSize: 11, padding: '8px 14px' }}>⬇ EXPORT MD</button>
          <button className="btn-primary" onClick={openAdd} style={{ fontSize: 11, padding: '8px 14px' }}>+ TAMBAH ASET</button>
        </div>
      </div>

      {/* Table */}
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
              <tr><td colSpan={11} style={{ textAlign: 'center', color: '#64748B', padding: 32 }}>
                Belum ada aset terdaftar. Klik "+ TAMBAH ASET" atau tandai order "TIBA → ASET".
              </td></tr>
            )}
            {loading && <tr><td colSpan={11} style={{ textAlign: 'center', color: '#64748B', padding: 32 }}>Memuat...</td></tr>}
            {assets.map(a => {
              const st = STATUS_META[a.status] || STATUS_META.active;
              return (
                <tr key={a.id}>
                  <td style={{ color: '#38BDF8', fontWeight: 600 }}>{a.asset_code || '-'}</td>
                  <td style={{ fontWeight: 600, color: '#E2E8F0' }}>{a.item_name}</td>
                  <td>{a.brand || '-'}</td>
                  <td>{a.serial_no || '-'}</td>
                  <td>{a.category || '-'}</td>
                  <td>{a.location || '-'}</td>
                  <td>{fmtID(a.purchase_date)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{rupiah(a.purchase_price)}</td>
                  <td>{a.pic || '-'}</td>
                  <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(a)} style={{ background: '#38BDF822', color: '#38BDF8', border: '1px solid #38BDF844', borderRadius: 5, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>EDIT</button>
                      <button onClick={() => setConfirm({ id: a.id, name: a.item_name })} style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444', borderRadius: 5, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>HAPUS</button>
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
          <div className="modal" style={{ maxWidth: 660, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', marginBottom: 16 }}>
              {form.id ? 'EDIT ASET' : 'TAMBAH ASET'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('KODE ASET (kosong = otomatis)', 'asset_code', 'text', 'cth: AST-20260804-001')}
              {field('NAMA BARANG *', 'item_name', 'text', 'cth: Laptop ThinkPad X1')}
              {field('BRAND', 'brand')}
              {field('MODEL', 'model')}
              {field('SERIAL NUMBER', 'serial_no')}
              <div>
                <label style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>KATEGORI</label>
                <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {field('LOKASI', 'location', 'text', 'cth: Ruang Server')}
              {field('TGL PEMBELIAN', 'purchase_date', 'date')}
              {field('HARGA (Rp)', 'purchase_price', 'number')}
              {field('MASA GARANSI S/D', 'warranty_end', 'date')}
              {field('PIC / PENGGUNA', 'pic', 'text', 'cth: Budi')}
              {field('CATATAN', 'notes', 'text', 'opsional', true)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <button key={k} onClick={() => setField('status', k)} type="button"
                  style={{
                    padding: '6px 12px', fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                    background: form.status === k ? v.bg : 'transparent',
                    border: form.status === k ? `1px solid ${v.color}` : '1px solid #334155',
                    color: form.status === k ? v.color : '#64748B',
                  }}>{v.label}</button>
              ))}
            </div>
            {formError && (
              <div style={{ marginTop: 12, background: '#EF444422', border: '1px solid #EF444433', color: '#EF4444', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>{formError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)} style={{ fontSize: 12 }}>BATAL</button>
              <button className="btn-primary" onClick={save} disabled={saving} style={{ fontSize: 12 }}>{saving ? 'MENYIMPAN...' : 'SIMPAN'}</button>
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
