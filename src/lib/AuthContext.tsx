import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ROLE_DEFAULTS } from '@/lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  permissions: string[];
  assignedPlants: { id: string; name: string }[];
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (prefix: string) => boolean;
  canAccessPlant: (plantName: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: () => {},
  loading: true,
  permissions: [],
  assignedPlants: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  canAccessPlant: () => false,
  refreshPermissions: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [assignedPlants, setAssignedPlants] = useState<{ id: string; name: string }[]>([]);

  const fetchPermissions = useCallback(async (userId: string) => {
    try {
      const [permsRes, plantsRes] = await Promise.all([
        fetch(`/api/permissions/${userId}`),
        fetch(`/api/plants/${userId}`),
      ]);
      const permsData = await permsRes.json();
      if (permsData.ok) setCustomPerms(permsData.permissions || []);
      const plantsData = await plantsRes.json();
      if (plantsData.ok) setAssignedPlants(plantsData.plants || []);
    } catch { setCustomPerms([]); setAssignedPlants([]); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ipak_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        if (parsed?.id) fetchPermissions(parsed.id);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, [fetchPermissions]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('ipak_user', JSON.stringify(data.user));
        await fetchPermissions(data.user.id);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid credentials.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [fetchPermissions]);

  const logout = useCallback(() => {
    setUser(null);
    setCustomPerms([]);
    setAssignedPlants([]);
    localStorage.removeItem('ipak_user');
    localStorage.removeItem('selectedPlant');
    window.location.hash = '#/login';
    window.location.reload();
  }, []);

  const permissions = user ? [...new Set([...(ROLE_DEFAULTS[user.role] ?? []), ...customPerms])] : [];

  const hasPermission = useCallback((perm: string) => {
    return permissions.includes(perm);
  }, [permissions]);

  const hasAnyPermission = useCallback((prefix: string) => {
    return permissions.some(p => p.startsWith(prefix + '.'));
  }, [permissions]);

  const canAccessPlant = useCallback((plantName: string) => {
    // Admin can access all plants
    if (user?.role === 'admin') return true;
    // No plants assigned = no access (unless admin)
    if (assignedPlants.length === 0) return false;
    return assignedPlants.some(p => p.name === plantName);
  }, [user, assignedPlants]);

  const refreshPermissions = useCallback(async () => {
    if (user) await fetchPermissions(user.id);
  }, [user, fetchPermissions]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading, permissions, assignedPlants, hasPermission, hasAnyPermission, canAccessPlant, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
