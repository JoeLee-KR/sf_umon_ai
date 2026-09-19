'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ComputeDailyUsage, ComputeUsageSummary } from '@/types/compute';
import { formatCredits, formatCreditsCompact } from '@/lib/formatters';
import {
  Calendar,
  Minus,
  Plus,
  RotateCcw,
  Info,
  Server,
  Sparkles,
  Zap,
  Activity,
} from 'lucide-react';

export type RangeOption = 'days' | 'custom';

interface ComputeChartProps {
  data: ComputeDailyUsage[];
  summary?: ComputeUsageSummary;
  selectedRange?: RangeOption;
  onRangeChange?: (range: RangeOption) => void;
  days?: number;
  onDaysChange?: (days: number) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  onFetchCustomRange?: () => void;
  isLoading?: boolean;
  hideRangeControls?: boolean;
}

export function calculateInitialComputeScale(data: ComputeDailyUsage[]) {
  if (data.length === 0) {
    return { min: 0, max: 100, step: 10 };
  }

  let maxTotal = 0;
  for (const item of data) {
    if (item.total_credits > maxTotal) maxTotal = item.total_credits;
  }

  if (maxTotal <= 0) {
    return { min: 0, max: 100, step: 10 };
  }

  let step = 10;
  if (maxTotal > 1000) step = 100;
  else if (maxTotal > 500) step = 50;
  else if (maxTotal > 200) step = 20;
  else if (maxTotal > 50) step = 10;
  else if (maxTotal > 10) step = 5;
  else step = 1;

  const max = Math.ceil(maxTotal / step) * step + step;
  return { min: 0, max, step };
}

