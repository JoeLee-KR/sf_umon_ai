'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, Bell, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="h-14 border-b border-zinc-200 bg-white px-5 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* 로고 영역 (대시보드 이동 링크) */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 font-bold text-zinc-900 tracking-tight text-sm select-none hover:opacity-80 transition cursor-pointer"
      >
        <Activity className="h-5 w-5 text-indigo-600 shrink-0" />
        <span>(Study Project) SF UMON, feat. Vibe Code & AI</span>
      </Link>

      {/* 우측 영역 */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded border border-zinc-200">
          Phase 1: Local
        </span>
        <button
          type="button"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
          aria-label="알림"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* 로그인 성공 시 ID 표시 및 옆에 Logout 버튼 배치 */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-2">
            <Link
              href="/user/detail"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 transition shadow-2xs group"
              title="사용자 상세 정보 보기"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-900 group-hover:text-indigo-600 transition">
                {user.id}
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-700 hover:text-rose-600 text-xs font-medium transition shadow-2xs"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
