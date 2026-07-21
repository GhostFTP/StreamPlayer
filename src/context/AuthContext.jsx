import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem('sp_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('sp_user'));
  const [role,     setRole]     = useState(() => localStorage.getItem('sp_role') || 'user');

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('sp_token', data.token);
    localStorage.setItem('sp_user',  data.username);
    localStorage.setItem('sp_role',  data.role || 'user');
    setToken(data.token);
    setUsername(data.username);
    setRole(data.role || 'user');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    localStorage.removeItem('sp_role');
    setToken(null);
    setUsername(null);
    setRole('user');
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, role, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
