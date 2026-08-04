import React, { useState, useEffect } from 'react';

export default function Header({ wsStatus, stats, onAddHost, notifStatus, onRequestNotif, activePage, onChangePage, onLogout }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const wsColor = wsStatus === 'connected' ? '#22C55E' : wsStatus === 'connecting' ? '#F59E0B' : '#EF4444';
  const wsLabel = wsStatus === 'connected' ? 'LIVE' : wsStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE';
  const notifColor = notifStatus === 'granted' ? '#22C55E' : notifStatus === 'denied' ? '#EF4444' : '#F59E0B';

  return (
    <header style={{ background: '#0D1B2E', borderBottom: '1px solid #1E3A5F', position: 'sticky', top: 0, zIndex: 40 }}>
      {/* Top bar */}
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            ⬡
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: '#E2E8F0', letterSpacing: '0.05em', lineHeight: 1 }}>
              DASHBOARD IT
            </div>
            <div style={{ fontSize: 9, color: '#22C55E', fontWeight: 600, letterSpacing: '0.15em' }}>
              SYSTEM MONITORING & ASSET
            </div>
          </div>
        </div>

        {/* Center stats — only on dashboard */}
        {activePage === 'dashboard' && (
          <div className="hidden md:flex items-center gap-5">
            <StatPill label="TOTAL" value={stats.total} color="#64748B" />
            <div style={{ width: 1, height: 16, background: '#334155' }} />
            <StatPill label="UP" value={stats.up} color="#22C55E" />
            <StatPill label="DOWN" value={stats.down} color="#EF4444" />
            <div style={{ width: 1, height: 16, background: '#334155' }} />
            <StatPill label="AVAILABILITY" value={`${stats.availability}%`} color="#38BDF8" />
            <StatPill label="AVG RTT" value={`${stats.avgLatency}ms`} color="#F59E0B" />
          </div>
        )}
        {activePage === 'cctv' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            CCTV MONITORING
          </div>
        )}
        {activePage === 'procurement' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            PURCHASING — PR / ORDER
          </div>
        )}
        {activePage === 'asset' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            INVENTARIS ASET IT
          </div>
        )}
        {activePage === 'history' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            STATUS HISTORY LOG
          </div>
        )}
        {activePage === 'unifi' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            UNIFI CONTROLLER
          </div>
        )}
        {activePage === 'ruijie' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            RUIJIE CLOUD
          </div>
        )}
        {activePage === 'sop' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            SOP & POLICY IT
          </div>
        )}
        {activePage === 'checklist' && (
          <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.1em', fontWeight: 600 }}>
            CHECKLIST IT
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-3">
          {notifStatus !== 'unsupported' && (
            <button title={notifStatus === 'granted' ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
              onClick={notifStatus !== 'granted' ? onRequestNotif : undefined}
              style={{ background: 'none', border: `1px solid ${notifColor}44`, borderRadius: 6, padding: '4px 8px', cursor: notifStatus !== 'granted' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13 }}>{notifStatus === 'granted' ? '🔔' : '🔕'}</span>
              <span style={{ fontSize: 9, color: notifColor, fontWeight: 700 }}>{notifStatus === 'granted' ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: wsColor }} />
            <span style={{ fontSize: 10, color: wsColor, fontWeight: 600 }}>{wsLabel}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
            {time.toLocaleTimeString('id-ID', { hour12: false })}
          </div>
          {activePage === 'dashboard' && (
            <button className="btn-primary flex items-center gap-1.5" onClick={onAddHost}
              style={{ fontSize: 11, padding: '6px 14px' }}>
              + HOST
            </button>
          )}
          <button onClick={onLogout} title="Keluar"
            style={{ background: 'none', border: '1px solid #EF444433', color: '#EF4444', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ background: '#0A1628', borderTop: '1px solid #1E3A5F', display: 'flex', paddingLeft: 16 }}>
        {[
          { id: 'dashboard',   icon: '◈', label: 'DASHBOARD' },
          { id: 'cctv',        icon: '📹', label: 'CCTV' },
          { id: 'unifi',       icon: '🌐', label: 'UNIFI' },
          { id: 'ruijie',      icon: '🛜', label: 'RUIJIE' },
          { id: 'procurement', icon: '📦', label: 'PR/ORDER' },
          { id: 'asset',       icon: '🗃️', label: 'ASET IT' },
          { id: 'sop',         icon: '📋', label: 'SOP' },
          { id: 'checklist',   icon: '✅', label: 'CHECKLIST' },
          { id: 'history',     icon: '🕐', label: 'HISTORY' },
        ].map(tab => {
          const isActive = activePage === tab.id;
          return (
            <button key={tab.id} onClick={() => onChangePage(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: isActive ? '#22C55E' : '#64748B',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid #22C55E' : '2px solid transparent',
                fontFamily: 'JetBrains Mono, monospace', transition: 'color 0.15s',
              }}>
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
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
      <span style={{ fontSize: 9, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 13, color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
