"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, ApiError } from '../lib/api/client';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  signup: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadMe = async () => {
    setIsLoading(true);
    let currentUser: User | null = null;

    try {
      currentUser = await api.auth.me();
    } catch (err) {
      const isUnauthenticated = err instanceof ApiError && err.statusCode === 401;
      if (!isUnauthenticated) {
        // Not a real "logged out" response (network/proxy hiccup, transient 5xx, etc.)
        // — give it one retry before treating the session as gone.
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          currentUser = await api.auth.me();
        } catch {
          currentUser = null;
        }
      }
    }

    setUser(currentUser);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMe();
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const loggedUser = await api.auth.login(credentials);
      setUser(loggedUser);
      router.push('/dashboard');
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (formData: any) => {
    setIsLoading(true);
    try {
      await api.auth.signup(formData);
      // Auto login after signup
      const loggedUser = await api.auth.login({ email: formData.email, password: formData.password });
      setUser(loggedUser);
      router.push('/dashboard');
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  // Route protection rules:
  useEffect(() => {
    if (isLoading) return;
    const isPublicPath = ['/login', '/signup', '/forgot-password'].includes(pathname);

    if (!user && !isPublicPath) {
      router.replace('/login');
    } else if (user && isPublicPath) {
      router.replace('/dashboard');
    }
  }, [user, pathname, isLoading, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
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
