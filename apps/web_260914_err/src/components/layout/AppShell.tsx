'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="h-full bg-zinc-200 flex flex-col text-zinc-900">
      {/* 최상단 GNB */}
      <Navbar />

      {/* 로딩 중 상태 */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-100">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-zinc-500 font-medium">인증 정보를 확인하는 중입니다...</p>
        </div>
      ) : !isAuthenticated ? (
        /* 미인증 상태: SPA 전체에 걸쳐 로그인 화면만 노출 */
        <div className="flex-1 overflow-y-auto">
          <LoginForm />
        </div>
      ) : (
        /* 인증 완료 상태: 사이드바 및 페이지 컨텐츠 진입 허용 */
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
