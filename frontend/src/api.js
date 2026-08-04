const TOKEN_KEY = 'dashboard_it_token';

// Build API URL dengan token (untuk elemen yang tak bisa mengirim header,
// misalnya <img> untuk snapshot CCTV).
export function authUrl(path) {
  const token = localStorage.getItem(TOKEN_KEY);
  const sep = path.includes('?') ? '&' : '?';
  return `${process.env.REACT_APP_API_URL || ''}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ''}`;
}
