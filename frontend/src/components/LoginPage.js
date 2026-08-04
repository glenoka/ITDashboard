import React, { useState } from 'react';
import Icon from './Icon';

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
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative glow */}
      <div style={{ position: 'absolute', top: -120, right: -80, width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.16), transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -140, left: -100, width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)' }} />

      <form onSubmit={submit}
        style={{ position: 'relative', width: '100%', maxWidth: 400, padding: 36, borderRadius: 16,
          background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--on-accent)', boxShadow: '0 8px 20px rgba(99,102,241,0.30)', marginBottom: 12,
          }}><Icon name="Hexagon" size={28} /></div>
          <div style={{ fontWeight: 800, fontSize: 19, color: 'var(--text)' }}>Dashboard IT</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em' }}>
            SYSTEM MONITORING & ASSET
          </div>
        </div>

        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Password Admin</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan password admin"
          autoFocus
          style={{ padding: '11px 14px' }}
        />

        {error && (
          <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading || !password}
          style={{ width: '100%', marginTop: 22, fontSize: 13, padding: '11px', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>
          Akses terbatas untuk tim IT internal
        </div>
      </form>
    </div>
  );
}