export default function ComputeChart({
  data,
  summary,
  selectedRange = 'days',
  onRangeChange = () => {},
  days = 30,
  onDaysChange = () => {},
  startDate = '',
  endDate = '',
  onStartDateChange = () => {},
  onEndDateChange = () => {},
  onFetchCustomRange = () => {},
  isLoading = false,
  hideRangeControls = false,
}: ComputeChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 날짜 오름차순 정렬 (차트 왼쪽->오른쪽 렌더링용)
  const sortedAsc = useMemo(() => {
    return [...data].sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [data]);

  // 스케일 계산
  const initialScale = useMemo(() => calculateInitialComputeScale(sortedAsc), [sortedAsc]);

  const [customMin, setCustomMin] = useState<number | null>(null);
  const [customMax, setCustomMax] = useState<number | null>(null);

  const currentStep = initialScale.step;
  const yMin = customMin !== null ? customMin : initialScale.min;
  const yMax = customMax !== null ? customMax : initialScale.max;

  const handleDecreaseMin = useCallback(() => {
    setCustomMin(Math.max(0, yMin - currentStep));
  }, [yMin, currentStep]);

  const handleIncreaseMin = useCallback(() => {
    setCustomMin(Math.min(Math.max(0, yMax - currentStep), yMin + currentStep));
  }, [yMin, yMax, currentStep]);

  const handleDecreaseMax = useCallback(() => {
    setCustomMax(Math.max(yMin + currentStep, yMax - currentStep));
  }, [yMin, yMax, currentStep]);

  const handleIncreaseMax = useCallback(() => {
    setCustomMax(yMax + currentStep);
  }, [yMax, currentStep]);

  const handleResetScale = useCallback(() => {
    setCustomMin(null);
    setCustomMax(null);
  }, []);

  // Y축 틱 (5개)
  const yTicks = useMemo(() => {
    const safeMin = yMin;
    const safeMax = yMax > yMin ? yMax : yMin + currentStep;
    const diff = safeMax - safeMin;
    return [
      safeMin,
      safeMin + diff * 0.25,
      safeMin + diff * 0.5,
      safeMin + diff * 0.75,
      safeMax,
    ];
  }, [yMin, yMax, currentStep]);

  // SVG 차트 치수
  const svgWidth = 1000;
  const svgHeight = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 70 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // 누적 포인트 데이터 생성 (COM_SF -> COM_AI -> AI_TOKEN)
  const { stackedData, comSfAreaPath, comAiAreaPath, aiTokenAreaPath, topTotalLinePath } = useMemo(() => {
    const total = sortedAsc.length;
    const safeMax = yMax > yMin ? yMax : yMin + currentStep;

    const calcX = (index: number) => {
      if (total <= 1) return padding.left + chartWidth / 2;
      return padding.left + (index / (total - 1)) * chartWidth;
    };

    const calcY = (value: number) => {
      if (safeMax === yMin) return padding.top + chartHeight / 2;
      const ratio = (value - yMin) / (safeMax - yMin);
      return padding.top + chartHeight - ratio * chartHeight;
    };

    const yBase = padding.top + chartHeight;

    const pts = sortedAsc.map((d, i) => {
      const sf = Number(d.com_sf) || 0;
      const ai = Number(d.com_ai) || 0;
      const token = Number(d.ai_token) || 0;

      const cumSf = sf;
      const cumAi = sf + ai;
      const cumToken = sf + ai + token;

      const x = calcX(i);
      const ySf = calcY(cumSf);
      const yAi = calcY(cumAi);
      const yToken = calcY(cumToken);

      return {
        x,
        sf,
        ai,
        token,
        cumSf,
        cumAi,
        cumToken,
        yBase,
        ySf,
        yAi,
        yToken,
        date: d.usage_date,
      };
    });

    if (pts.length === 0) {
      return {
        stackedData: [],
        comSfAreaPath: '',
        comAiAreaPath: '',
        aiTokenAreaPath: '',
        topTotalLinePath: '',
      };
    }

    // 1. COM_SF Area (하단 기본 레이어: yBase ~ ySf)
    const sfForward = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yBase} L ${p.x} ${p.ySf}` : `L ${p.x} ${p.ySf}`)).join(' ');
    const sfBackward = `L ${pts[pts.length - 1].x} ${yBase} Z`;
    const sfPath = `${sfForward} ${sfBackward}`;

    // 2. COM_AI Area (중간 누적 레이어: ySf ~ yAi)
    const aiForward = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.ySf} L ${p.x} ${p.yAi}` : `L ${p.x} ${p.yAi}`)).join(' ');
    const aiBackward = pts.slice().reverse().map((p) => `L ${p.x} ${p.ySf}`).join(' ') + ' Z';
    const aiPath = `${aiForward} ${aiBackward}`;

    // 3. AI_TOKEN Area (상단 누적 레이어: yAi ~ yToken)
    const tokenForward = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yAi} L ${p.x} ${p.yToken}` : `L ${p.x} ${p.yToken}`)).join(' ');
    const tokenBackward = pts.slice().reverse().map((p) => `L ${p.x} ${p.yAi}`).join(' ') + ' Z';
    const tokenPath = `${tokenForward} ${tokenBackward}`;

    // 최상단 Total Line
    const topLine = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yToken}` : `L ${p.x} ${p.yToken}`)).join(' ');

    return {
      stackedData: pts,
      comSfAreaPath: sfPath,
      comAiAreaPath: aiPath,
      aiTokenAreaPath: tokenPath,
      topTotalLinePath: topLine,
    };
  }, [sortedAsc, yMin, yMax, currentStep, chartWidth, chartHeight, padding.left, padding.top]);

  // 최신 요약 데이터
  const latestItem = sortedAsc.length > 0 ? sortedAsc[sortedAsc.length - 1] : null;

  const activePoint = hoverIndex !== null && stackedData[hoverIndex] ? {
    raw: sortedAsc[hoverIndex],
    point: stackedData[hoverIndex],
    index: hoverIndex,
  } : null;

  return (
    <div className="space-y-4">
      {/* 1. 상단 컨트롤 바 (기간 선택 + Y축 Min/Max 조절 + 직접지정 + 범례) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-100">
        <div className="flex flex-wrap items-center gap-3">
          {/* 기간 선택 (현재 기준 일수 +10, -10 조절 및 직접 날짜 지정) */}
          {!hideRangeControls && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 p-1 text-xs font-semibold text-zinc-600">
              {/* -10일 버튼 */}
              <button
                type="button"
                onClick={() => {
                  const nextDays = Math.max(10, days - 10);
                  onDaysChange(nextDays);
                  if (selectedRange !== 'days') onRangeChange('days');
                }}
                disabled={selectedRange === 'days' && days <= 10}
                title="10일 감소 (최소 10일)"
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200/80 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              >
                <Minus className="h-3 w-3" />
                <span>10일</span>
              </button>

              {/* 현재 기준 N일 표시 버튼 */}
              <button
                type="button"
                onClick={() => onRangeChange('days')}
                className={`px-3 py-1 rounded-md transition ${
                  selectedRange === 'days'
                    ? 'bg-white text-zinc-900 shadow-xs font-bold border border-zinc-200/80'
                    : 'hover:text-zinc-900'
                }`}
              >
                최근 {days}일
              </button>

              {/* +10일 버튼 */}
              <button
                type="button"
                onClick={() => {
                  const nextDays = Math.min(180, days + 10);
                  onDaysChange(nextDays);
                  if (selectedRange !== 'days') onRangeChange('days');
                }}
                disabled={selectedRange === 'days' && days >= 180}
                title="10일 증가 (최대 180일)"
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200/80 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              >
                <Plus className="h-3 w-3" />
                <span>10일</span>
              </button>

              <div className="h-4 w-px bg-zinc-300 mx-0.5" />

              {/* 직접 날짜선택 탭 */}
              <button
                type="button"
                onClick={() => onRangeChange('custom')}
                className={`px-3 py-1 rounded-md transition ${
                  selectedRange === 'custom'
                    ? 'bg-white text-zinc-900 shadow-xs font-bold border border-zinc-200/80'
                    : 'hover:text-zinc-900'
                }`}
              >
                직접지정
              </button>
            </div>
          )}

          {/* 그래프 Y축 범위 조절 */}
          <div className={`flex flex-wrap items-center gap-2 ${hideRangeControls ? '' : 'pl-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-zinc-200'}`}>
            {/* Min 조절 */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs">
              <span className="text-zinc-500 font-medium">최소:</span>
              <button
                type="button"
                onClick={handleDecreaseMin}
                disabled={yMin <= 0}
                title="최소값 감소"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 disabled:opacity-30 transition"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-mono font-bold text-zinc-800 min-w-[48px] text-center">
                {formatCreditsCompact(yMin)}
              </span>
              <button
                type="button"
                onClick={handleIncreaseMin}
                disabled={yMin >= yMax - currentStep}
                title="최소값 증가"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 disabled:opacity-30 transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Max 조절 */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs">
              <span className="text-zinc-500 font-medium">최대:</span>
              <button
                type="button"
                onClick={handleDecreaseMax}
                disabled={yMax <= yMin + currentStep}
                title="최대값 감소"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 disabled:opacity-30 transition"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-mono font-bold text-zinc-800 min-w-[48px] text-center">
                {formatCreditsCompact(yMax)}
              </span>
              <button
                type="button"
                onClick={handleIncreaseMax}
                title="최대값 증가"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* 자동 맞춤 버튼 */}
            <button
              type="button"
              onClick={handleResetScale}
              title="데이터 기준 최적 범위로 재설정"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 text-zinc-600 hover:text-indigo-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              <span>자동맞춤</span>
            </button>
          </div>
        </div>

        {/* 날짜선택 시 인터페이스 & get 버튼 */}
        {selectedRange === 'custom' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-md">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="text-xs bg-transparent text-zinc-800 focus:outline-none"
              />
              <span className="text-zinc-400 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="text-xs bg-transparent text-zinc-800 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onFetchCustomRange}
              disabled={isLoading || !startDate || !endDate}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white text-xs font-semibold rounded-md shadow-xs transition"
            >
              {isLoading ? '조회중...' : 'get'}
            </button>
          </div>
        )}

        {/* 3대 모음 지표 누적 순서 범례 (AI_TOKEN -> COM_AI -> COM_SF) */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-zinc-800" title="모음3: AI_INFERENCE (상단)">
            <span className="inline-block w-3 h-3 rounded-xs bg-emerald-500 shadow-2xs" />
            <span>AI_TOKEN (상단)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-800" title="모음2: CORTEX_AGENTS, SNOWFLAKE_INTELLIGENCE, SNOWFLAKE_COWORK, CORTEX_CODE_SNOWSIGHT, SNOWFLAKE_COCO_SNOWSIGHT, AI_FUNCTIONS, CORTEX_CODE_DESKTOP, CORTEX_SEARCH (중간)">
            <span className="inline-block w-3 h-3 rounded-xs bg-purple-600 shadow-2xs" />
            <span>COM_AI (중간)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-800" title="모음1: AI_SERVICES, AUTO_CLUSTERING, COPY_FILES, PIPE, SNOWPARK_CONTAINER_SERVICES, TELEMETRY_DATA_INGEST, TRUST_CENTER, WAREHOUSE_METERING, CLOUD_SERVICES (하단)">
            <span className="inline-block w-3 h-3 rounded-xs bg-indigo-600 shadow-2xs" />
            <span>COM_SF (하단)</span>
          </div>
        </div>
      </div>

      {/* 2. 상단 핵심 요약 배너: 최신, 최대, 평균, 최소 지표 표시 */}
      {latestItem && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* COM_SF */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-600 text-xs font-semibold">
                <span>COM_SF (Compute서비스)</span>
                <Server className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-zinc-500">최신 ({latestItem.usage_date.substring(5)})</span>
                <span className="text-base font-bold text-indigo-700 font-mono">
                  {formatCredits(summary?.comSf?.latest ?? latestItem.com_sf, 2)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-200/60 grid grid-cols-3 gap-1 text-[11px] font-mono text-zinc-600 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">최대</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.comSf?.max ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">평균</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.comSf?.avg ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">최소</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.comSf?.min ?? 0, 1)}</span>
              </div>
            </div>
          </div>

          {/* COM_AI */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-600 text-xs font-semibold">
                <span>COM_AI (AI서비스)</span>
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-zinc-500">최신 ({latestItem.usage_date.substring(5)})</span>
                <span className="text-base font-bold text-purple-700 font-mono">
                  {formatCredits(summary?.comAi?.latest ?? latestItem.com_ai, 2)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-200/60 grid grid-cols-3 gap-1 text-[11px] font-mono text-zinc-600 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">최대</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.comAi?.max ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">평균</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.comAi?.avg ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">최소</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.comAi?.min ?? 0, 1)}</span>
              </div>
            </div>
          </div>

          {/* AI_TOKEN */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-600 text-xs font-semibold">
                <span>AI_TOKEN (AI토큰)</span>
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-zinc-500">최신 ({latestItem.usage_date.substring(5)})</span>
                <span className="text-base font-bold text-emerald-600 font-mono">
                  {formatCredits(summary?.aiToken?.latest ?? latestItem.ai_token, 2)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-200/60 grid grid-cols-3 gap-1 text-[11px] font-mono text-zinc-600 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">최대</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.aiToken?.max ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">평균</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.aiToken?.avg ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">최소</span>
                <span className="font-semibold text-zinc-800">{formatCredits(summary?.aiToken?.min ?? 0, 1)}</span>
              </div>
            </div>
          </div>

          {/* 총합산 */}
          <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-indigo-800 text-xs font-bold">
                <span>일일 총 합산</span>
                <Activity className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-indigo-600/80">최신 ({latestItem.usage_date.substring(5)})</span>
                <span className="text-base font-bold text-indigo-950 font-mono">
                  {formatCredits(summary?.totalCreditsStat?.latest ?? latestItem.total_credits, 2)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-indigo-200/60 grid grid-cols-3 gap-1 text-[11px] font-mono text-indigo-900 text-center">
              <div>
                <span className="text-[10px] text-indigo-600/70 font-sans block">최대</span>
                <span className="font-semibold">{formatCredits(summary?.totalCreditsStat?.max ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-indigo-600/70 font-sans block">평균</span>
                <span className="font-semibold">{formatCredits(summary?.totalCreditsStat?.avg ?? 0, 1)}</span>
              </div>
              <div>
                <span className="text-[10px] text-indigo-600/70 font-sans block">최소</span>
                <span className="font-semibold">{formatCredits(summary?.totalCreditsStat?.min ?? 0, 1)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 누적 영역 그래프 시각화 (SVG Stacked Area Chart) */}
      <div className="relative border border-zinc-200 rounded-lg bg-white p-2 overflow-hidden select-none">
        {sortedAsc.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-zinc-400 text-xs">
            <div className="text-center space-y-2">
              <Info className="h-6 w-6 mx-auto text-zinc-300" />
              <span>선택한 기간 동안의 컴퓨트 사용량 데이터가 없습니다.</span>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[700px] block"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                {/* 1. COM_SF 그라디언트 (하단 - 인디고) */}
                <linearGradient id="comSfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.30" />
                </linearGradient>

                {/* 2. COM_AI 그라디언트 (중간 - 보라) */}
                <linearGradient id="comAiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0.45" />
                </linearGradient>

                {/* 3. AI_TOKEN 그라디언트 (상단 - 에메랄드) */}
                <linearGradient id="aiTokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.90" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.55" />
                </linearGradient>
              </defs>

              {/* Y축 그리드 라인 & 레이블 */}
              {yTicks.map((val, idx) => {
                const safeMax = yMax > yMin ? yMax : yMin + currentStep;
                const ratio = (val - yMin) / (safeMax - yMin);
                const y = padding.top + chartHeight - ratio * chartHeight;

                return (
                  <g key={`ytick-${idx}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + chartWidth}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={idx === 0 ? undefined : '3,3'}
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="monospace"
                      fill="#64748b"
                    >
                      {formatCreditsCompact(val)}
                    </text>
                  </g>
                );
              })}

              {/* 3개 누적 레이어 패스 (하단: COM_SF -> 중간: COM_AI -> 상단: AI_TOKEN) */}
              {comSfAreaPath && (
                <path
                  d={comSfAreaPath}
                  fill="url(#comSfGrad)"
                  stroke="#4338ca"
                  strokeWidth="1.2"
                />
              )}

              {comAiAreaPath && (
                <path
                  d={comAiAreaPath}
                  fill="url(#comAiGrad)"
                  stroke="#7e22ce"
                  strokeWidth="1.2"
                />
              )}

              {aiTokenAreaPath && (
                <path
                  d={aiTokenAreaPath}
                  fill="url(#aiTokenGrad)"
                  stroke="#059669"
                  strokeWidth="1.2"
                />
              )}

              {/* 최상단 Total 라인 */}
              {topTotalLinePath && (
                <path
                  d={topTotalLinePath}
                  fill="none"
                  stroke="#047857"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* X축 날짜 틱 & 레이블 */}
              {stackedData.map((pt, idx) => {
                const totalPts = stackedData.length;
                let stepInterval = 1;
                if (totalPts > 60) stepInterval = Math.ceil(totalPts / 12);
                else if (totalPts > 30) stepInterval = Math.ceil(totalPts / 10);
                else if (totalPts > 15) stepInterval = Math.ceil(totalPts / 8);

                const showLabel = idx === 0 || idx === totalPts - 1 || idx % stepInterval === 0;

                return (
                  <g key={`xtick-${idx}`}>
                    {showLabel && (
                      <>
                        <line
                          x1={pt.x}
                          y1={padding.top + chartHeight}
                          x2={pt.x}
                          y2={padding.top + chartHeight + 4}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                        />
                        <text
                          x={pt.x}
                          y={padding.top + chartHeight + 16}
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="monospace"
                          fill="#64748b"
                        >
                          {pt.date.substring(5)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* 마우스 호버 감지 투명 바 및 포인터 */}
              {stackedData.map((pt, idx) => {
                const barWidth = chartWidth / Math.max(1, stackedData.length);
                return (
                  <rect
                    key={`hover-zone-${idx}`}
                    x={pt.x - barWidth / 2}
                    y={padding.top}
                    width={barWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />
                );
              })}

              {/* 활성화된 호버 라인 및 점 */}
              {activePoint && (
                <g>
                  {/* 세로 기준선 */}
                  <line
                    x1={activePoint.point.x}
                    y1={padding.top}
                    x2={activePoint.point.x}
                    y2={padding.top + chartHeight}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />

                  {/* COM_SF 포인트 (하단) */}
                  <circle
                    cx={activePoint.point.x}
                    cy={activePoint.point.ySf}
                    r="4.5"
                    fill="#4f46e5"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  {/* COM_AI 포인트 (중간) */}
                  <circle
                    cx={activePoint.point.x}
                    cy={activePoint.point.yAi}
                    r="4.5"
                    fill="#9333ea"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  {/* AI_TOKEN 포인트 (상단) */}
                  <circle
                    cx={activePoint.point.x}
                    cy={activePoint.point.yToken}
                    r="5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* 툴팁 오버레이 */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none bg-zinc-900/95 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 border border-zinc-700/80 backdrop-blur-xs min-w-[220px]"
            style={{
              left: `${Math.min(
                Math.max(10, (activePoint.point.x / svgWidth) * 100),
                75
              )}%`,
              top: '12px',
            }}
          >
            <div className="font-semibold text-zinc-200 border-b border-zinc-700/80 pb-1 flex items-center justify-between">
              <span className="font-mono">{activePoint.raw.usage_date}</span>
              <span className="text-[10px] text-zinc-400">일일 사용량 상세</span>
            </div>

            <div className="space-y-1 font-mono text-[11px] pt-0.5">
              {/* 상단 레이어: AI_TOKEN */}
              <div className="flex items-center justify-between text-emerald-300">
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>AI_TOKEN (AI_INFERENCE):</span>
                </div>
                <span className="font-bold">{formatCredits(activePoint.raw.ai_token)}</span>
              </div>

              {/* 중간 레이어: COM_AI */}
              <div className="flex items-center justify-between text-purple-300">
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>COM_AI (Cortex AI 모음):</span>
                </div>
                <span className="font-bold">{formatCredits(activePoint.raw.com_ai)}</span>
              </div>

              {/* 하단 기본 레이어: COM_SF */}
              <div className="flex items-center justify-between text-indigo-300">
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>COM_SF (Snowflake 컴퓨트):</span>
                </div>
                <span className="font-bold">{formatCredits(activePoint.raw.com_sf)}</span>
              </div>

              {/* 누적 합계 */}
              <div className="flex items-center justify-between text-white border-t border-zinc-700 pt-1 mt-1 font-bold">
                <span className="font-sans">총 합산:</span>
                <span className="text-emerald-400 text-xs">
                  {formatCredits(activePoint.raw.total_credits)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
