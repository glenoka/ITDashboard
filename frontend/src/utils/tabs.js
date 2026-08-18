const KEY = 'dashboard_it_hidden_tabs';

export const ALL_TABS = [
  { id: 'dashboard', icon: 'Gauge', label: 'Dashboard' },
  { id: 'hosts', icon: 'Monitor', label: 'Host Connection' },
  { id: 'cctv', icon: 'Video', label: 'CCTV' },
  { id: 'unifi', icon: 'Network', label: 'UniFi' },
  { id: 'ruijie', icon: 'Router', label: 'Ruijie' },
  { id: 'procurement', icon: 'Package', label: 'PR/Order' },
  { id: 'asset', icon: 'Boxes', label: 'Aset IT' },
  { id: 'reminders', icon: 'Bell', label: 'Reminder' },
  { id: 'sop', icon: 'FileText', label: 'SOP' },
  { id: 'checklist', icon: 'ListChecks', label: 'Checklist' },
  { id: 'history', icon: 'History', label: 'History' },
];

export function loadHiddenTabs() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function saveHiddenTabs(hidden) {
  try {
    localStorage.setItem(KEY, JSON.stringify(hidden));
  } catch (e) {}
}
