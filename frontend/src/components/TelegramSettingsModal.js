import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Icon from './Icon';

const API = process.env.REACT_APP_API_URL || '';

export default function TelegramSettingsModal({ onClose }) {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/notifications/telegram/settings`)
      .then(res => {
        setBotToken(res.data.bot_token || '');
        setChatId(res.data.chat_id || '');
        setEnabled(!!res.data.enabled);
      })
      .catch(() => setMsg('Gagal memuat pengaturan'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(''); setIsErr(false);
    setSaving(true);
    try {
      await axios.put(`${API}/api/notifications/telegram/settings`, { bot_token: botToken, chat_id: chatId, enabled });
      setMsg('Pengaturan tersimpan'); setIsErr(false);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Gagal menyimpan'); setIsErr(true);
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setMsg(''); setIsErr(false);
    setTesting(true);
    try {
      await axios.post(`${API}/api/notifications/telegram/test`);
      setMsg('Pesan uji coba terkirim ke Telegram'); setIsErr(false);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Gagal mengirim test'); setIsErr(true);
    }
    setTesting(false);
  };

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)',
    border: '1px solid var(--border)', color: 'var(--text)',
    padding: '9px 12px', borderRadius: 10, fontSize: 12, outline: 'none',
    fontFamily: 'var(--mono)',
  };

  return (
    <div className="modal-overlay">
      <div className="modal pop-in" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="Send" size={18} color="var(--accent)" />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Notifikasi Telegram</span>
          <button onClick={onClose} title="Tutup"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <Icon name="X" size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-faint)', fontSize: 12 }}>Memuat...</div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>Bot Token</div>
            <input type="password" value={botToken} onChange={e => setBotToken(e.target.value)}
              placeholder="123456789:AAHxxx..." style={fieldStyle} />
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6, marginTop: 12 }}>Chat ID</div>
            <input value={chatId} onChange={e => setChatId(e.target.value)}
              placeholder="123456789" style={fieldStyle} />
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>Grup: -100xxx. Beberapa id dipisah koma.</div>
            <div style={{ fontSize: 10.5, color: 'var(--warning)', marginTop: 4 }}>⚠️ Chat ID adalah ID akun <b>Anda</b> (cek via @userinfobot), bukan ID bot (angka sebelum titik dua di token).</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '8px 10px', borderRadius: 10, background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Aktifkan notifikasi otomatis</span>
              <button type="button" onClick={() => setEnabled(e => !e)}
                style={{ width: 34, height: 19, borderRadius: 999, padding: 0, cursor: 'pointer',
                  background: enabled ? 'var(--accent)' : 'var(--border)', border: 'none', position: 'relative', transition: 'background 0.15s' }}>
                <span style={{ position: 'absolute', top: 3, left: enabled ? 18 : 3, width: 13, height: 13,
                  borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.35)', transition: 'left 0.15s' }} />
              </button>
            </div>

            {msg && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: isErr ? 'var(--danger)' : 'var(--success)',
                background: isErr ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)',
                border: `1px solid ${isErr ? 'rgba(239,68,68,0.30)' : 'rgba(16,185,129,0.30)'}`,
                borderRadius: 8, padding: '8px 12px' }}>
                {msg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={handleTest} disabled={testing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12,
                  background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text)',
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {testing ? 'Mengirim...' : <><Icon name="Send" size={13} /> Kirim Uji Coba</>}
              </button>
              <button type="submit" disabled={saving} className="btn-primary"
                style={{ marginLeft: 'auto', padding: '8px 20px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? 'Menyimpan...' : <><Icon name="Save" size={13} /> Simpan</>}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Perintah di Telegram</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, fontFamily: 'var(--mono)' }}>
            /cctv — daftar kamera<br />
            /cctv 1 — kirim snapshot kamera id 1<br />
            /procurement — barang belum datang<br />
            /checklist — checklist project belum selesai (tekan ✅)<br />
            /project — project masih pending (tekan ✅ untuk tick)<br />
            /project_add (judul) — tambah project baru<br />
            /order_add — tambah order (PR &amp; item)<br />
            /ping (ip) — ping host/ip<br />
            /status — ringkasan host &amp; CCTV<br />
            /stats — ringkasan sistem &amp; bandwidth<br />
            /report — laporan harian<br />
            /backup — kirim backup DB<br />
            /help — bantuan
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>
            Backup DB otomatis jam 02:00 &amp; laporan harian jam 07:00 (rotasi backup: 14 file).
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>
            Cara setup: buat bot di @BotFather → salin token → tekan Start pada bot → cek Chat ID via @userinfobot.
          </div>
        </div>
      </div>
    </div>
  );
}
