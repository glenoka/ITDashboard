import React, { useState } from 'react';
import axios from 'axios';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

export default function ChangePasswordModal({ onClose }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setIsErr(false);
    if (!oldPw || !newPw) { setMsg('Isi semua field'); setIsErr(true); return; }
    if (newPw.length < 4) { setMsg('Password baru minimal 4 karakter'); setIsErr(true); return; }
    if (newPw !== confirmPw) { setMsg('Konfirmasi password baru tidak cocok'); setIsErr(true); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/api/auth/change-password`, { old_password: oldPw, new_password: newPw });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Gagal mengubah password');
      setIsErr(true);
    }
    setSaving(false);
  };

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)',
    border: '1px solid var(--border)', color: 'var(--text)',
    padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pop-in" style={{ maxWidth: 380, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Icon name="Key" size={18} color="var(--accent)" />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Ubah Password</span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Icon name="CheckCircle2" size={36} color="var(--success)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Password berhasil diubah!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>Password Lama</div>
            <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
              style={fieldStyle} autoFocus />
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6, marginTop: 14 }}>Password Baru</div>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              style={fieldStyle} />
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6, marginTop: 14 }}>Konfirmasi Password Baru</div>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              style={fieldStyle} />

            {msg && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: isErr ? 'var(--danger)' : 'var(--success)',
                background: isErr ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)',
                border: `1px solid ${isErr ? 'rgba(239,68,68,0.30)' : 'rgba(16,185,129,0.30)'}`,
                borderRadius: 8, padding: '8px 12px' }}>
                {msg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" onClick={onClose}
                className="btn-ghost"
                style={{ padding: '8px 16px', fontSize: 12 }}>Batal</button>
              <button type="submit" disabled={saving}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? 'Menyimpan...' : <><Icon name="Save" size={13} /> Simpan</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
