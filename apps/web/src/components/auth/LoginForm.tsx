'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginForm() {
  const router = useRouter();
  const { login, authMode } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id.trim()) {
      setError(`[${authMode} 모드] 아이디를 입력해주세요.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ id: id.trim(), password });
      if (!result.success) {
        setError(result.message || `[${authMode} 모드] 로그인에 실패했습니다.`);
      } else {
        router.push('/employees');
      }
    } catch (err) {
      setError((err as Error).message || `[${authMode} 모드] 로그인 중 오류가 발생했습니다.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-zinc-100/70">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-lg p-7 space-y-6">
        {/* 헤더 및 타이틀 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-1 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            플랫폼 로그인
          </h1>
          <p className="text-xs text-zinc-500">
            SF UMON, feat. Vibe Code & AI 서비스 이용을 위해 인증을 진행해주세요.
          </p>
        </div>

        {/* 현재 AUTH_MODE 표시 뱃지 */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
          <span className="text-zinc-500 font-medium">인증 모드 (AUTH_MODE)</span>
          <span className="font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            {authMode}
          </span>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-id"
              className="block text-xs font-semibold text-zinc-700"
            >
              사용자 ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <User className="h-4 w-4" />
              </div>
              <input
                id="login-id"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="사용자 아이디"
                autoFocus
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-zinc-700"
            >
              비밀번호
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  authMode === 'OPEN'
                    ? '비밀번호 생략 가능 (OPEN 모드)'
                    : '비밀번호를 입력하세요'
                }
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>로그인</span>
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-zinc-400 border-t border-zinc-100">
          SF UMON, feat. Vibe Code & AI &copy; 2026
        </div>
      </div>
    </div>
  );
}
