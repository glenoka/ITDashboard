import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export const API = process.env.REACT_APP_API_URL || '';
const TOKEN_KEY = 'dashboard_it_token';

axios.interceptors.request.use(cfg => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    axios.get(`${API}/api/auth/check`)
      .then(() => setChecking(false))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); setChecking(false); });
  }, [token]);

  const login = async (password) => {
    const res = await axios.post(`${API}/api/auth/login`, { password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    return res.data;
  };

  const logout = async () => {
    try { await axios.post(`${API}/api/auth/logout`); } catch (e) {}
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
