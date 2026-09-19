'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  FileText,
  BrainCircuit,
  TrendingUp,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { AiStatusType } from '@/types/pattern';

interface AiAnalysisResultProps {
  status: AiStatusType;
  message?: string;
  detail?: string;
  analysisText?: string;
  startDate: string;
  endDate: string;
  onRetry?: () => void;
  isLoading?: boolean;
  aiProvider?: 'gemini' | 'claude';
}

/**
 * AI 마크다운 텍스트를 파싱하여 깔끔한 리액트 컴포넌트로 렌더링
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-3 text-zinc-800 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 빈 줄
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // H3 (###)
        if (trimmed.startsWith('### ')) {
          const title = trimmed.replace(/^###\s+/, '');
          return (
            <div
              key={idx}
              className="pt-3 pb-1 border-b border-zinc-200 text-base font-bold text-zinc-900 flex items-center gap-2"
            >
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
              <span>{title}</span>
            </div>
          );
        }

        // H2 (##)
        if (trimmed.startsWith('## ')) {
          const title = trimmed.replace(/^##\s+/, '');
          return (
            <h2
              key={idx}
              className="pt-4 pb-1 text-lg font-extrabold text-zinc-900 border-b border-zinc-300"
            >
              {title}
            </h2>
          );
        }

        // H1 (#)
        if (trimmed.startsWith('# ')) {
          const title = trimmed.replace(/^#\s+/, '');
          return (
            <h1 key={idx} className="pt-4 text-xl font-black text-zinc-900">
              {title}
            </h1>
          );
        }

        // 불릿 리스트 (- 또는 *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <div className="flex-1">{renderInlineFormatting(text)}</div>
            </div>
          );
        }

        // 번호 매기기 리스트 (1. 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const text = numMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-indigo-600 shrink-0 text-xs mt-0.5 bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100">
                {num}
              </span>
              <div className="flex-1">{renderInlineFormatting(text)}</div>
            </div>
          );
        }

        // 기본 문단
        return (
          <p key={idx} className="text-zinc-700">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * 인라인 굵은 글씨 (**text**) 및 코드 (`code`) 렌더링
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // 간단한 **bold** 및 `code` 파싱
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-zinc-900 bg-zinc-100/80 px-1 py-0.5 rounded-xs">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={i}
          className="font-mono text-xs bg-zinc-100 text-indigo-700 border border-zinc-200 px-1.5 py-0.5 rounded-md"
        >
          {inner}
        </code>
      );
    }
    return part;
  });
}

export default function AiAnalysisResult({
  status,
  message,
  detail,
  analysisText,
  startDate,
  endDate,
  onRetry,
  isLoading = false,
  aiProvider = 'gemini',
}: AiAnalysisResultProps) {
  const [copied, setCopied] = useState(false);

  const isClaude = aiProvider === 'claude';
  const aiLabel = isClaude ? 'Claude API 분석' : 'Gemini AI (Antigravity)';
  const aiKeyVar = isClaude ? 'ANTHROPIC_API_KEY' : 'AGY_API_KEY';
  const aiKeyExample = isClaude ? 'ANTHROPIC_API_KEY=sk-ant-...' : 'AGY_API_KEY=your_gemini_api_key_here';
  const aiServiceName = isClaude ? 'Claude AI (Anthropic)' : 'Antigravity / Gemini';
  const aiLoadingText = isClaude
    ? 'Claude AI에게 사용 패턴 및 특이점 분석을 의뢰하고 있습니다...'
    : 'Gemini AI에게 사용 패턴 및 특이점 분석을 의뢰하고 있습니다...';

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
      {/* 카드 헤더 */}
      <div className="p-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/60">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 text-white rounded-lg shadow-2xs ${isClaude ? 'bg-amber-500' : 'bg-indigo-600'}`}>
            {isClaude ? <BrainCircuit className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900">
                {isClaude ? 'Claude API 분석' : 'AI 사용 패턴 및 특이점 분석 의견'}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${isClaude ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                {aiLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              분석 대상 기간: {startDate} ~ {endDate}
            </p>
          </div>
        </div>

        {/* 우측 액션 버튼 */}
        <div className="flex items-center gap-2">
          {status === 'SUCCESS' && analysisText && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs transition cursor-pointer"
              title="분석 의견 복사"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  <span>복사</span>
                </>
              )}
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-zinc-500'}`} />
              <span>재요청</span>
            </button>
          )}
        </div>
      </div>

      {/* 카드 바디 (상태별 분기) */}
      <div className="p-5">
        {/* 1. 로딩 상태 */}
        {isLoading && (
          <div className="py-10 text-center space-y-4">
            <div className="inline-flex p-3 bg-indigo-50 rounded-full text-indigo-600 animate-bounce">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-800">
                {aiLoadingText}
              </p>
              <p className="text-xs text-zinc-500">
                스토리지 용량 및 컴퓨트 일별 기록을 바탕으로 FinOps 진단 리포트를 생성 중입니다.
              </p>
            </div>
            <div className="w-48 h-1.5 bg-zinc-100 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* 2. Key가 없는 경우: "지정된 API키가 없다" */}
        {!isLoading && status === 'NO_KEY' && (
          <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-lg shadow-2xs shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-amber-900">
                  {message || '지정된 API키가 없다'}
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  .env.local 환경설정 파일에 {aiKeyVar} 변수가 설정되지 않았습니다.
                </p>
              </div>
            </div>

            <div className="bg-white/90 border border-amber-200/80 rounded-lg p-3 text-xs text-zinc-700 space-y-2">
              <p className="font-semibold text-zinc-900">
                💡 API Key 설정 방법:
              </p>
              <p className="text-zinc-600">
                프로젝트 루트 또는 <code className="bg-zinc-100 px-1 py-0.5 rounded text-amber-800 font-mono">apps/web/.env.local</code> 파일에 아래와 같이 API 키를 입력해주세요:
              </p>
              <pre className="p-2.5 bg-zinc-900 text-amber-300 rounded-md font-mono text-[11px] overflow-x-auto">
                {aiKeyExample}
              </pre>
              <p className="text-[11px] text-zinc-500">
                키 저장 후 개발 서버 재시작 또는 화면 우측 상단의 [분석 요청] 버튼을 다시 클릭하면 즉시 AI 분석이 실행됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 3. 접속 오류인 경우: "접속 오류" */}
        {!isLoading && status === 'CONNECTION_ERROR' && (
          <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-600 text-white rounded-lg shadow-2xs shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-rose-900">
                  {message || '접속 오류'}
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  AI 서비스({aiServiceName}) 서버와 통신 중 문제가 발생했습니다.
                </p>
              </div>
            </div>

            {detail && (
              <div className="bg-white/90 border border-rose-200/80 rounded-lg p-3 text-xs text-rose-800 space-y-1">
                <p className="font-semibold text-rose-900">오류 상세 내용:</p>
                <code className="block font-mono text-[11px] text-rose-700 whitespace-pre-wrap break-all">
                  {detail}
                </code>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>다시 시도하기</span>
                </button>
              )}
              <span className="text-[11px] text-rose-600">
                {aiKeyVar} 변수의 유효성 또는 네트워크 연결 상태를 점검해주세요.
              </span>
            </div>
          </div>
        )}

        {/* 4. 분석 완료 (SUCCESS) */}
        {!isLoading && status === 'SUCCESS' && analysisText && (
          <div className="space-y-4">
            {/* 상단 완료 안내 배너 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                지정된 기간({startDate} ~ {endDate})의 컴퓨트 및 스토리지 일별 사용량 기록을 바탕으로 분석된 AI 최종 리포트입니다.
              </span>
            </div>

            {/* AI 마크다운 분석 본문 */}
            <div className="bg-zinc-50/50 border border-zinc-200/80 rounded-xl p-5">
              <MarkdownRenderer content={analysisText} />
            </div>
          </div>
        )}

        {/* 5. 초기 상태 (IDLE) */}
        {!isLoading && status === 'IDLE' && (
          <div className="py-8 text-center text-zinc-500 space-y-2">
            <BrainCircuit className="h-8 w-8 text-zinc-400 mx-auto" />
            <p className="text-sm font-medium text-zinc-700">
              상단에서 분석 기간을 설정하고 [분석 요청] 버튼을 눌러주세요.
            </p>
            <p className="text-xs text-zinc-400">
              스토리지 및 컴퓨트의 일별 사용 기록을 {aiLabel}가 종합 분석하여 패턴 및 특이점을 리포트합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
