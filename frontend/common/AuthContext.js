import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from './storage';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check token on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await storage.getItem('token');
        if (token) {
          const data = await authAPI.getMe();
          setUser(data.user);
        }
      } catch {
        await storage.deleteItem('token');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const register = async (username, email, password) => {
    const data = await authAPI.register({ username, email, password });
    await storage.setItem('token', data.token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    await storage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    await storage.deleteItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
