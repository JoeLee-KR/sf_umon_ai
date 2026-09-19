'use client';

import React, { useState, useMemo } from 'react';
import { DailyUsagePatternItem, PatternAnalysisSummary } from '@/types/pattern';
import {
  formatBytes,
  formatBytesCompact,
  formatCredits,
  formatCreditsCompact,
} from '@/lib/formatters';
import {
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  Maximize2,
} from 'lucide-react';

interface PatternAnalysisChartProps {
  data: DailyUsagePatternItem[];
  summary: PatternAnalysisSummary;
  isLoading?: boolean;
}

type ViewMode = 'all' | 'compute' | 'storage';

export default function PatternAnalysisChart({
  data,
  summary,
  isLoading = false,
}: PatternAnalysisChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 날짜 오름차순 정렬
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [data]);

  // SVG dimensions
  const svgWidth = 1000;
  const chartHeight = 200;
  const padding = { top: 20, right: 30, bottom: 35, left: 70 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // 1. 컴퓨트 스케일 계산
  const computeScale = useMemo(() => {
    let max = 0;
    for (const d of sortedData) {
      if (d.total_credits > max) max = d.total_credits;
    }
    if (max <= 0) max = 10;
    let step = 10;
    if (max > 1000) step = 200;
    else if (max > 500) step = 100;
    else if (max > 200) step = 50;
    else if (max > 50) step = 20;
    else if (max > 20) step = 10;
    else if (max > 5) step = 2;
    else step = 1;

    const yMax = Math.ceil(max / step) * step;
    return { min: 0, max: yMax, step };
  }, [sortedData]);

  // 2. 스토리지 스케일 계산
  const storageScale = useMemo(() => {
    let max = 0;
    let min = Infinity;
    for (const d of sortedData) {
      if (d.total_storage_bytes > max) max = d.total_storage_bytes;
      if (d.total_storage_bytes < min) min = d.total_storage_bytes;
    }
    if (max <= 0) {
      const defaultTb = 100 * Math.pow(1024, 4);
      return { min: 0, max: defaultTb };
    }
    if (min === Infinity) min = 0;

    // 약간의 상하 여유를 둠 (최소의 90%, 최대의 110%)
    const safeMin = Math.max(0, min * 0.85);
    const safeMax = max * 1.1;
    return { min: safeMin, max: safeMax };
  }, [sortedData]);

  // X 좌표 계산
  const calcX = (index: number) => {
    if (sortedData.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (sortedData.length - 1)) * plotWidth;
  };

  // Y 좌표 계산 (컴퓨트)
  const calcComputeY = (credits: number) => {
    const { min, max } = computeScale;
    if (max === min) return padding.top + plotHeight / 2;
    const ratio = (credits - min) / (max - min);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  // Y 좌표 계산 (스토리지)
  const calcStorageY = (bytes: number) => {
    const { min, max } = storageScale;
    if (max === min) return padding.top + plotHeight / 2;
    const ratio = (bytes - min) / (max - min);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  // SVG Paths 생성
  const paths = useMemo(() => {
    if (sortedData.length === 0) {
      return {
        computeTotalLine: '',
        computeSfArea: '',
        computeAiArea: '',
        storageTotalLine: '',
        storageActiveArea: '',
        storageStageArea: '',
      };
    }

    const yBase = padding.top + plotHeight;

    // --- 컴퓨트 경로 ---
    // SF Area: yBase ~ ySf
    const sfPts = sortedData.map((d, i) => ({
      x: calcX(i),
      ySf: calcComputeY(d.com_sf),
      yTotal: calcComputeY(d.total_credits),
    }));

    const computeTotalLine = sfPts
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.yTotal}` : `L ${p.x} ${p.yTotal}`))
      .join(' ');

    const computeSfArea =
      sfPts.map((p, i) => (i === 0 ? `M ${p.x} ${yBase} L ${p.x} ${p.ySf}` : `L ${p.x} ${p.ySf}`)).join(' ') +
      ` L ${sfPts[sfPts.length - 1].x} ${yBase} Z`;

    const computeAiArea =
      sfPts.map((p, i) => (i === 0 ? `M ${p.x} ${p.ySf} L ${p.x} ${p.yTotal}` : `L ${p.x} ${p.yTotal}`)).join(' ') +
      ' ' +
      sfPts
        .slice()
        .reverse()
        .map((p) => `L ${p.x} ${p.ySf}`)
        .join(' ') +
      ' Z';

    // --- 스토리지 경로 ---
    const stPts = sortedData.map((d, i) => ({
      x: calcX(i),
      yActive: calcStorageY(d.storage_bytes),
      yTotal: calcStorageY(d.total_storage_bytes),
    }));

    const storageTotalLine = stPts
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.yTotal}` : `L ${p.x} ${p.yTotal}`))
      .join(' ');

    const storageActiveArea =
      stPts.map((p, i) => (i === 0 ? `M ${p.x} ${yBase} L ${p.x} ${p.yActive}` : `L ${p.x} ${p.yActive}`)).join(' ') +
      ` L ${stPts[stPts.length - 1].x} ${yBase} Z`;

    const storageStageArea =
      stPts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yActive} L ${p.x} ${p.yTotal}` : `L ${p.x} ${p.yTotal}`)).join(' ') +
      ' ' +
      stPts
        .slice()
        .reverse()
        .map((p) => `L ${p.x} ${p.yActive}`)
        .join(' ') +
      ' Z';

    return {
      computeTotalLine,
      computeSfArea,
      computeAiArea,
      storageTotalLine,
      storageActiveArea,
      storageStageArea,
    };
  }, [sortedData, computeScale, storageScale, plotHeight, plotWidth]);

  // X축 대표 레이블 (5~7개)
  const xLabels = useMemo(() => {
    const total = sortedData.length;
    if (total === 0) return [];
    if (total <= 6) {
      return sortedData.map((d, i) => ({ text: d.usage_date.substring(5), x: calcX(i) }));
    }
    const step = Math.floor((total - 1) / 5);
    const indices = [0, step, step * 2, step * 3, step * 4, total - 1];
    const unique = Array.from(new Set(indices));
    return unique.map((idx) => ({
      text: sortedData[idx].usage_date.substring(5),
      x: calcX(idx),
    }));
  }, [sortedData]);

  // 현재 호버 중인 데이터 포인트
  const activeItem = hoverIndex !== null && sortedData[hoverIndex] ? sortedData[hoverIndex] : null;

  if (sortedData.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center space-y-1">
        <Activity className="h-7 w-7 text-zinc-400 mx-auto mb-2 opacity-70" />
        <p className="text-sm font-medium text-zinc-700">사용량 추이 그래프 대기 중</p>
        <p className="text-xs text-zinc-400">
          상단에서 조회 기간을 확인하신 후 [분석 요청] 버튼을 누르면 해당 기간의 일별 추이 그래프가 그려집니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden">
      {/* 1. 상단 통계 요약 카드 & 뷰 전환 탭 */}
      <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50">
        {/* 통계 요약 배지 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 컴퓨트 요약 배지 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-lg">
            <Cpu className="h-4 w-4 text-indigo-600" />
            <div className="text-xs">
              <span className="text-zinc-500">총 컴퓨트: </span>
              <span className="font-bold text-indigo-700">
                {formatCredits(summary.totalCredits, 2)}
              </span>
              <span className="text-zinc-400 ml-1 text-[11px]">
                (일평균 {formatCredits(summary.avgDailyCredits, 2)})
              </span>
            </div>
          </div>

          {/* 스토리지 요약 배지 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50/70 border border-sky-100 rounded-lg">
            <HardDrive className="h-4 w-4 text-sky-600" />
            <div className="text-xs">
              <span className="text-zinc-500">최신 스토리지: </span>
              <span className="font-bold text-sky-700">
                {formatBytesCompact(summary.latestStorageBytes)}
              </span>
              <span className="text-zinc-400 ml-1 text-[11px]">
                (피크 {formatBytesCompact(summary.maxStorageBytes)})
              </span>
            </div>
          </div>
        </div>

        {/* 뷰 모드 토글 */}
        <div className="inline-flex p-1 bg-zinc-200/60 rounded-lg text-xs font-semibold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'all'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            통합 보기 (컴퓨트 & 스토리지)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compute')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'compute'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            컴퓨트 추이
          </button>
          <button
            type="button"
            onClick={() => setViewMode('storage')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'storage'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            스토리지 추이
          </button>
        </div>
      </div>

      {/* 2. 인터랙티브 호버 정보 바 */}
      <div className="px-4 py-2 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
        {activeItem ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono font-bold text-amber-300">
              📅 {activeItem.usage_date}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-zinc-300">컴퓨트 총:</span>
              <span className="font-semibold text-indigo-200">
                {formatCredits(activeItem.total_credits, 2)} Credits
              </span>
              <span className="text-[10px] text-zinc-400">
                (SF: {formatCredits(activeItem.com_sf, 1)}, AI: {formatCredits(activeItem.com_ai, 1)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-zinc-300">스토리지 총:</span>
              <span className="font-semibold text-sky-200">
                {formatBytesCompact(activeItem.total_storage_bytes)}
              </span>
              <span className="text-[10px] text-zinc-400">
                (활성: {formatBytesCompact(activeItem.storage_bytes)}, 스테이지: {formatBytesCompact(activeItem.stage_bytes)})
              </span>
            </div>
          </div>
        ) : (
          <div className="text-zinc-400 flex items-center gap-2">
            <Maximize2 className="h-3.5 w-3.5" />
            <span>차트 위에 마우스를 올리면 해당 일자의 상세 사용량 수치를 확인할 수 있습니다.</span>
          </div>
        )}
        <div className="text-[11px] text-zinc-400">
          총 {sortedData.length}일 기록 ({sortedData[0]?.usage_date} ~ {sortedData[sortedData.length - 1]?.usage_date})
        </div>
      </div>

      {/* 3. 차트 캔버스 영역 */}
      <div className="p-4 space-y-6">
        {/* CHART 1: 컴퓨트 사용량 (Credits) */}
        {(viewMode === 'all' || viewMode === 'compute') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-zinc-800">
                <Cpu className="h-4 w-4 text-indigo-600" />
                <span>일별 컴퓨트 사용량 (Compute Credits)</span>
              </div>
              {/* 범례 */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-indigo-500/30 border border-indigo-500" />
                  <span>Snowflake 웨어하우스</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500/30 border border-emerald-500" />
                  <span>AI 서비스 & 토큰</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-indigo-700" />
                  <span>총 크레딧</span>
                </div>
              </div>
            </div>

            <div className="relative w-full overflow-hidden bg-zinc-50/40 rounded-lg border border-zinc-100">
              <svg
                viewBox={`0 0 ${svgWidth} ${chartHeight}`}
                className="w-full h-auto block select-none"
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="compSfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="compAiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Y축 그리드 라인 & 레이블 */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const val = computeScale.min + (computeScale.max - computeScale.min) * (1 - ratio);
                  const y = padding.top + plotHeight * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e4e4e7"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        fill="#71717a"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {formatCreditsCompact(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Area paths */}
                <path d={paths.computeSfArea} fill="url(#compSfGrad)" />
                <path d={paths.computeAiArea} fill="url(#compAiGrad)" />

                {/* Total Line */}
                <path
                  d={paths.computeTotalLine}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* X축 레이블 (compute 단독 모드일 때 렌더링) */}
                {viewMode === 'compute' &&
                  xLabels.map((lbl, i) => (
                    <text
                      key={i}
                      x={lbl.x}
                      y={chartHeight - 12}
                      fill="#71717a"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {lbl.text}
                    </text>
                  ))}

                {/* 호버 가이드라인 & 포인트 */}
                {hoverIndex !== null && sortedData[hoverIndex] && (
                  <g>
                    <line
                      x1={calcX(hoverIndex)}
                      y1={padding.top}
                      x2={calcX(hoverIndex)}
                      y2={padding.top + plotHeight}
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={calcX(hoverIndex)}
                      cy={calcComputeY(sortedData[hoverIndex].total_credits)}
                      r="4"
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* 호버 감지용 인터랙티브 바 (투명) */}
                {sortedData.map((_, i) => {
                  const barWidth = plotWidth / sortedData.length;
                  const x = calcX(i) - barWidth / 2;
                  return (
                    <rect
                      key={i}
                      x={Math.max(padding.left, x)}
                      y={padding.top}
                      width={barWidth}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverIndex(i)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* CHART 2: 스토리지 사용량 (Bytes) */}
        {(viewMode === 'all' || viewMode === 'storage') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-zinc-800">
                <HardDrive className="h-4 w-4 text-sky-600" />
                <span>일별 스토리지 사용량 (Storage Usage)</span>
              </div>
              {/* 범례 */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-sky-500/30 border border-sky-500" />
                  <span>활성 스토리지</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-amber-500/30 border border-amber-500" />
                  <span>스테이지 & 페일세이프</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-sky-700" />
                  <span>총 스토리지</span>
                </div>
              </div>
            </div>

            <div className="relative w-full overflow-hidden bg-zinc-50/40 rounded-lg border border-zinc-100">
              <svg
                viewBox={`0 0 ${svgWidth} ${chartHeight}`}
                className="w-full h-auto block select-none"
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="stActiveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="stStageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Y축 그리드 라인 & 레이블 */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const val = storageScale.min + (storageScale.max - storageScale.min) * (1 - ratio);
                  const y = padding.top + plotHeight * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e4e4e7"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        fill="#71717a"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {formatBytesCompact(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Area paths */}
                <path d={paths.storageActiveArea} fill="url(#stActiveGrad)" />
                <path d={paths.storageStageArea} fill="url(#stStageGrad)" />

                {/* Total Line */}
                <path
                  d={paths.storageTotalLine}
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* X축 대표 레이블 */}
                {xLabels.map((lbl, i) => (
                  <text
                    key={i}
                    x={lbl.x}
                    y={chartHeight - 12}
                    fill="#71717a"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {lbl.text}
                  </text>
                ))}

                {/* 호버 가이드라인 & 포인트 */}
                {hoverIndex !== null && sortedData[hoverIndex] && (
                  <g>
                    <line
                      x1={calcX(hoverIndex)}
                      y1={padding.top}
                      x2={calcX(hoverIndex)}
                      y2={padding.top + plotHeight}
                      stroke="#0284c7"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={calcX(hoverIndex)}
                      cy={calcStorageY(sortedData[hoverIndex].total_storage_bytes)}
                      r="4"
                      fill="#0369a1"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* 호버 감지용 인터랙티브 바 (투명) */}
                {sortedData.map((_, i) => {
                  const barWidth = plotWidth / sortedData.length;
                  const x = calcX(i) - barWidth / 2;
                  return (
                    <rect
                      key={i}
                      x={Math.max(padding.left, x)}
                      y={padding.top}
                      width={barWidth}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverIndex(i)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
