import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal masuk. Periksa password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            ⬡
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#E2E8F0' }}>DASHBOARD IT</div>
            <div style={{ fontSize: 9, color: '#22C55E', fontWeight: 600, letterSpacing: '0.15em' }}>SYSTEM MONITORING & ASSET</div>
          </div>
        </div>

        <label style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>PASSWORD</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan password admin"
          autoFocus
        />

        {error && (
          <div style={{ marginTop: 12, background: '#EF444422', border: '1px solid #EF444433', color: '#EF4444', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading || !password}
          style={{ width: '100%', marginTop: 20, fontSize: 12, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'MEMERIKSA...' : 'MASUK'}
        </button>

        <div style={{ marginTop: 16, fontSize: 10, color: '#475569', textAlign: 'center' }}>
          Akses terbatas untuk tim IT internal
        </div>
      </form>
    </div>
  );
}
