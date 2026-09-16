'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { StorageUsage } from '@/types/storage';
import { formatBytes, formatBytesCompact } from '@/lib/formatters';
import {
  Calendar,
  Database,
  Layers,
  Shield,
  HardDrive,
  Minus,
  Plus,
  RotateCcw,
  Info,
} from 'lucide-react';

export type RangeOption = 'days' | 'custom';

interface StorageChartProps {
  currentData: StorageUsage[];
  previousData?: StorageUsage[];
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

/**
 * 1,024 단위 기반 스토리지 단위 정보 산출 (TB, GB, MB 등)
 */
export function getStorageUnitInfo(bytes: number) {
  const k = 1024;
  if (bytes >= Math.pow(k, 4)) {
    return { unit: 'TB', power: 4, unitBytes: Math.pow(k, 4) };
  }
  if (bytes >= Math.pow(k, 3)) {
    return { unit: 'GB', power: 3, unitBytes: Math.pow(k, 3) };
  }
  if (bytes >= Math.pow(k, 2)) {
    return { unit: 'MB', power: 2, unitBytes: Math.pow(k, 2) };
  }
  if (bytes >= k) {
    return { unit: 'KB', power: 1, unitBytes: k };
  }
  return { unit: 'B', power: 0, unitBytes: 1 };
}

/**
 * 10 단위 스텝 산출 (예: 10 TB, 10 GB)
 */
export function getStepUnit(val: number): number {
  if (val <= 0 || isNaN(val)) return 10 * Math.pow(1024, 3); // 기본 10 GB
  const unitInfo = getStorageUnitInfo(val);
  return 10 * unitInfo.unitBytes;
}

/**
 * 데이터에 기반하여 10단위 스케일로 최소/최대 범위 산출
 * 예: 전체 누적 130 TB, Storage Bytes 125 TB -> 100 TB ~ 150 TB
 */
export function calculateInitialScale(data: StorageUsage[]) {
  if (data.length === 0) {
    const defaultUnit = Math.pow(1024, 4); // 1 TB
    return {
      min: 0,
      max: 100 * defaultUnit,
      dataMin: 0,
      dataMax: 100 * defaultUnit,
      step: 10 * defaultUnit,
    };
  }

  let maxTotal = -Infinity;
  let minStorage = Infinity;

  for (const item of data) {
    const s = Number(item.storage_bytes) || 0;
    const st = Number(item.stage_bytes) || 0;
    const f = Number(item.failsafe_bytes) || 0;
    const total = s + st + f;

    maxTotal = Math.max(maxTotal, total);
    minStorage = Math.min(minStorage, s);
  }

  if (maxTotal === -Infinity || maxTotal <= 0) {
    const defaultUnit = Math.pow(1024, 4);
    return {
      min: 0,
      max: 100 * defaultUnit,
      dataMin: 0,
      dataMax: 100 * defaultUnit,
      step: 10 * defaultUnit,
    };
  }

  const unitInfo = getStorageUnitInfo(maxTotal);
  const unitBytes = unitInfo.unitBytes;
  const stepBytes = 10 * unitBytes;

  const maxInUnits = maxTotal / unitBytes;
  const minInUnits = minStorage / unitBytes;

  let calcMaxInUnits = 100;
  let calcMinInUnits = 0;

  if (maxInUnits >= 80) {
    // 80단위 이상 (예: 130 TB) -> 50단위 그리드 (100 ~ 150 TB)
    calcMaxInUnits = Math.ceil((maxInUnits + 5) / 50) * 50;
    calcMinInUnits = Math.max(0, Math.floor((minInUnits - 5) / 50) * 50);
  } else if (maxInUnits >= 30) {
    // 30~80단위 -> 10단위 올림/내림
    calcMaxInUnits = (Math.ceil(maxInUnits / 10) + 1) * 10;
    calcMinInUnits = Math.max(0, (Math.floor(minInUnits / 10) - 1) * 10);
  } else {
    // 30단위 미만 -> 10단위 올림 및 0 시작
    calcMaxInUnits = Math.max(10, Math.ceil(maxInUnits / 10) * 10);
    calcMinInUnits = 0;
  }

  return {
    min: calcMinInUnits * unitBytes,
    max: calcMaxInUnits * unitBytes,
    dataMin: minStorage,
    dataMax: maxTotal,
    step: stepBytes,
  };
}

export default function StorageChart({
  currentData,
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
}: StorageChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 사용자가 수동 조절한 최소값 / 최대값
  const [customMin, setCustomMin] = useState<number | null>(null);
  const [customMax, setCustomMax] = useState<number | null>(null);

  // 날짜 오름차순 정렬 (과거 -> 최신)
  const currentSortedAsc = useMemo(() => {
    return [...currentData].sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [currentData]);

  // 데이터 기반 계산된 스케일
  const computedScale = useMemo(() => {
    return calculateInitialScale(currentSortedAsc);
  }, [currentSortedAsc]);

  // 실제 적용되는 Y축 최소값 / 최대값
  const yMin = useMemo(() => {
    if (customMin !== null) {
      return Math.min(customMin, computedScale.min);
    }
    return computedScale.min;
  }, [customMin, computedScale.min]);

  const yMax = useMemo(() => {
    if (customMax !== null) {
      return Math.max(customMax, computedScale.max);
    }
    return computedScale.max;
  }, [customMax, computedScale.max]);

  // 10단위 스���
  const currentStep = useMemo(() => {
    return getStepUnit(yMax);
  }, [yMax]);

  // 최소/최대값 수동 조절 핸들러 (10단위 증감)
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

  // Y축 눈금 (5개)
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
  const padding = { top: 20, right: 30, bottom: 40, left: 80 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // 누적 포인트 데이터 생성 (Storage -> Stage -> Failsafe)
  const { stackedData, storageAreaPath, stageAreaPath, failsafeAreaPath, topTotalLinePath } = useMemo(() => {
    const total = currentSortedAsc.length;
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

    const pts = currentSortedAsc.map((d, i) => {
      const storage = Number(d.storage_bytes) || 0;
      const stage = Number(d.stage_bytes) || 0;
      const failsafe = Number(d.failsafe_bytes) || 0;

      const cumStorage = storage;
      const cumStage = storage + stage;
      const cumFailsafe = storage + stage + failsafe;

      const x = calcX(i);
      const yStorage = calcY(cumStorage);
      const yStage = calcY(cumStage);
      const yFailsafe = calcY(cumFailsafe);

      return {
        x,
        storage,
        stage,
        failsafe,
        cumStorage,
        cumStage,
        cumFailsafe,
        yBase,
        yStorage,
        yStage,
        yFailsafe,
        date: d.usage_date,
      };
    });

    if (pts.length === 0) {
      return {
        stackedData: [],
        storageAreaPath: '',
        stageAreaPath: '',
        failsafeAreaPath: '',
        topTotalLinePath: '',
      };
    }

    // 1. Storage Area (하단 기본 레이어: yBase ~ yStorage)
    const storageForward = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yBase} L ${p.x} ${p.yStorage}` : `L ${p.x} ${p.yStorage}`)).join(' ');
    const storageBackward = `L ${pts[pts.length - 1].x} ${yBase} Z`;
    const storagePath = `${storageForward} ${storageBackward}`;

    // 2. Stage Area (중간 누적 레이어: yStorage ~ yStage)
    const stageForward = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yStorage} L ${p.x} ${p.yStage}` : `L ${p.x} ${p.yStage}`)).join(' ');
    const stageBackward = pts.slice().reverse().map((p) => `L ${p.x} ${p.yStorage}`).join(' ') + ' Z';
    const stagePath = `${stageForward} ${stageBackward}`;

    // 3. Failsafe Area (상단 누적 레이어: yStage ~ yFailsafe)
    const failsafeForward = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yStage} L ${p.x} ${p.yFailsafe}` : `L ${p.x} ${p.yFailsafe}`)).join(' ');
    const failsafeBackward = pts.slice().reverse().map((p) => `L ${p.x} ${p.yStage}`).join(' ') + ' Z';
    const failsafePath = `${failsafeForward} ${failsafeBackward}`;

    // 최상단 Total Line
    const topLine = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yFailsafe}` : `L ${p.x} ${p.yFailsafe}`)).join(' ');

    return {
      stackedData: pts,
      storageAreaPath: storagePath,
      stageAreaPath: stagePath,
      failsafeAreaPath: failsafePath,
      topTotalLinePath: topLine,
    };
  }, [currentSortedAsc, yMin, yMax, currentStep, chartWidth, chartHeight, padding.left, padding.top]);

  // 최신 요약 데이터
  const latestItem = currentSortedAsc.length > 0 ? currentSortedAsc[currentSortedAsc.length - 1] : null;

  const activePoint = hoverIndex !== null && stackedData[hoverIndex] ? {
    raw: currentSortedAsc[hoverIndex],
    point: stackedData[hoverIndex],
    index: hoverIndex,
  } : null;

  return (
    <div className="space-y-4">
      {/* 1. 상단 컨트롤 바 (기간 선택 + Y축 10단위 Min/Max 조절) */}
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

          {/* 그래프 Y축 범위 (최소값, 최대값 10단위 조절) */}
          <div className={`flex flex-wrap items-center gap-2 ${hideRangeControls ? '' : 'pl-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-zinc-200'}`}>
            {/* Min 조절 */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs">
              <span className="text-zinc-500 font-medium">최소:</span>
              <button
                type="button"
                onClick={handleDecreaseMin}
                disabled={yMin <= 0}
                title="최소값 감소 (10단위)"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 disabled:opacity-30 transition"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-mono font-bold text-zinc-800 min-w-[56px] text-center">
                {formatBytesCompact(yMin)}
              </span>
              <button
                type="button"
                onClick={handleIncreaseMin}
                disabled={yMin >= yMax - currentStep}
                title="최소값 증가 (10단위)"
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
                title="최대값 감소 (10단위)"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 disabled:opacity-30 transition"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-mono font-bold text-zinc-800 min-w-[56px] text-center">
                {formatBytesCompact(yMax)}
              </span>
              <button
                type="button"
                onClick={handleIncreaseMax}
                title="최대값 증가 (10단위)"
                className="p-0.5 hover:bg-zinc-200 rounded text-zinc-600 transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* 자동 맞춤 버튼 */}
            <button
              type="button"
              onClick={handleResetScale}
              title="데이터 기준 10단위 최적 범위로 재설정"
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

        {/* 3대 지표 누적 순서 범례 (Failsafe -> Stage -> Storage) */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-zinc-800" title="상단 누적 레이어">
            <span className="inline-block w-3 h-3 rounded-xs bg-amber-500 shadow-2xs" />
            <span>Failsafe Bytes (상단)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-800" title="중간 누적 레이어">
            <span className="inline-block w-3 h-3 rounded-xs bg-emerald-600 shadow-2xs" />
            <span>Stage Bytes (중간)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-800" title="하단 기본 레이어 (항상 가장 큼)">
            <span className="inline-block w-3 h-3 rounded-xs bg-indigo-600 shadow-2xs" />
            <span>Storage Bytes (하단)</span>
          </div>
        </div>
      </div>

      {/* 2. 상단 핵심 요약 배너 (1,024 기준 GB/TB) */}
      {latestItem && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>최신 Storage Bytes ({latestItem.usage_date})</span>
              <HardDrive className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-indigo-700 mt-1">
              {formatBytes(latestItem.storage_bytes)}
            </p>
            <span className="text-[11px] text-zinc-400">
              하단 기본 레이어
            </span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>최신 Stage Bytes</span>
              <Layers className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {formatBytes(latestItem.stage_bytes)}
            </p>
            <span className="text-[11px] text-zinc-400">
              중간 누적 레이어
            </span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>최신 Failsafe Bytes</span>
              <Shield className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-600 mt-1">
              {formatBytes(latestItem.failsafe_bytes ?? 0)}
            </p>
            <span className="text-[11px] text-zinc-400">
              상단 누적 레이어
            </span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>최신 총합 (누적 Total)</span>
              <Database className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-lg font-bold text-purple-700 mt-1">
              {formatBytes(
                (Number(latestItem.storage_bytes) || 0) +
                  (Number(latestItem.stage_bytes) || 0) +
                  (Number(latestItem.failsafe_bytes) || 0)
              )}
            </p>
            <span className="text-[11px] text-zinc-400">
              전체 누적 사용량
            </span>
          </div>
        </div>
      )}

      {/* 3. 메인 누적 영역 그래프 (Stacked Area Chart) SVG */}
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
                {/* Storage Gradients */}
                <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity="0.55" />
                </linearGradient>
                {/* Stage Gradients */}
                <linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
                </linearGradient>
                {/* Failsafe Gradients */}
                <linearGradient id="failsafeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.75" />
                </linearGradient>
              </defs>

              {/* 그리드 가로선 및 Y축 눈금 */}
              {yTicks.map((tick, i) => {
                const safeMax = yMax > yMin ? yMax : yMin + currentStep;
                const ratio = safeMax === yMin ? 0.5 : (tick - yMin) / (safeMax - yMin);
                const y = padding.top + chartHeight - ratio * chartHeight;
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

              {/* 1) Storage Bytes 영역 (하단 레이어) */}
              {storageAreaPath && (
                <path
                  d={storageAreaPath}
                  fill="url(#storageGrad)"
                  stroke="#3730a3"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              )}

              {/* 2) Stage Bytes 영역 (중간 누적 레이어) */}
              {stageAreaPath && (
                <path
                  d={stageAreaPath}
                  fill="url(#stageGrad)"
                  stroke="#047857"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              )}

              {/* 3) Failsafe Bytes 영역 (상단 누적 레이어) */}
              {failsafeAreaPath && (
                <path
                  d={failsafeAreaPath}
                  fill="url(#failsafeGrad)"
                  stroke="#b45309"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              )}

              {/* 최상단 Total 외곽 라인 */}
              {topTotalLinePath && (
                <path
                  d={topTotalLinePath}
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2"
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

                  const total = currentSortedAsc.length;
                  const x = total <= 1 ? padding.left + chartWidth / 2 : padding.left + (i / (total - 1)) * chartWidth;
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

              {/* 마우스 호버 가이드 라인 및 누적 레이어 포인터 */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.point.x}
                    y1={padding.top}
                    x2={activePoint.point.x}
                    y2={padding.top + chartHeight}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  {/* Storage point dot (하단) */}
                  <circle
                    cx={activePoint.point.x}
                    cy={activePoint.point.yStorage}
                    r="4.5"
                    fill="#4f46e5"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  {/* Stage point dot (중간) */}
                  <circle
                    cx={activePoint.point.x}
                    cy={activePoint.point.yStage}
                    r="4.5"
                    fill="#10b981"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  {/* Failsafe point dot (상단) */}
                  <circle
                    cx={activePoint.point.x}
                    cy={activePoint.point.yFailsafe}
                    r="4.5"
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* 인터랙티브 호버 감지 투명 바 */}
              {stackedData.map((pt, i) => {
                const total = stackedData.length;
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

            {/* 활성 포인트 누적 툴팁 */}
            {activePoint && (
              <div
                className="absolute z-20 pointer-events-none bg-zinc-900/95 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 border border-zinc-700/60 backdrop-blur-xs transition-all min-w-[210px]"
                style={{
                  left: `${Math.min(
                    Math.max(10, (activePoint.point.x / svgWidth) * 100),
                    78
                  )}%`,
                  top: '15px',
                }}
              >
                <div className="font-semibold text-zinc-200 border-b border-zinc-700 pb-1 flex items-center justify-between">
                  <span>{activePoint.raw.usage_date}</span>
                  <span className="text-[10px] text-zinc-400">누적 구성</span>
                </div>
                <div className="pt-0.5 space-y-1.5">
                  {/* Failsafe (상단) */}
                  <div className="flex justify-between items-center gap-3 text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                      Failsafe (상단):
                    </span>
                    <span className="font-mono font-bold">
                      {formatBytes(activePoint.point.failsafe)}
                    </span>
                  </div>

                  {/* Stage (중간) */}
                  <div className="flex justify-between items-center gap-3 text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      Stage (중간):
                    </span>
                    <span className="font-mono font-bold">
                      {formatBytes(activePoint.point.stage)}
                    </span>
                  </div>

                  {/* Storage (하단) */}
                  <div className="flex justify-between items-center gap-3 text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
                      Storage (하단):
                    </span>
                    <span className="font-mono font-bold">
                      {formatBytes(activePoint.point.storage)}
                    </span>
                  </div>

                  {/* 누적 Total */}
                  <div className="flex justify-between items-center gap-3 text-zinc-200 pt-1.5 border-t border-zinc-700/80 text-[11px]">
                    <span className="font-semibold text-purple-300">누적 총합 (Total):</span>
                    <span className="font-mono font-bold text-white">
                      {formatBytes(activePoint.point.cumFailsafe)}
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
