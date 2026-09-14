'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthMode, LoginCredentials, LoginResult, User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authMode: AuthMode;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => void;
  refreshAuthMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'sf_umon_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('OPEN');
  const [isLoading, setIsLoading] = useState(true);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/sfumonai';

  // 1. 서버로부터 현재 설정된 AUTH_MODE 조회
  const refreshAuthMode = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/auth/mode`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authMode) {
          setAuthMode(data.authMode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth mode:', err);
    }
  }, [basePath]);

  // 2. 초기 로드 시 스토리지에서 세션 복원 및 AUTH_MODE 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsedUser = JSON.parse(stored) as User;
          setUser(parsedUser);
        }
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        await refreshAuthMode();
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshAuthMode]);

  // 3. 로그인 함수 (공통 인터페이스)
  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result: LoginResult = await res.json();

      if (res.ok && result.success && result.user) {
        setUser(result.user);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
        return { success: true, user: result.user, message: result.message };
      }

      return {
        success: false,
        message: result.message || '로그인에 실패했습니다.',
      };
    } catch (err) {
      return {
        success: false,
        message: (err as Error).message || '서버 통신 중 오류가 발생했습니다.',
      };
    }
  };

  // 4. 로그아웃 함수
  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authMode,
        isLoading,
        login,
        logout,
        refreshAuthMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
