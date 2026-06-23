'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline';
  last_seen: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile?: {
    name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ data: any; error: any }>;
  verifyEmail: (email: string, otp: string) => Promise<{ data: any; error: any }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  theme: string;
  setTheme: (theme: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState('dark');

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const updateUserStatus = async (userId: string, status: 'online' | 'offline') => {
    try {
      await insforge.database
        .from('profiles')
        .update({ status, last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch (e) {
      console.error('Failed to update presence status', e);
    }
  };

  // 1. Initial startup restoration and session/theme check
  useEffect(() => {
    // Set initial theme from localStorage or default to dark
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') || 'dark' : 'dark';
    setThemeState(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('insforge_session_token') : null;
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('insforge_session_user') : null;
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        (insforge as any).tokenManager.setAccessToken(savedToken);
        (insforge as any).tokenManager.setUser(parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse cached session', e);
      }
    }

    const checkUser = async () => {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (data?.user) {
          const fetchedUser = data.user as any;
          setUser(fetchedUser);
          // Sync new session info to localStorage
          const token = (insforge as any).tokenManager.getAccessToken();
          if (token) {
            localStorage.setItem('insforge_session_token', token);
            localStorage.setItem('insforge_session_user', JSON.stringify(fetchedUser));
          }
          // Set in-memory user as well
          (insforge as any).tokenManager.setUser(fetchedUser);
          await updateUserStatus(fetchedUser.id, 'online');
        } else {
          setUser(null);
          localStorage.removeItem('insforge_session_token');
          localStorage.removeItem('insforge_session_user');
          (insforge as any).tokenManager.clearSession();
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // 2. Presence synchronization & page unload handling
  useEffect(() => {
    if (!user) return;

    // Set user online when user ID changes (e.g. after login or restore)
    updateUserStatus(user.id, 'online');

    const handleUnload = () => {
      updateUserStatus(user.id, 'offline');
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (data?.user) {
      const loggedUser = data.user as any;
      setUser(loggedUser);
      const token = (insforge as any).tokenManager.getAccessToken();
      if (token) {
        localStorage.setItem('insforge_session_token', token);
        localStorage.setItem('insforge_session_user', JSON.stringify(loggedUser));
      }
      await updateUserStatus(loggedUser.id, 'online');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name });
    return { data, error };
  };

  const verifyEmail = async (email: string, otp: string) => {
    const { data, error } = await insforge.auth.verifyEmail({ email, otp });
    if (data?.user) {
      const verifiedUser = data.user as any;
      setUser(verifiedUser);
      const token = (insforge as any).tokenManager.getAccessToken();
      if (token) {
        localStorage.setItem('insforge_session_token', token);
        localStorage.setItem('insforge_session_user', JSON.stringify(verifiedUser));
      }
      await updateUserStatus(verifiedUser.id, 'online');
    }
    return { data, error };
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { error } = await insforge.auth.signInWithOAuth(provider, {
      redirectTo: window.location.origin,
    });
    return { error };
  };

  const signOut = async () => {
    const currentUser = user;
    try {
      if (currentUser) {
        await updateUserStatus(currentUser.id, 'offline');
      }
      await insforge.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      setUser(null);
      localStorage.removeItem('insforge_session_token');
      localStorage.removeItem('insforge_session_user');
    }
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, verifyEmail, signInWithOAuth, signOut, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
