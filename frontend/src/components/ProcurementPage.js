import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import MarkdownExportModal from './MarkdownExportModal';
import { toMarkdownTable, fmtID, rupiah } from '../utils/format';

const API = process.env.REACT_APP_API_URL || '';

const STATUS_META = {
  pr:       { label: 'Pending', color: 'var(--warning)', bg: 'rgba(251,191,36,0.12)' },
  ordered:  { label: 'Dipesan', color: 'var(--info)', bg: 'rgba(59,130,246,0.12)' },
  arrived:  { label: 'Tiba',    color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
  cancelled:{ label: 'Batal',   color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
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
        title: 'Barang Tiba — Jadi Aset',
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
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{label}</label>
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
          {[{ id: 'all', label: 'Semua' }, { id: 'pr', label: 'Pending' }, { id: 'ordered', label: 'Dipesan' }, { id: 'arrived', label: 'Tiba' }, { id: 'cancelled', label: 'Batal' }].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                border: filter === s.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: filter === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: filter === s.id ? 'var(--accent)' : 'var(--text-muted)',
              }}>{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input className="input" style={{ width: 220 }} placeholder="Cari barang / vendor / no PR..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-ghost" onClick={doExport} style={{ fontSize: 11, padding: '8px 14px' }}>⬇ Export Markdown</button>
          <button className="btn-primary" onClick={openAdd} style={{ fontSize: 11, padding: '8px 14px' }}>+ Buat Order</button>
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
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                Belum ada data order. Klik "+ Buat Order" untuk menambahkan PR/order.
              </td></tr>
            )}
            {loading && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Memuat...</td></tr>}
            {orders.map(o => {
              const st = STATUS_META[o.status] || STATUS_META.pr;
              return (
                <tr key={o.id}>
                  <td style={{ color: 'var(--info)', fontFamily: 'var(--mono)' }}>{o.no_pr || '-'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{o.item_name}</td>
                  <td>{o.brand || '-'}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{o.qty}{o.unit ? ` ${o.unit}` : ''}</td>
                  <td>{o.vendor || '-'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>{rupiah(o.price)}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{fmtID(o.order_date)}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{fmtID(o.est_arrival)}</td>
                  <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status !== 'arrived' && o.status !== 'cancelled' && (
                        <button onClick={() => arrive(o.id)} disabled={arrivingId === o.id}
                          style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.30)', borderRadius: 999, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                          {arrivingId === o.id ? '...' : 'Tiba → Aset'}
                        </button>
                      )}
                      <button onClick={() => openEdit(o)} style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.30)', borderRadius: 999, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setConfirm({ id: o.id, name: o.item_name })} style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 999, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Hapus</button>
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
          <div className="modal pop-in" style={{ maxWidth: 620, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              {form.id ? 'Edit Order' : 'Buat Order / PR'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('No PR', 'no_pr', 'text', 'cth: PR-2026-001')}
              {field('Nama Barang *', 'item_name', 'text', 'cth: Laptop ThinkPad')}
              {field('Brand', 'brand')}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Jumlah</label>
                <input type="number" className="input" min="1" value={form.qty} onChange={e => setField('qty', e.target.value)} />
              </div>
              {field('Satuan', 'unit', 'text', 'pcs')}
              {field('Vendor / Supplier', 'vendor')}
              {field('Harga (Rp)', 'price', 'number', '0')}
              {field('Tgl Pesan', 'order_date', 'date')}
              {field('Estimasi Tiba', 'est_arrival', 'date')}
              {field('Catatan', 'notes', 'text', 'opsional', true)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {['pr', 'ordered', 'arrived', 'cancelled'].map(s => (
                <button key={s} onClick={() => setField('status', s)} type="button"
                  style={{
                    padding: '6px 12px', fontSize: 10, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                    background: form.status === s ? STATUS_META[s].bg : 'transparent',
                    border: form.status === s ? `1px solid ${STATUS_META[s].color}` : '1px solid var(--border)',
                    color: form.status === s ? STATUS_META[s].color : 'var(--text-muted)',
                  }}>{STATUS_META[s].label}</button>
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
