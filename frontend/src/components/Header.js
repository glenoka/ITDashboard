import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { ALL_TABS } from '../utils/tabs';

export default function Header({ wsStatus, notifStatus, onRequestNotif, activePage, onChangePage, onLogout, onOpenSettings, hiddenTabs }) {
  const [time, setTime] = useState(new Date());
  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const wsColor = wsStatus === 'connected' ? 'var(--success)' : wsStatus === 'connecting' ? 'var(--warning)' : 'var(--danger)';
  const wsLabel = wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Menghubung' : 'Offline';
  const notifColor = notifStatus === 'granted' ? 'var(--success)' : notifStatus === 'denied' ? 'var(--danger)' : 'var(--warning)';

  const PAGE_TITLES = {
    dashboard: 'Ringkasan Operasional',
    hosts: 'Host Connection',
    cctv: 'CCTV Monitoring',
    unifi: 'UniFi Controller',
    ruijie: 'Ruijie Cloud',
    procurement: 'PR / Order — Market List',
    asset: 'Inventaris Aset IT',
    history: 'Status History Log',
    sop: 'SOP & Policy IT',
    checklist: 'Checklist IT',
  };

  const TABS = ALL_TABS.filter(t => !hiddenTabs.includes(t.id));

  return (
    <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
      {/* Top bar */}
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between" style={{ gap: 6 }}>
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3" style={{ minWidth: 0, flexShrink: 1 }}>
          <div style={{
            width: 28, height: 28, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.30)', color: 'var(--on-accent)',
          }}>
            <Icon name="Hexagon" size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--text)', letterSpacing: '0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>
              Dashboard IT
            </div>
            <div className="hidden sm:block" style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.12em', marginTop: 3 }}>
              SYSTEM MONITORING & ASSET
            </div>
          </div>
        </div>

        {/* Page title - hidden on mobile */}
        {PAGE_TITLES[activePage] && (
          <div className="hidden lg:block" style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
            {PAGE_TITLES[activePage]}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2" style={{ flexShrink: 1 }}>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: wsColor }} />
            <span style={{ fontSize: 10, color: wsColor, fontWeight: 600 }}>{wsLabel}</span>
          </div>
          <div className="hidden sm:block" style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>
            {time.toLocaleTimeString('id-ID', { hour12: false })}
          </div>
          {notifStatus !== 'unsupported' && (
            <button title={notifStatus === 'granted' ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
              onClick={notifStatus !== 'granted' ? onRequestNotif : undefined}
              className="hidden sm:flex"
              style={{ background: 'var(--hover)', border: `1px solid ${notifColor}44`, borderRadius: 8, padding: '5px 9px', cursor: notifStatus !== 'granted' ? 'pointer' : 'default', alignItems: 'center', gap: 5 }}>
              <Icon name={notifStatus === 'granted' ? 'Bell' : 'BellOff'} size={14} color={notifColor} />
              <span style={{ fontSize: 9, color: notifColor, fontWeight: 700 }}>{notifStatus === 'granted' ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={13} />
          </button>
          <button onClick={onOpenSettings} title="Pengaturan"
            style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Icon name="Settings" size={13} />
          </button>
          <button onClick={onLogout} title="Keluar"
            className="hidden sm:flex"
            style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', alignItems: 'center', gap: 5 }}>
            <Icon name="LogOut" size={13} /> Logout
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '4px 10px', overflowX: 'auto', display: 'flex', gap: 3, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(tab => {
          const isActive = activePage === tab.id;
          return (
            <button key={tab.id} onClick={() => onChangePage(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', whiteSpace: 'nowrap',
                fontSize: 10.5, fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.30)' : 'transparent'}`,
                borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
              <Icon name={tab.icon} size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
