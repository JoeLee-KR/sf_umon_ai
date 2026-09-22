'use client';

import React from 'react';
import Link from 'next/link';
import { KeyRound, ArrowLeft, Construction, Info, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PasswordChangePage() {
  const { user, authMode } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 상단 네비게이션 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/user/detail"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
            title="사용자 정보로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 tracking-tight">
              암호 변경
            </h1>
            <p className="text-xs text-zinc-500">
              LOCAL 및 KEYCLOAK 인증 모드 전용 암호 변경 관리
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
          모드: {authMode}
        </span>
      </div>

      {/* 추후 개발 예정 안내 카드 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-xs text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
          <Construction className="w-8 h-8" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
            암호 변경 기능 추후 개발 예정 안내
          </h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            현재 암호 변경 페이지는 UI 레이아웃 준비 단계이며, 실제 비밀번호 변경 처리(LOCAL 자체 DB 및 KEYCLOAK IdP 연동)는 나중에 구현될 예정입니다.
          </p>
        </div>

        {/* 안내 박스 */}
        <div className="max-w-lg mx-auto bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-zinc-800">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>인증 모드별 암호 변경 정책 안내</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-zinc-600 pl-1">
            <li>
              <span className="font-semibold text-zinc-700">LOCAL 모드:</span> 내부 데이터베이스 사용자 계정의 암호 해시 업데이트 API 연동 예정
            </li>
            <li>
              <span className="font-semibold text-zinc-700">KEYCLOAK 모드:</span> Keycloak Admin REST API 또는 Account Console 비밀번호 재설정 연동 예정
            </li>
            <li>
              <span className="font-semibold text-zinc-700">OPEN / SSO 모드:</span> 외부 IdP 또는 무인증 모드 정책에 따름
            </li>
          </ul>
        </div>

        {authMode === 'OPEN' && (
          <div className="max-w-lg mx-auto bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 text-left flex items-start gap-2.5 text-xs text-indigo-900">
            <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              현재 시스템은 <span className="font-semibold">OPEN 모드</span>로 동작 중이며, &quot;{user?.id || 'oasis'}&quot; 계정은 암호 검증 없이 즉시 인증됩니다.
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/user/detail"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-2xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>사용자 정보로 돌아가기</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition"
          >
            <span>대시보드로 이동</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
