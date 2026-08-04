import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

export default function Header({ wsStatus, stats, onAddHost, notifStatus, onRequestNotif, activePage, onChangePage, onLogout }) {
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
    cctv: 'CCTV Monitoring',
    unifi: 'UniFi Controller',
    ruijie: 'Ruijie Cloud',
    procurement: 'PR / Order — Market List',
    asset: 'Inventaris Aset IT',
    history: 'Status History Log',
    sop: 'SOP & Policy IT',
    checklist: 'Checklist IT',
  };

  const TABS = [
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard' },
    { id: 'cctv', icon: 'Video', label: 'CCTV' },
    { id: 'unifi', icon: 'Network', label: 'UniFi' },
    { id: 'ruijie', icon: 'Router', label: 'Ruijie' },
    { id: 'procurement', icon: 'Package', label: 'PR/Order' },
    { id: 'asset', icon: 'Boxes', label: 'Aset IT' },
    { id: 'sop', icon: 'FileText', label: 'SOP' },
    { id: 'checklist', icon: 'ListChecks', label: 'Checklist' },
    { id: 'history', icon: 'History', label: 'History' },
  ];

  return (
    <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
      {/* Top bar */}
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 34, height: 34, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.30)', color: 'var(--on-accent)',
          }}>
            <Icon name="Hexagon" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', letterSpacing: '0.01em', lineHeight: 1 }}>
              Dashboard IT
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.12em', marginTop: 3 }}>
              SYSTEM MONITORING & ASSET
            </div>
          </div>
        </div>

        {/* Center stats — only on dashboard */}
        {activePage === 'dashboard' && (
          <div className="hidden md:flex items-center gap-4">
            <StatPill label="Total" value={stats.total} color="var(--text-muted)" />
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <StatPill label="Up" value={stats.up} color="var(--success)" />
            <StatPill label="Down" value={stats.down} color="var(--danger)" />
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <StatPill label="Availability" value={`${stats.availability}%`} color="var(--text)" />
            <StatPill label="Avg RTT" value={`${stats.avgLatency}ms`} color="var(--text-muted)" />
          </div>
        )}
        {PAGE_TITLES[activePage] && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {PAGE_TITLES[activePage]}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {notifStatus !== 'unsupported' && (
            <button title={notifStatus === 'granted' ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
              onClick={notifStatus !== 'granted' ? onRequestNotif : undefined}
              style={{ background: 'var(--hover)', border: `1px solid ${notifColor}44`, borderRadius: 8, padding: '5px 9px', cursor: notifStatus !== 'granted' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name={notifStatus === 'granted' ? 'Bell' : 'BellOff'} size={14} color={notifColor} />
              <span style={{ fontSize: 9, color: notifColor, fontWeight: 700 }}>{notifStatus === 'granted' ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: wsColor }} />
            <span style={{ fontSize: 10, color: wsColor, fontWeight: 600 }}>{wsLabel}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>
            {time.toLocaleTimeString('id-ID', { hour12: false })}
          </div>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
          </button>
          {activePage === 'dashboard' && (
            <button className="btn-primary flex items-center gap-1.5" onClick={onAddHost} style={{ fontSize: 11.5, padding: '6px 14px' }}>
              <Icon name="Plus" size={13} /> Host
            </button>
          )}
          <button onClick={onLogout} title="Keluar"
            style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '6px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="LogOut" size={13} /> Logout
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '6px 16px', overflowX: 'auto', display: 'flex', gap: 4 }}>
        {TABS.map(tab => {
          const isActive = activePage === tab.id;
          return (
            <button key={tab.id} onClick={() => onChangePage(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', whiteSpace: 'nowrap',
                fontSize: 11.5, fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.30)' : 'transparent'}`,
                borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
