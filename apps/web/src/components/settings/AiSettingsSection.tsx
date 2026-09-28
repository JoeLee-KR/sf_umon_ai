'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AiSettingsInfo } from '@/app/api/settings/ai/route';

export default function AiSettingsSection() {
  const [data, setData] = useState<AiSettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geminiFallbackOpen, setGeminiFallbackOpen] = useState(false);

  const fetchAiInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/sfumonai';
      const res = await fetch(`${basePath}/api/settings/ai`);
      if (!res.ok) throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || 'AI 설정 정보를 불러오지 못했습니다.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiInfo();
  }, []);

  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">AI API 연결 설정 정보</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              사용량 패턴 분석에 사용되는 Gemini 및 Claude API 구성 정보입니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAiInfo}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          상태 새로고침
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gemini */}
        <div className="border border-zinc-200 rounded-xl p-5 bg-zinc-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-zinc-900">Gemini API (Google)</h3>
            </div>
            {data?.gemini.keyConfigured ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                키 설정됨
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="h-3 w-3" />
                키 미설정
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 col-span-2">
              <span className="text-zinc-400 block text-[11px]">API 키 환경변수</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <KeyRound className="h-3 w-3 text-zinc-400" />
                <span className="font-mono font-medium text-zinc-800">{data?.gemini.keyEnvVar || '-'}</span>
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 col-span-2">
              <span className="text-zinc-400 block text-[11px]">기본(Primary) 모델</span>
              <span className="font-mono font-medium text-indigo-700">{data?.gemini.primaryModel || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">File API 전환 임계치</span>
              <span className="font-mono font-medium text-zinc-800">{data ? `${data.gemini.fileApiThresholdKb} KB 이상` : '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">폴백 모델 수</span>
              <span className="font-mono font-medium text-zinc-800">{data ? `${data.gemini.fallbackModels.length}개` : '-'}</span>
            </div>
          </div>

          {/* 폴백 모델 목록 토글 */}
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setGeminiFallbackOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            >
              <span>폴백(Fallback) 모델 순서</span>
              {geminiFallbackOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
            </button>
            {geminiFallbackOpen && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-zinc-100 pt-2">
                {data?.gemini.fallbackModels.map((m, i) => (
                  <div key={m} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-center text-[11px] font-mono text-zinc-400">{i + 1}</span>
                    <span className="font-mono text-zinc-700">{m}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Claude */}
        <div className="border border-zinc-200 rounded-xl p-5 bg-zinc-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-zinc-900">Claude API (Anthropic)</h3>
            </div>
            {data?.claude.keyConfigured ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                키 설정됨
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="h-3 w-3" />
                키 미설정
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 col-span-2">
              <span className="text-zinc-400 block text-[11px]">API 키 환경변수</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <KeyRound className="h-3 w-3 text-zinc-400" />
                <span className="font-mono font-medium text-zinc-800">{data?.claude.keyEnvVar || '-'}</span>
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 col-span-2">
              <span className="text-zinc-400 block text-[11px]">사용 모델</span>
              <span className="font-mono font-medium text-amber-700">{data?.claude.model || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">최대 출력 토큰</span>
              <span className="font-mono font-medium text-zinc-800">{data ? `${data.claude.maxTokens.toLocaleString()} tokens` : '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">폴백 모델</span>
              <span className="font-mono font-medium text-zinc-500">없음 (단일 모델)</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-zinc-200 text-xs text-zinc-500 leading-5">
            Gemini와 달리 단일 모델을 직접 호출하며, 폴백 없이 오류 시 즉시 반환합니다.
            모델 변경은 API 라우트의 <code className="font-mono bg-zinc-100 px-1 rounded">model</code> 값을 수정하세요.
          </div>
        </div>
      </div>
    </section>
  );
}
