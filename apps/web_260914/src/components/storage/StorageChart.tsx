'use client';

import React, { useMemo, useState } from 'react';
import { StorageUsage } from '@/types/storage';
import { formatBytes, formatBytesCompact } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Database,
  BarChart2,
  Info,
} from 'lucide-react';

export type RangeOption = '30d' | '90d' | 'custom';

interface StorageChartProps {
  currentData: StorageUsage[];
  previousData?: StorageUsage[];
  selectedRange: RangeOption;
  onRangeChange: (range: RangeOption) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFetchCustomRange: () => void;
  isLoading?: boolean;
}

export default function StorageChart({
  currentData,
  previousData = [],
  selectedRange,
  onRangeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFetchCustomRange,
  isLoading = false,
}: StorageChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeMetric, setActiveMetric] = useState<'storage' | 'stage' | 'total'>('storage');
  const [showComparison, setShowComparison] = useState<boolean>(true);

  // Sort chronological for left-to-right line chart
  const currentSortedAsc = useMemo(() => {
    return [...currentData].sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [currentData]);

  const previousSortedAsc = useMemo(() => {
    return [...previousData].sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [previousData]);

  // Metric extraction helper
  const getMetricValue = (item: StorageUsage, metric: 'storage' | 'stage' | 'total'): number => {
    if (metric === 'storage') return Number(item.storage_bytes) || 0;
    if (metric === 'stage') return Number(item.stage_bytes) || 0;
    return (Number(item.storage_bytes) || 0) + (Number(item.stage_bytes) || 0);
  };

  // Find Min / Max for SVG scale
  const { minValue, maxValue, yTicks } = useMemo(() => {
    const currentValues = currentSortedAsc.map((d) => getMetricValue(d, activeMetric));
    const prevValues = (showComparison && selectedRange !== 'custom')
      ? previousSortedAsc.map((d) => getMetricValue(d, activeMetric))
      : [];

    const allValues = [...currentValues, ...prevValues];

    if (allValues.length === 0) {
      return { minValue: 0, maxValue: 100, yTicks: [0, 25, 50, 75, 100] };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Add buffer
    const range = max - min || (max > 0 ? max * 0.1 : 100);
    const calculatedMin = Math.max(0, min - range * 0.08);
    const calculatedMax = max + range * 0.08;

    const ticks = [
      calculatedMin,
      calculatedMin + (calculatedMax - calculatedMin) * 0.25,
      calculatedMin + (calculatedMax - calculatedMin) * 0.5,
      calculatedMin + (calculatedMax - calculatedMin) * 0.75,
      calculatedMax,
    ];

    return {
      minValue: calculatedMin,
      maxValue: calculatedMax,
      yTicks: ticks,
    };
  }, [currentSortedAsc, previousSortedAsc, activeMetric, showComparison, selectedRange]);

  // SVG dimensions
  const svgWidth = 1000;
  const svgHeight = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 80 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Coordinate mappers
  const getX = (index: number, total: number) => {
    if (total <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (total - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    if (maxValue === minValue) return padding.top + chartHeight / 2;
    const ratio = (value - minValue) / (maxValue - minValue);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  // Build SVG path
  const currentPoints = useMemo(() => {
    return currentSortedAsc.map((d, i) => {
      const val = getMetricValue(d, activeMetric);
      return {
        x: getX(i, currentSortedAsc.length),
        y: getY(val),
        data: d,
        value: val,
        index: i,
      };
    });
  }, [currentSortedAsc, activeMetric, minValue, maxValue, chartWidth, chartHeight]);

  const currentPathD = useMemo(() => {
    if (currentPoints.length === 0) return '';
    return currentPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [currentPoints]);

  const currentAreaD = useMemo(() => {
    if (currentPoints.length === 0) return '';
    const firstX = currentPoints[0].x;
    const lastX = currentPoints[currentPoints.length - 1].x;
    const bottomY = padding.top + chartHeight;
    return `${currentPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [currentPathD, currentPoints, chartHeight]);

  // Previous comparison path
  const previousPoints = useMemo(() => {
    if (!showComparison || selectedRange === 'custom' || previousSortedAsc.length === 0) return [];
    return previousSortedAsc.map((d, i) => {
      const val = getMetricValue(d, activeMetric);
      return {
        x: getX(i, previousSortedAsc.length),
        y: getY(val),
        data: d,
        value: val,
        index: i,
      };
    });
  }, [previousSortedAsc, showComparison, selectedRange, activeMetric, minValue, maxValue, chartWidth, chartHeight]);

  const previousPathD = useMemo(() => {
    if (previousPoints.length === 0) return '';
    return previousPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [previousPoints]);

  // Growth / Rate calculation
  const statsSummary = useMemo(() => {
    if (currentSortedAsc.length === 0) return null;
    const latest = currentSortedAsc[currentSortedAsc.length - 1];
    const earliest = currentSortedAsc[0];
    const latestVal = getMetricValue(latest, activeMetric);
    const earliestVal = getMetricValue(earliest, activeMetric);
    const diff = latestVal - earliestVal;
    const percentChange = earliestVal > 0 ? (diff / earliestVal) * 100 : 0;

    return {
      latestVal,
      diff,
      percentChange,
      latestDate: latest.usage_date,
    };
  }, [currentSortedAsc, activeMetric]);

  const activePoint = hoverIndex !== null && currentPoints[hoverIndex] ? currentPoints[hoverIndex] : null;
  const activePrevPoint = hoverIndex !== null && previousPoints[hoverIndex] ? previousPoints[hoverIndex] : null;

  const comparisonLabel = selectedRange === '30d' ? '30일 전 비교 기간' : selectedRange === '90d' ? '90일 전 비교 기간' : '이전 비교 기간';

  return (
    <div className="space-y-4">
      {/* 1. 상단 컨트롤 바 (30일, 90일, 날짜선택 및 커스텀 일자 피커) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 text-xs font-semibold text-zinc-600">
            <button
              type="button"
              onClick={() => onRangeChange('30d')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedRange === '30d'
                  ? 'bg-white text-zinc-900 shadow-xs font-bold'
                  : 'hover:text-zinc-900'
              }`}
            >
              30일
            </button>
            <button
              type="button"
              onClick={() => onRangeChange('90d')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedRange === '90d'
                  ? 'bg-white text-zinc-900 shadow-xs font-bold'
                  : 'hover:text-zinc-900'
              }`}
            >
              90일
            </button>
            <button
              type="button"
              onClick={() => onRangeChange('custom')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedRange === 'custom'
                  ? 'bg-white text-zinc-900 shadow-xs font-bold'
                  : 'hover:text-zinc-900'
              }`}
            >
              날짜선택
            </button>
          </div>

          {/* 지표 선택 (Storage / Stage / Total) */}
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveMetric('storage')}
              className={`text-xs px-2.5 py-1 rounded-md transition border ${
                activeMetric === 'storage'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Storage Bytes
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('stage')}
              className={`text-xs px-2.5 py-1 rounded-md transition border ${
                activeMetric === 'stage'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Stage Bytes
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('total')}
              className={`text-xs px-2.5 py-1 rounded-md transition border ${
                activeMetric === 'total'
                  ? 'bg-purple-50 border-purple-200 text-purple-700 font-semibold'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Total Bytes
            </button>
          </div>
        </div>

        {/* 날짜선택 시 인터페이스 & get 버튼 */}
        {selectedRange === 'custom' && (
          <div className="flex items-center gap-2 animate-fade-in">
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

        {/* 범례 및 과거 데이터 오버레이 토글 */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-700">
            <span className="inline-block w-3 h-0.5 bg-indigo-600 rounded-full" />
            <span className="font-medium">현재 기간</span>
          </div>
          {selectedRange !== 'custom' && previousSortedAsc.length > 0 && (
            <label className="flex items-center gap-1.5 text-zinc-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span className="inline-block w-3 h-0.5 bg-indigo-300 border-b border-dashed border-indigo-400" />
              <span>{comparisonLabel}</span>
            </label>
          )}
        </div>
      </div>

      {/* 2. 상단 핵심 요약 배너 */}
      {statsSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>최신 사용량 ({statsSummary.latestDate})</span>
              <Database className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <p className="text-lg font-bold text-zinc-900 mt-1">
              {formatBytes(statsSummary.latestVal)}
            </p>
            <span className="text-[11px] text-zinc-400">
              {statsSummary.latestVal.toLocaleString()} Bytes
            </span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>기간 내 증감량</span>
              {statsSummary.diff >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
            <p
              className={`text-lg font-bold mt-1 ${
                statsSummary.diff >= 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {statsSummary.diff >= 0 ? '+' : ''}
              {formatBytes(statsSummary.diff)}
            </p>
            <span className="text-[11px] text-zinc-400">
              {statsSummary.percentChange >= 0 ? '+' : ''}
              {statsSummary.percentChange.toFixed(2)}% 변동
            </span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>기간 내 최고 사용량</span>
              <BarChart2 className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-indigo-600 mt-1">
              {formatBytes(maxValue)}
            </p>
            <span className="text-[11px] text-zinc-400">최대치 피크 기록</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>데이터 포인트 수</span>
              <Layers className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-lg font-bold text-purple-600 mt-1">
              {currentSortedAsc.length}일치
            </p>
            <span className="text-[11px] text-zinc-400">
              {currentSortedAsc[0]?.usage_date} ~ {statsSummary.latestDate}
            </span>
          </div>
        </div>
      )}

      {/* 3. 메인 인터랙티브 선형 그래프 SVG */}
      <div className="relative bg-white border border-zinc-200 rounded-lg p-2 sm:p-4">
        {currentSortedAsc.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-sm gap-2">
            <Info className="h-6 w-6 text-zinc-300" />
            <span>선택한 기간 동안의 스토리지 사용량 데이터가 없습니다.</span>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-72 select-none"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 그리드 가로선 및 Y축 눈금 */}
              {yTicks.map((tick, i) => {
                const y = getY(tick);
                return (
                  <g key={`ytick-${i}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={i === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {formatBytesCompact(tick)}
                    </text>
                  </g>
                );
              })}

              {/* 이전 비교 기간 선형 그래프 (약간 옅은 색 & 점선 또는 은은한 라인) */}
              {showComparison && selectedRange !== 'custom' && previousPathD && (
                <g className="transition-opacity duration-300">
                  <path
                    d={previousPathD}
                    fill="none"
                    stroke="#c7d2fe"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {previousPoints.map((pt, i) => (
                    <circle
                      key={`prev-pt-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="2"
                      fill="#a5b4fc"
                      opacity="0.6"
                    />
                  ))}
                </g>
              )}

              {/* 현재 기간 Area 그라데이션 채우기 */}
              {currentAreaD && (
                <path d={currentAreaD} fill="url(#storageGradient)" />
              )}

              {/* 현재 기간 메인 선형 그래프 */}
              {currentPathD && (
                <path
                  d={currentPathD}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X축 날짜 라벨 (적절한 간격으로 표시) */}
              {(() => {
                const step = Math.max(1, Math.floor(currentSortedAsc.length / 6));
                return currentSortedAsc.map((d, i) => {
                  const isFirst = i === 0;
                  const isLast = i === currentSortedAsc.length - 1;
                  const isInterval = i % step === 0;

                  if (!isFirst && !isLast && !isInterval) return null;

                  const x = getX(i, currentSortedAsc.length);
                  return (
                    <g key={`xlabel-${i}`}>
                      <line
                        x1={x}
                        y1={padding.top + chartHeight}
                        x2={x}
                        y2={padding.top + chartHeight + 4}
                        stroke="#cbd5e1"
                      />
                      <text
                        x={x}
                        y={padding.top + chartHeight + 16}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {d.usage_date.substring(5)}
                      </text>
                    </g>
                  );
                });
              })()}

              {/* 마우스 호버 가이드 라인 및 포인터 */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1={padding.top}
                    x2={activePoint.x}
                    y2={padding.top + chartHeight}
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {activePrevPoint && (
                    <circle
                      cx={activePrevPoint.x}
                      cy={activePrevPoint.y}
                      r="4.5"
                      fill="#a5b4fc"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5.5"
                    fill="#4338ca"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* 인터랙티브 호버 감지 투명 바 */}
              {currentPoints.map((pt, i) => {
                const total = currentPoints.length;
                const barWidth = chartWidth / total;
                const xStart = pt.x - barWidth / 2;
                return (
                  <rect
                    key={`hover-col-${i}`}
                    x={xStart}
                    y={padding.top}
                    width={barWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                  />
                );
              })}
            </svg>

            {/* 활성 포인트 툴팁 */}
            {activePoint && (
              <div
                className="absolute z-20 pointer-events-none bg-zinc-900/95 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 border border-zinc-700/60 backdrop-blur-xs transition-all"
                style={{
                  left: `${Math.min(
                    Math.max(10, (activePoint.x / svgWidth) * 100),
                    82
                  )}%`,
                  top: '15px',
                }}
              >
                <div className="font-semibold text-zinc-200 border-b border-zinc-700 pb-1 flex items-center justify-between gap-4">
                  <span>{activePoint.data.usage_date}</span>
                  <span className="text-[10px] text-zinc-400 capitalize">
                    {activeMetric}
                  </span>
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <div className="flex justify-between gap-3 text-indigo-300">
                    <span>현재 사용량:</span>
                    <span className="font-mono font-bold">
                      {formatBytes(activePoint.value)}
                    </span>
                  </div>
                  {activePrevPoint && (
                    <div className="flex justify-between gap-3 text-zinc-400 text-[11px]">
                      <span>
                        이전 ({activePrevPoint.data.usage_date}):
                      </span>
                      <span className="font-mono">
                        {formatBytes(activePrevPoint.value)}
                      </span>
                    </div>
                  )}
                  {activePrevPoint && (
                    <div className="flex justify-between gap-3 text-[10px] pt-0.5 border-t border-zinc-800">
                      <span>차이:</span>
                      <span
                        className={`font-mono font-semibold ${
                          activePoint.value >= activePrevPoint.value
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {activePoint.value >= activePrevPoint.value ? '+' : ''}
                        {formatBytes(activePoint.value - activePrevPoint.value)}
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800 flex justify-between">
                    <span>Storage / Stage:</span>
                    <span>
                      {formatBytesCompact(activePoint.data.storage_bytes)} /{' '}
                      {formatBytesCompact(activePoint.data.stage_bytes)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
