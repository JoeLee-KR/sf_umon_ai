'use client';

import React from 'react';
import Link from 'next/link';
import { User as UserIcon, Shield, KeyRound, Check, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function UserDetailPage() {
  const { user, authMode, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 상단 네비게이션 헤더 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
            title="대시보드로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 tracking-tight">
              사용자 상세 정보
            </h1>
            <p className="text-xs text-zinc-500">
              현재 접속 중인 계정의 정보 및 인증 설정을 확인합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {/* 사용자 정보 상세 카드 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs space-y-6">
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-sm font-bold text-zinc-900">계정 정보</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            플랫폼에서 사용 중인 기본 식별 정보입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 사용자 ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-600">
              사용자 ID
            </label>
            <div className="px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-mono font-medium text-zinc-900">
              {user?.id || 'oasis'}
            </div>
          </div>

          {/* 인증 방식 (AUTH_MODE) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-600">
              인증 모드 (AUTH_MODE)
            </label>
            <div className="px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm flex items-center justify-between">
              <span className="font-mono text-zinc-800">{user?.authMode || authMode}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Shield className="w-3 h-3" />
                활성
              </span>
            </div>
          </div>

          {/* 사용자 명 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-600">
              사용자 이름
            </label>
            <input
              type="text"
              defaultValue={user?.name || 'Administrator'}
              className="w-full px-3.5 py-2 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 권한 레벨 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-600">
              시스템 권한
            </label>
            <div className="px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700">
              {user?.role || 'ADMIN (최고 관리자)'}
            </div>
          </div>
        </div>

        {/* 하단 액션 버튼 영역 */}
        <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-3">
          {/* 암호 변경 버튼 (클릭 시 암호 변경 페이지로 진입) */}
          <Link
            href="/user/password"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-2xs transition"
          >
            <KeyRound className="w-4 h-4 text-zinc-500" />
            <span>암호 변경</span>
          </Link>

          {/* 정보 변경 완료 버튼 (그려만 둠) */}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition"
          >
            <Check className="w-4 h-4" />
            <span>정보 변경 완료</span>
          </button>
        </div>
      </div>
    </div>
  );
}
