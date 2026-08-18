import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import MonitoringTable from './components/MonitoringTable';
import ChartsPanel from './components/ChartsPanel';
import AddHostModal from './components/AddHostModal';
import HostDetailModal from './components/HostDetailModal';
import AlertToast from './components/AlertToast';
import NotificationBanner from './components/NotificationBanner';
import CCTVPage from './components/CCTVPage';
import HistoryPage from './components/HistoryPage';
import UnifiPage from './components/UnifiPage';
import RuijiePage from './components/RuijiePage';
import SOPPage from './components/SOPPage';
import ChecklistPage from './components/ChecklistPage';
import ProcurementPage from './components/ProcurementPage';
import AssetPage from './components/AssetPage';
import RemindersPage from './components/RemindersPage';
import DashboardPage from './components/DashboardPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import SettingsModal from './components/SettingsModal';
import TelegramSettingsModal from './components/TelegramSettingsModal';
import LoginPage from './components/LoginPage';
import Icon from './components/Icon';
import { API, useAuth } from './context/AuthContext';
import { loadHiddenTabs, saveHiddenTabs } from './utils/tabs';

// ── Notification helpers ──────────────────────────────────────────────────────
let notifPermission = 'default';
async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { notifPermission = 'granted'; return; }
  if (Notification.permission !== 'denied') {
    const p = await Notification.requestPermission();
    notifPermission = p;
  } else { notifPermission = 'denied'; }
}
function sendBrowserNotif(hostName, status, target) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const isDown = status === 'DOWN';
  const notif = new Notification(
    isDown ? `🔴 HOST DOWN — ${hostName}` : `🟢 RECOVERED — ${hostName}`,
    { body: `${target}\n${new Date().toLocaleString('id-ID')}`, tag: `noc-${hostName}`, requireInteraction: isDown, silent: false }
  );
  if (!isDown) setTimeout(() => notif.close(), 6000);
  notif.onclick = () => { window.focus(); notif.close(); };
}
function playBeep(isDown) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = isDown ? 330 : 660; osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}
let titleBlinkInterval = null;
function blinkTitle(hostName) {
  if (titleBlinkInterval) clearInterval(titleBlinkInterval);
  let blink = true;
  titleBlinkInterval = setInterval(() => {
    document.title = blink ? `⚠️ DOWN: ${hostName}` : 'Dashboard IT';
    blink = !blink;
  }, 900);
  setTimeout(() => { clearInterval(titleBlinkInterval); document.title = 'Dashboard IT'; }, 20000);
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { token, checking, login, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [hosts, setHosts] = useState([]);
  const [stats, setStats] = useState({ total: 0, up: 0, down: 0, availability: '0.0', avgLatency: 0 });
  const [system, setSystem] = useState(null);
  const [bandwidth, setBandwidth] = useState({ rx_sec: 0, tx_sec: 0 });
  const [bwHistory, setBwHistory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editHost, setEditHost] = useState(null);
  const [detailHost, setDetailHost] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telegramSettingsOpen, setTelegramSettingsOpen] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState(loadHiddenTabs);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [notifStatus, setNotifStatus] = useState('Notification' in window ? Notification.permission : 'unsupported');
  const wsRef = useRef(null);
  const alertIdRef = useRef(0);
  const hostsRef = useRef([]);

  useEffect(() => { hostsRef.current = hosts; }, [hosts]);

  useEffect(() => { saveHiddenTabs(hiddenTabs); }, [hiddenTabs]);

  useEffect(() => {
    if (hiddenTabs.includes(activePage)) setActivePage('dashboard');
  }, [hiddenTabs, activePage]);

  useEffect(() => {
    document.title = 'Dashboard IT';
    requestNotifPermission().then(() => {
      setNotifStatus('Notification' in window ? Notification.permission : 'unsupported');
    });
  }, []);

  const triggerAlert = useCallback((hostName, target, status) => {
    const id = ++alertIdRef.current;
    setAlerts(prev => [...prev, { id, hostName, target, status, timestamp: new Date().toISOString() }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 8000);
    sendBrowserNotif(hostName, status, target);
    playBeep(status === 'DOWN');
    if (status === 'DOWN') blinkTitle(hostName);
  }, []);

  const loadHosts = useCallback(async () => {
    try {
      const [hostsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/hosts`),
        axios.get(`${API}/api/stats`)
      ]);
      setHosts(hostsRes.data);
      setStats(statsRes.data);
    } catch (e) {}
  }, []);

  const loadSystem = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/system`); setSystem(res.data); } catch (e) {}
  }, []);

  const loadBandwidth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/bandwidth`);
      setBandwidth(res.data);
      setBwHistory(prev => [...prev, { ...res.data, t: Date.now() }].slice(-60));
    } catch (e) {}
  }, []);

  // WebSocket
  useEffect(() => {
    const base = API || 'http://localhost:3002';
    const wsUrl = base.replace(/^https/, 'wss').replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(token || '')}`;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => { setWsStatus('disconnected'); if (!stopped) setTimeout(connect, 3000); };
      ws.onerror = () => setWsStatus('error');
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'host_update') {
          setHosts(prev => {
            const updated = prev.map(h => h.id === msg.hostId ? { ...h, status: msg.status, latency: msg.latency, lastCheck: msg.lastCheck } : h);
            const up = updated.filter(h => h.status === 'UP').length;
            const total = updated.length;
            const latencies = updated.filter(h => h.latency).map(h => h.latency);
            const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;
            setStats({ total, up, down: total - up, availability: total > 0 ? ((up / total) * 100).toFixed(1) : '0.0', avgLatency });
            return updated;
          });
        }
        if (msg.type === 'alert') {
          const h = hostsRef.current.find(h => h.id === msg.hostId);
          triggerAlert(msg.hostName, h?.target || '', msg.status);
        }
        if (['host_added', 'host_deleted', 'host_updated'].includes(msg.type)) loadHosts();
      };
    };
    connect();
    return () => { stopped = true; wsRef.current?.close(); };
  }, [triggerAlert, loadHosts, token]);

  // Polling dengan jeda otomatis saat tab tersembunyi
  useEffect(() => {
    let i1, i2, i3;
    const start = () => {
      i1 = setInterval(loadHosts, 5000);
      i2 = setInterval(loadSystem, 5000);
      i3 = setInterval(loadBandwidth, 1000);
    };
    const stop = () => { clearInterval(i1); clearInterval(i2); clearInterval(i3); };
    const onVis = () => {
      if (document.hidden) stop();
      else { loadHosts(); loadSystem(); loadBandwidth(); start(); }
    };
    document.addEventListener('visibilitychange', onVis);
    loadHosts(); loadSystem(); loadBandwidth(); start();
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [loadHosts, loadSystem, loadBandwidth]);

  const handleAddHost = async (data) => {
    try { await axios.post(`${API}/api/hosts`, data); } catch (e) {}
    await loadHosts(); setShowAddModal(false);
  };
  const handleEditHost = async (data) => {
    try { await axios.put(`${API}/api/hosts/${editHost.id}`, data); } catch (e) {}
    await loadHosts(); setEditHost(null);
  };
  const handleDeleteHost = async (id) => {
    if (!window.confirm('Hapus host ini?')) return;
    try { await axios.delete(`${API}/api/hosts/${id}`); await loadHosts(); } catch (e) {}
  };
  const handleRequestNotif = async () => {
    await requestNotifPermission();
    setNotifStatus('Notification' in window ? Notification.permission : 'unsupported');
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Icon name="Hexagon" size={24} color="var(--on-accent)" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', fontWeight: 600 }}>MEMUAT...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header
        wsStatus={wsStatus} stats={stats}
        notifStatus={notifStatus} onRequestNotif={handleRequestNotif}
        activePage={activePage} onChangePage={setActivePage}
        onLogout={logout}
        onOpenSettings={() => setSettingsOpen(true)}
        hiddenTabs={hiddenTabs}
      />

      {activePage === 'dashboard' && (
        <DashboardPage onNavigate={setActivePage}
          system={system} bandwidth={bandwidth} bwHistory={bwHistory} />
      )}

      {activePage === 'hosts' && (
        <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
          <NotificationBanner status={notifStatus} onRequest={handleRequestNotif} />
          <SummaryCards stats={stats} />
          <MonitoringTable hosts={hosts} onEdit={setEditHost} onDelete={handleDeleteHost} onDetail={setDetailHost}
            onAdd={() => setShowAddModal(true)} />
          <ChartsPanel hosts={hosts} />
        </main>
      )}

      {activePage === 'cctv' && (
        <CCTVPage wsRef={wsRef} />
      )}

      {activePage === 'history' && (
        <HistoryPage wsRef={wsRef} />
      )}

      {activePage === 'unifi' && (
        <UnifiPage wsRef={wsRef} />
      )}

      {activePage === 'ruijie' && (
        <RuijiePage wsRef={wsRef} />
      )}

      {activePage === 'procurement' && (
        <ProcurementPage wsRef={wsRef} />
      )}

      {activePage === 'asset' && (
        <AssetPage wsRef={wsRef} />
      )}

      {activePage === 'reminders' && (
        <RemindersPage wsRef={wsRef} />
      )}

      {activePage === 'sop' && (
        <SOPPage />
      )}

      {activePage === 'checklist' && (
        <ChecklistPage />
      )}

      {(showAddModal || editHost) && (
        <AddHostModal host={editHost}
          onClose={() => { setShowAddModal(false); setEditHost(null); }}
          onSave={editHost ? handleEditHost : handleAddHost} />
      )}
      {detailHost && (
        <HostDetailModal host={hosts.find(h => h.id === detailHost.id) || detailHost}
          onClose={() => setDetailHost(null)} />
      )}
      {changePasswordModal && (
        <ChangePasswordModal onClose={() => setChangePasswordModal(false)} />
      )}
      {settingsOpen && (
        <SettingsModal
          hiddenTabs={hiddenTabs}
          onToggleTab={(id) => setHiddenTabs(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
          onClose={() => setSettingsOpen(false)}
          onChangePassword={() => { setSettingsOpen(false); setChangePasswordModal(true); }}
          onOpenTelegram={() => { setSettingsOpen(false); setTelegramSettingsOpen(true); }}
        />
      )}
      {telegramSettingsOpen && (
        <TelegramSettingsModal onClose={() => setTelegramSettingsOpen(false)} />
      )}

      {/* Alert Toasts */}
      <div style={{ position: 'fixed', top: 72, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 50, maxWidth: 340 }}>
        {alerts.map(alert => (
          <AlertToast key={alert.id} alert={alert}
            onDismiss={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))} />
        ))}
      </div>
    </div>
  );
}
