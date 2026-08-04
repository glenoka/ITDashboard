import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import MarkdownExportModal from './MarkdownExportModal';
import { toMarkdownTable, fmtID, rupiah } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const STATUS_META = {
  pr:       { label: 'PENDING', color: '#F59E0B', bg: '#F59E0B22' },
  ordered:  { label: 'ORDERED', color: '#38BDF8', bg: '#38BDF822' },
  arrived:  { label: 'TIBA',    color: '#22C55E', bg: '#22C55E22' },
  cancelled:{ label: 'BATAL',   color: '#64748B', bg: '#64748B22' },
};

const EMPTY_FORM = { id: null, no_pr: '', item_name: '', brand: '', qty: 1, unit: '', vendor: '', price: 0, order_date: '', est_arrival: '', status: 'pr', notes: '' };

export default function ProcurementPage({ wsRef }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [arrivingId, setArrivingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);
      const res = await axios.get(`${API}/api/orders?${params.toString()}`);
      setOrders(res.data.orders || []);
    } catch (e) {}
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!wsRef?.current) return;
    const onMsg = (e) => {
      const msg = JSON.parse(e.data);
      if (['order_added', 'order_updated', 'order_deleted'].includes(msg.type)) load();
    };
    wsRef.current.addEventListener('message', onMsg);
    return () => wsRef.current?.removeEventListener('message', onMsg);
  }, [wsRef, load]);

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); };
  const openEdit = (o) => {
    setForm({ ...EMPTY_FORM, ...o });
    setFormError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.item_name.trim()) { setFormError('Nama barang wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = { ...form, qty: parseInt(form.qty) || 1, price: parseFloat(form.price) || 0 };
      if (form.id) await axios.put(`${API}/api/orders/${form.id}`, payload);
      else await axios.post(`${API}/api/orders`, payload);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e?.response?.data?.error || 'Gagal menyimpan order');
    }
    setSaving(false);
  };

  const remove = async () => {
    try { await axios.delete(`${API}/api/orders/${confirm.id}`); } catch (e) {}
    setConfirm(null);
    load();
  };

  const arrive = async (id) => {
    setArrivingId(id);
    try {
      const res = await axios.post(`${API}/api/orders/${id}/arrive`);
      load();
      setExportData({
        title: '✅ Barang Tiba → Jadi Aset',
        markdown: `*Barang tiba & sudah dicatat sebagai Aset IT (${res.data.assets.length} unit)*\n\n${res.data.assets.map(a => `- ${a.asset_code} — ${a.item_name} (${a.brand || '-'})`).join('\n')}`,
      });
    } catch (e) {
      alert('Gagal menandai tiba: ' + (e?.response?.data?.error || ''));
    }
    setArrivingId(null);
  };

  const doExport = () => {
    const headers = ['No PR', 'Barang', 'Brand', 'Qty', 'Vendor', 'Harga', 'Tgl Pesan', 'Estimasi Tiba', 'Status'];
    const rows = orders.map(o => [
      o.no_pr || '-', o.item_name, o.brand || '-', `${o.qty}${o.unit ? ' ' + o.unit : ''}`,
      o.vendor || '-', rupiah(o.price), fmtID(o.order_date), fmtID(o.est_arrival), STATUS_META[o.status]?.label || o.status,
    ]);
    const markdown = toMarkdownTable({
      title: `Daftar PR/Order (${new Date().toLocaleDateString('id-ID')})`,
      subtitle: `Total ${orders.length} item — status: ${filter === 'all' ? 'semua' : STATUS_META[filter]?.label}`,
      headers, rows,
    });
    setExportData({ title: 'Export Markdown — PR/Order', markdown });
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const field = (label, key, type = 'text', placeholder = '', span = false) => (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <label style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        className="input"
        value={form[key] ?? ''}
        placeholder={placeholder}
        onChange={e => setField(key, e.target.value)}
      />
    </div>
  );

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[{ id: 'all', label: 'SEMUA' }, { id: 'pr', label: 'PENDING' }, { id: 'ordered', label: 'ORDERED' }, { id: 'arrived', label: 'TIBA' }, { id: 'cancelled', label: 'BATAL' }].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                border: filter === s.id ? '1px solid #22C55E' : '1px solid #334155',
                background: filter === s.id ? '#22C55E22' : 'transparent',
                color: filter === s.id ? '#22C55E' : '#64748B',
              }}>{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input className="input" style={{ width: 220 }} placeholder="Cari barang / vendor / no PR..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-ghost" onClick={doExport} style={{ fontSize: 11, padding: '8px 14px' }}>⬇ EXPORT MD</button>
          <button className="btn-primary" onClick={openAdd} style={{ fontSize: 11, padding: '8px 14px' }}>+ BUAT ORDER</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>No PR</th><th>Barang</th><th>Brand</th><th>Qty</th><th>Vendor</th><th>Harga</th>
              <th>Tgl Pesan</th><th>Est. Tiba</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748B', padding: 32 }}>
                Belum ada data order. Klik "+ BUAT ORDER" untuk menambahkan PR/order.
              </td></tr>
            )}
            {loading && <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748B', padding: 32 }}>Memuat...</td></tr>}
            {orders.map(o => {
              const st = STATUS_META[o.status] || STATUS_META.pr;
              return (
                <tr key={o.id}>
                  <td style={{ color: '#38BDF8' }}>{o.no_pr || '-'}</td>
                  <td style={{ fontWeight: 600, color: '#E2E8F0' }}>{o.item_name}</td>
                  <td>{o.brand || '-'}</td>
                  <td>{o.qty}{o.unit ? ` ${o.unit}` : ''}</td>
                  <td>{o.vendor || '-'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{rupiah(o.price)}</td>
                  <td>{fmtID(o.order_date)}</td>
                  <td>{fmtID(o.est_arrival)}</td>
                  <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status !== 'arrived' && o.status !== 'cancelled' && (
                        <button onClick={() => arrive(o.id)} disabled={arrivingId === o.id}
                          style={{ background: '#22C55E22', color: '#22C55E', border: '1px solid #22C55E44', borderRadius: 5, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>
                          {arrivingId === o.id ? '...' : 'TIBA → ASET'}
                        </button>
                      )}
                      <button onClick={() => openEdit(o)} style={{ background: '#38BDF822', color: '#38BDF8', border: '1px solid #38BDF844', borderRadius: 5, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>EDIT</button>
                      <button onClick={() => setConfirm({ id: o.id, name: o.item_name })} style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444', borderRadius: 5, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>HAPUS</button>
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
          <div className="modal" style={{ maxWidth: 620, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', marginBottom: 16 }}>
              {form.id ? 'EDIT ORDER' : 'BUAT ORDER / PR'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('NO PR', 'no_pr', 'text', 'cth: PR-2026-001')}
              {field('NAMA BARANG *', 'item_name', 'text', 'cth: Laptop ThinkPad')}
              {field('BRAND', 'brand')}
              <div>
                <label style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>JUMLAH</label>
                <input type="number" className="input" min="1" value={form.qty} onChange={e => setField('qty', e.target.value)} />
              </div>
              {field('SATUAN', 'unit', 'text', 'pcs')}
              {field('VENDOR / SUPPLIER', 'vendor')}
              {field('HARGA (Rp)', 'price', 'number', '0')}
              {field('TGL PESAN', 'order_date', 'date')}
              {field('ESTIMASI TIBA', 'est_arrival', 'date')}
              {field('CATATAN', 'notes', 'text', 'opsional', true)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['pr', 'ordered', 'arrived', 'cancelled'].map(s => (
                <button key={s} onClick={() => setField('status', s)} type="button"
                  style={{
                    padding: '6px 12px', fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                    background: form.status === s ? STATUS_META[s].bg : 'transparent',
                    border: form.status === s ? `1px solid ${STATUS_META[s].color}` : '1px solid #334155',
                    color: form.status === s ? STATUS_META[s].color : '#64748B',
                  }}>{STATUS_META[s].label}</button>
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
        <ConfirmModal title="Hapus Order"
          message={`Hapus order "${confirm.name}"? Data aset yang sudah dibuat tidak akan terhapus.`}
          onConfirm={remove} onCancel={() => setConfirm(null)} />
      )}

      {exportData && (
        <MarkdownExportModal title={exportData.title} markdown={exportData.markdown} onClose={() => setExportData(null)} />
      )}
    </main>
  );
}
