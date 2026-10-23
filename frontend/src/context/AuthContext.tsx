import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { User, Workspace, AuthResponse, UserProfileResponse } from '../types/auth';

interface AuthContextType {
  user: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (fullName: string, businessName: string, email: string, password: string, currency?: string) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  updateActiveWorkspace: (data: Partial<Workspace>) => Promise<Workspace>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('accora_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() => {
    const saved = localStorage.getItem('accora_workspace');
    return saved ? JSON.parse(saved) : null;
  });

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('accora_workspaces');
    return saved ? JSON.parse(saved) : [];
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('accora_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    let isCancelled = false;

    const checkSession = async () => {
      const storedToken = localStorage.getItem('accora_token');
      if (!storedToken) {
        if (!isCancelled) setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<UserProfileResponse>('/auth/me');
        if (isCancelled) return;
        const data = response.data;
        setUser({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
        setWorkspaces(data.workspaces);

        // Keep current active workspace or set first
        const currentActiveId = localStorage.getItem('accora_active_ws_id');
        const matched = data.workspaces.find((w) => w.id === currentActiveId) || data.workspaces[0];
        if (matched) {
          setActiveWorkspace(matched);
          localStorage.setItem('accora_workspace', JSON.stringify(matched));
          localStorage.setItem('accora_active_ws_id', matched.id);
        }
      } catch (err) {
        if (isCancelled) return;
        // Token invalid or expired
        localStorage.removeItem('accora_token');
        localStorage.removeItem('accora_user');
        localStorage.removeItem('accora_workspace');
        localStorage.removeItem('accora_workspaces');
        localStorage.removeItem('accora_active_ws_id');
        setUser(null);
        setActiveWorkspace(null);
        setWorkspaces([]);
        setToken(null);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const saveAuthSession = (data: AuthResponse) => {
    // 1. Immediately persist to localStorage
    localStorage.setItem('accora_token', data.access_token);
    localStorage.setItem('accora_user', JSON.stringify(data.user));
    localStorage.setItem('accora_workspace', JSON.stringify(data.active_workspace));
    localStorage.setItem('accora_workspaces', JSON.stringify(data.workspaces));
    localStorage.setItem('accora_active_ws_id', data.active_workspace.id);

    // 2. Synchronize React state
    setToken(data.access_token);
    setUser(data.user);
    setActiveWorkspace(data.active_workspace);
    setWorkspaces(data.workspaces);
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    saveAuthSession(response.data);
  };

  const demoLogin = async () => {
    const response = await api.post<AuthResponse>('/auth/demo-login');
    saveAuthSession(response.data);
  };

  const register = async (
    fullName: string,
    businessName: string,
    email: string,
    password: string,
    currency = 'USD'
  ) => {
    const response = await api.post<AuthResponse>('/auth/register', {
      full_name: fullName,
      business_name: businessName,
      email,
      password,
      currency,
    });
    saveAuthSession(response.data);
  };

  const logout = () => {
    localStorage.removeItem('accora_token');
    localStorage.removeItem('accora_user');
    localStorage.removeItem('accora_workspace');
    localStorage.removeItem('accora_workspaces');
    localStorage.removeItem('accora_active_ws_id');
    setToken(null);
    setUser(null);
    setActiveWorkspace(null);
    setWorkspaces([]);
    setIsLoading(false);
  };

  const switchWorkspace = (workspaceId: string) => {
    const matched = workspaces.find((w) => w.id === workspaceId);
    if (matched) {
      setActiveWorkspace(matched);
      localStorage.setItem('accora_workspace', JSON.stringify(matched));
      localStorage.setItem('accora_active_ws_id', matched.id);
    }
  };

  const updateActiveWorkspace = async (data: Partial<Workspace>): Promise<Workspace> => {
    if (!activeWorkspace) {
      throw new Error('No active workspace selected.');
    }
    const response = await api.put<Workspace>(`/workspaces/${activeWorkspace.id}`, data);
    const updated = response.data;
    setActiveWorkspace(updated);
    setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    localStorage.setItem('accora_workspace', JSON.stringify(updated));
    return updated;
  };

  const hasToken = !!token || (typeof window !== 'undefined' && !!localStorage.getItem('accora_token'));
  const hasUser = !!user || (typeof window !== 'undefined' && !!localStorage.getItem('accora_user'));
  const isAuthenticated = hasToken && hasUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        activeWorkspace,
        workspaces,
        token,
        isAuthenticated,
        isLoading,
        login,
        demoLogin,
        register,
        logout,
        switchWorkspace,
        updateActiveWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
