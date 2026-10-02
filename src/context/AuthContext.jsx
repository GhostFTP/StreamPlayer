import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem('sp_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('sp_user'));
  const [role,     setRole]     = useState(() => localStorage.getItem('sp_role') || 'user');

  const setSession = useCallback((newToken, newUsername, newRole) => {
    localStorage.setItem('sp_token', newToken);
    localStorage.setItem('sp_user',  newUsername);
    localStorage.setItem('sp_role',  newRole || 'user');
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole || 'user');
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setSession(data.token, data.username, data.role);
  }, [setSession]);

  const loginWithToken = useCallback((newToken, newUsername, newRole) => {
    setSession(newToken, newUsername, newRole);
  }, [setSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    localStorage.removeItem('sp_role');
    setToken(null);
    setUsername(null);
    setRole('user');
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, role, login, loginWithToken, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
