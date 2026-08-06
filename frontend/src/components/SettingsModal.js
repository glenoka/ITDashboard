import React from 'react';
import Icon from './Icon';
import { ALL_TABS } from '../utils/tabs';

export default function SettingsModal({ hiddenTabs, onToggleTab, onClose, onChangePassword, onOpenTelegram }) {
  const toggleStyle = (on) => ({
    width: 34, height: 19, borderRadius: 999, padding: 0, cursor: 'pointer',
    background: on ? 'var(--accent)' : 'var(--border)', border: 'none', position: 'relative',
    transition: 'background 0.15s', flexShrink: 0,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pop-in" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Icon name="Settings" size={18} color="var(--accent)" />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Pengaturan</span>
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 8 }}>
          Menu / Tab yang Ditampilkan
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ALL_TABS.map(tab => {
            const hidden = hiddenTabs.includes(tab.id);
            const locked = tab.id === 'dashboard';
            return (
              <div key={tab.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10,
                  background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                <Icon name={tab.icon} size={14} color={hidden ? 'var(--text-faint)' : 'var(--text-muted)'} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600,
                  color: hidden ? 'var(--text-faint)' : 'var(--text)' }}>
                  {tab.label}
                  {locked && <span style={{ fontSize: 9, color: 'var(--text-faint)', marginLeft: 8 }}>selalu tampil</span>}
                </span>
                <button
                  onClick={() => !locked && onToggleTab(tab.id)}
                  disabled={locked}
                  style={toggleStyle(!hidden)}
                  aria-label={`Tampilkan ${tab.label}`}>
                  <span style={{
                    position: 'absolute', top: 3, left: !hidden ? 18 : 3, width: 13, height: 13,
                    borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                    transition: 'left 0.15s',
                  }} />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onChangePassword}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12,
              background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            <Icon name="Key" size={13} /> Ubah Password
          </button>
          <button onClick={onOpenTelegram}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12,
              background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            <Icon name="Send" size={13} /> Notifikasi Telegram
          </button>
          <button onClick={onClose} className="btn-primary" style={{ marginLeft: 'auto', padding: '8px 20px', fontSize: 12 }}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
