'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  HardDrive,
  Cpu,
  RefreshCw,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Sparkles,
  Server,
} from 'lucide-react';
import StorageChart from '@/components/storage/StorageChart';
import ComputeChart from '@/components/compute/ComputeChart';
import { StorageUsageResponse, StorageUsage } from '@/types/storage';
import { ComputeUsageResponse, ComputeDailyUsage } from '@/types/compute';
import { formatBytes, formatCredits } from '@/lib/formatters';

const CHART_DAYS = 30;

// ─── 알고리즘 헬퍼 ───────────────────────────────────────────────────────────

/** 단순 선형회귀 y = ax + b */
function linearReg(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length;
  if (n < 2) return { a: 0, b: ys[0] ?? 0 };
  const sx = xs.reduce((s, x) => s + x, 0);
  const sy = ys.reduce((s, y) => s + y, 0);
  const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sxx = xs.reduce((s, x) => s + x * x, 0);
  const d = n * sxx - sx * sx;
  if (d === 0) return { a: 0, b: sy / n };
  const a = (n * sxy - sx * sy) / d;
  return { a, b: (sy - a * sx) / n };
}

/** 해당 년월의 총 일수 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // month는 1-based
}

// ─── 예측값 타입 ─────────────────────────────────────────────────────────────

interface ForecastResult {
  ratio: number;    // 전월비율기반
  linear: number;   // 선형회귀
  wma: number;      // 가중이동평균
  elapsed: number;
  total: number;
  remaining: number;
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [storageData, setStorageData] = useState<StorageUsageResponse | null>(null);
  const [computeData, setComputeData] = useState<ComputeUsageResponse | null>(null);

  // 이번달 데이터
  const [monthStorageData, setMonthStorageData] = useState<StorageUsage[]>([]);
  const [monthComputeDaily, setMonthComputeDaily] = useState<ComputeDailyUsage[]>([]);

  // 전월 데이터 (알고리즘1 전월비율 계산용)
  const [prevStorageData, setPrevStorageData] = useState<StorageUsage[]>([]);
  const [prevComputeDaily, setPrevComputeDaily] = useState<ComputeDailyUsage[]>([]);

  const currentDateInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const formatted = `${year}년 ${month}월`;
    return { year, month, monthStr, formatted };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    try {
      // 전월 startDate / endDate 계산
      const now = new Date();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 0-based → 1-based
      const prevLastDay = getDaysInMonth(prevYear, prevMonth);
      const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const prevEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

      const [
        storageRes, computeRes,
        monthStorageRes, monthComputeRes,
        prevStorageRes, prevComputeRes,
      ] = await Promise.all([
        fetch(`${basePath}/api/storage?days=${CHART_DAYS}`),
        fetch(`${basePath}/api/compute?days=${CHART_DAYS}`),
        fetch(`${basePath}/api/storage?days=31`),
        fetch(`${basePath}/api/compute?days=31`),
        fetch(`${basePath}/api/storage?startDate=${prevStart}&endDate=${prevEnd}`),
        fetch(`${basePath}/api/compute?startDate=${prevStart}&endDate=${prevEnd}`),
      ]);

      if (!storageRes.ok || !computeRes.ok) {
        throw new Error('대시보드 데이터를 가져오는데 실패했습니다.');
      }

      const storageJson: StorageUsageResponse = await storageRes.json();
      const computeJson: ComputeUsageResponse = await computeRes.json();
      setStorageData(storageJson);
      setComputeData(computeJson);

      if (monthStorageRes.ok) {
        const j: StorageUsageResponse = await monthStorageRes.json();
        setMonthStorageData(j.currentData || []);
      }
      if (monthComputeRes.ok) {
        const j: ComputeUsageResponse = await monthComputeRes.json();
        setMonthComputeDaily(j.dailyData || []);
      }
      if (prevStorageRes.ok) {
        const j: StorageUsageResponse = await prevStorageRes.json();
        setPrevStorageData(j.currentData || []);
      }
      if (prevComputeRes.ok) {
        const j: ComputeUsageResponse = await prevComputeRes.json();
        setPrevComputeDaily(j.dailyData || []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── 이번달 스토리지 현황 ──────────────────────────────────────────────────
  const monthlyStorageStats = useMemo(() => {
    const prefix = currentDateInfo.monthStr;
    const cur = monthStorageData.filter(i => i.usage_date?.startsWith(prefix));
    const src = cur.length > 0 ? cur : monthStorageData;
    if (src.length === 0) return { latestDate: '', storageBytes: 0, stageBytes: 0, failsafeBytes: 0, totalBytes: 0 };
    const latest = src[0];
    const s = Number(latest.storage_bytes) || 0;
    const st = Number(latest.stage_bytes) || 0;
    const f = Number(latest.failsafe_bytes) || 0;
    return { latestDate: latest.usage_date || '', storageBytes: s, stageBytes: st, failsafeBytes: f, totalBytes: s + st + f };
  }, [monthStorageData, currentDateInfo.monthStr]);

  // ── 이번달 컴퓨트 현황 ──────────────────────────────────────────────────
  const monthlyComputeStats = useMemo(() => {
    const prefix = currentDateInfo.monthStr;
    const cur = monthComputeDaily.filter(i => i.usage_date?.startsWith(prefix));
    const src = cur.length > 0 ? cur : monthComputeDaily;
    let totalCredits = 0, comSfTotal = 0, comAiTotal = 0, aiTokenTotal = 0, latestDate = '';
    for (const item of src) {
      totalCredits += item.total_credits || 0;
      comSfTotal += item.com_sf || 0;
      comAiTotal += item.com_ai || 0;
      aiTokenTotal += item.ai_token || 0;
      if (!latestDate || item.usage_date > latestDate) latestDate = item.usage_date;
    }
    return {
      recordCount: src.length, latestDate,
      totalCredits: Number(totalCredits.toFixed(4)),
      comSfTotal: Number(comSfTotal.toFixed(4)),
      comAiTotal: Number(comAiTotal.toFixed(4)),
      aiTokenTotal: Number(aiTokenTotal.toFixed(4)),
    };
  }, [monthComputeDaily, currentDateInfo.monthStr]);

  // ── 📊 스토리지 월말 예측 (3가지 알고리즘) ──────────────────────────────
  const storageForecast = useMemo((): ForecastResult | null => {
    const { year, month, monthStr } = currentDateInfo;
    const D = getDaysInMonth(year, month);

    // 이번달 스토리지 날짜 오름차순 정렬
    const items = monthStorageData
      .filter(i => i.usage_date?.startsWith(monthStr))
      .sort((a, b) => (a.usage_date || '').localeCompare(b.usage_date || ''));

    if (items.length === 0) return null;

    const toTotal = (i: StorageUsage) =>
      (Number(i.storage_bytes) || 0) + (Number(i.stage_bytes) || 0) + (Number(i.failsafe_bytes) || 0);

    const totals = items.map(toTotal);
    const dayNums = items.map(i => parseInt(i.usage_date?.substring(8, 10) || '0', 10));
    const n = items.length;
    const latestDay = dayNums[n - 1];
    const currentStorage = totals[n - 1];
    const remaining = D - latestDay;

    // ① 전월비율기반: (현재 storage / 전월 같은 날 storage) × 전월 말 storage
    let ratio = currentStorage; // fallback = 현재값 유지
    const prevSorted = [...prevStorageData].sort((a, b) => (a.usage_date || '').localeCompare(b.usage_date || ''));
    if (prevSorted.length > 0) {
      const prevEnd = prevSorted[prevSorted.length - 1];
      const prevEndTotal = toTotal(prevEnd);
      const sameDayItem = prevSorted.find(i => parseInt(i.usage_date?.substring(8, 10) || '0', 10) === latestDay)
        ?? prevSorted[Math.min(latestDay - 1, prevSorted.length - 1)];
      const sameDayTotal = sameDayItem ? toTotal(sameDayItem) : 0;
      if (sameDayTotal > 0 && prevEndTotal > 0) {
        ratio = prevEndTotal * (currentStorage / sameDayTotal);
      } else if (n >= 2) {
        // fallback: 추세 연장
        const slope = (totals[n - 1] - totals[0]) / Math.max(1, dayNums[n - 1] - dayNums[0]);
        ratio = currentStorage + slope * remaining;
      }
    } else if (n >= 2) {
      const slope = (totals[n - 1] - totals[0]) / Math.max(1, dayNums[n - 1] - dayNums[0]);
      ratio = currentStorage + slope * remaining;
    }

    // ② 선형회귀: y = a*day + b 에서 day=D 예측
    const { a: la, b: lb } = linearReg(dayNums, totals);
    const linear = la * D + lb;

    // ③ 가중이동평균 일변화량: 최근 데이터 높은 가중치
    let wma = currentStorage;
    if (n >= 2) {
      const changes = totals.slice(1).map((v, i) => v - totals[i]);
      const ws = changes.map((_, i) => i + 1);
      const wsSum = ws.reduce((s, w) => s + w, 0);
      const weightedChange = changes.reduce((s, c, i) => s + c * ws[i], 0) / wsSum;
      wma = currentStorage + weightedChange * remaining;
    }

    return { ratio: Math.max(0, ratio), linear: Math.max(0, linear), wma: Math.max(0, wma), elapsed: n, total: D, remaining };
  }, [monthStorageData, prevStorageData, currentDateInfo]);

  // ── 📊 컴퓨트 월말 예측 (3가지 알고리즘) ────────────────────────────────
  const computeForecast = useMemo((): ForecastResult | null => {
    const { year, month, monthStr } = currentDateInfo;
    const D = getDaysInMonth(year, month);

    const items = monthComputeDaily
      .filter(i => i.usage_date?.startsWith(monthStr))
      .sort((a, b) => (a.usage_date || '').localeCompare(b.usage_date || ''));

    if (items.length === 0) return null;

    const dailyC = items.map(i => i.total_credits || 0);
    const n = dailyC.length;
    const currentTotal = dailyC.reduce((s, c) => s + c, 0);
    const remaining = D - n;

    // ① 전월비율기반: 전월 같은 기간 누적 대비 전월 전체 스케일링
    let ratio: number;
    const prevSorted = [...prevComputeDaily].sort((a, b) => (a.usage_date || '').localeCompare(b.usage_date || ''));
    if (prevSorted.length > 0) {
      const prevTotal = prevSorted.reduce((s, i) => s + (i.total_credits || 0), 0);
      const prevSamePeriod = prevSorted.slice(0, n).reduce((s, i) => s + (i.total_credits || 0), 0);
      ratio = prevSamePeriod > 0 ? prevTotal * (currentTotal / prevSamePeriod) : (currentTotal / n) * D;
    } else {
      ratio = n > 0 ? (currentTotal / n) * D : 0;
    }

    // ② 선형회귀: 일별 크레딧 추세를 반영한 잔여일 누적
    const xs = dailyC.map((_, i) => i + 1);
    const { a: la, b: lb } = linearReg(xs, dailyC);
    let linear = currentTotal;
    for (let x = n + 1; x <= D; x++) {
      linear += Math.max(0, la * x + lb);
    }

    // ③ 가중이동평균: 최근 일별 사용량에 높은 가중치 → 잔여일 추정
    const ws = dailyC.map((_, i) => i + 1);
    const wsSum = ws.reduce((s, w) => s + w, 0);
    const weightedAvg = dailyC.reduce((s, c, i) => s + c * ws[i], 0) / wsSum;
    const wma = currentTotal + weightedAvg * remaining;

    return { ratio: Math.max(0, ratio), linear: Math.max(0, linear), wma: Math.max(0, wma), elapsed: n, total: D, remaining };
  }, [monthComputeDaily, prevComputeDaily, currentDateInfo]);

  // ─── 렌더 ────────────────────────────────────────────────────────────────

  /** 3가지 예측값 표시 서브 컴포넌트 */
  const ForecastRows = ({
    forecast,
    formatter,
    unit,
  }: {
    forecast: ForecastResult | null;
    formatter: (v: number) => string;
    unit?: string;
  }) => {
    if (!forecast) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
          데이터 부족
        </span>
      );
    }
    const rows = [
      { label: '전월비율', value: forecast.ratio, color: 'text-indigo-700' },
      { label: '선형회귀', value: forecast.linear, color: 'text-emerald-700' },
      { label: '가중평균', value: forecast.wma, color: 'text-purple-700' },
    ];
    return (
      <div className="space-y-1.5">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-500 shrink-0 w-14">{label}</span>
            <span className={`text-[11px] font-bold font-mono ${color} text-right`}>
              {formatter(value)}{unit ? ` ${unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 0. 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900">통합 모니터링 대시보드</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Snowflake 스토리지 및 컴퓨트 사용량 요약과 시계열 트렌드 분석
          </p>
        </div>

        <div className="flex items-center gap-2">
          {storageData && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Server className="h-3.5 w-3.5" />
              <span>{storageData.db_host}:{storageData.db_name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-medium rounded-md hover:bg-zinc-50 shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-3 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="space-y-1">
            <p className="font-semibold">대시보드 데이터 조회 중 오류가 발생했습니다.</p>
            <p className="text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. 이번달 예상량 블록 */}
      {/* ===================================================================== */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-amber-50 text-amber-600 rounded-md border border-amber-200/60">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">이번달 예상량</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {currentDateInfo.formatted}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                월말 기준 현재까지의 누적 사용량 및 알고리즘 3종 월말 예측량
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />전월비율
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1" />선형회귀
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500 ml-1" />가중평균
            </div>
            <span className="text-xs font-mono text-zinc-400">기준월: {currentDateInfo.monthStr}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── 스토리지 카드 ── */}
          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-800">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800">스토리지 사용량 (Storage)</h3>
                  <span className="text-[11px] text-zinc-500">
                    최신 기준일: {monthlyStorageStats.latestDate || '-'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                월말 기준
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* 현재까지 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3">
                <span className="text-xs font-medium text-zinc-500 block mb-1">현재까지 사용량</span>
                <div className="text-xl font-extrabold text-zinc-900 font-mono tracking-tight">
                  {formatBytes(monthlyStorageStats.totalBytes)}
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="font-mono font-medium text-zinc-700">{formatBytes(monthlyStorageStats.storageBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stage:</span>
                    <span className="font-mono font-medium text-zinc-700">{formatBytes(monthlyStorageStats.stageBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failsafe:</span>
                    <span className="font-mono font-medium text-zinc-700">{formatBytes(monthlyStorageStats.failsafeBytes)}</span>
                  </div>
                </div>
              </div>

              {/* 월말 예측 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-500">월말 예측량</span>
                    {storageForecast && (
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {storageForecast.elapsed}/{storageForecast.total}일
                      </span>
                    )}
                  </div>
                  <ForecastRows forecast={storageForecast} formatter={(v) => formatBytes(v)} />
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
                  {storageForecast
                    ? `잔여 ${storageForecast.remaining}일 기준 3종 알고리즘 추정`
                    : '이번달 스토리지 데이터 필요'}
                </p>
              </div>
            </div>
          </div>

          {/* ── 컴퓨트 카드 ── */}
          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-800">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800">컴퓨트 사용량 (Compute)</h3>
                  <span className="text-[11px] text-zinc-500">
                    이번달 누적 일수: {monthlyComputeStats.recordCount}일
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                이번달 누적
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* 현재까지 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3">
                <span className="text-xs font-medium text-zinc-500 block mb-1">이번달 누적 사용량</span>
                <div className="text-xl font-extrabold text-zinc-900 font-mono tracking-tight">
                  {formatCredits(monthlyComputeStats.totalCredits, 2)}
                  <span className="text-xs font-normal text-zinc-500 ml-1">Credits</span>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>COM_SF:</span>
                    <span className="font-mono font-medium text-zinc-700">{formatCredits(monthlyComputeStats.comSfTotal, 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COM_AI:</span>
                    <span className="font-mono font-medium text-zinc-700">{formatCredits(monthlyComputeStats.comAiTotal, 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI_TOKEN:</span>
                    <span className="font-mono font-medium text-zinc-700">{formatCredits(monthlyComputeStats.aiTokenTotal, 1)}</span>
                  </div>
                </div>
              </div>

              {/* 월말 예측 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-500">월말 예측량</span>
                    {computeForecast && (
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {computeForecast.elapsed}/{computeForecast.total}일
                      </span>
                    )}
                  </div>
                  <ForecastRows
                    forecast={computeForecast}
                    formatter={(v) => formatCredits(v, 1)}
                    unit="Cr"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
                  {computeForecast
                    ? `잔여 ${computeForecast.remaining}일 기준 3종 알고리즘 추정`
                    : '이번달 컴퓨트 데이터 필요'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. 스토리지 요약 */}
      {/* ===================================================================== */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">스토리지 요약 (Storage Usage)</h2>
              <p className="text-[11px] text-zinc-400">
                최근 {CHART_DAYS}일 내 Failsafe, Stage, Storage Bytes 누적 추이
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
            최근 {CHART_DAYS}일 기준
          </span>
        </div>
        <StorageChart
          currentData={storageData?.currentData || []}
          selectedRange="days"
          days={CHART_DAYS}
          hideRangeControls={true}
          isLoading={loading}
        />
      </section>

      {/* ===================================================================== */}
      {/* 4. 컴퓨트 요약 */}
      {/* ===================================================================== */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">컴퓨트 요약 (Compute Usage)</h2>
              <p className="text-[11px] text-zinc-400">
                최근 {CHART_DAYS}일 내 서비스별(COM_SF, COM_AI, AI_TOKEN) 일일 크레딧 추이
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
            최근 {CHART_DAYS}일 기준
          </span>
        </div>
        <ComputeChart
          data={computeData?.dailyData || []}
          summary={computeData?.summary}
          selectedRange="days"
          days={CHART_DAYS}
          hideRangeControls={true}
          isLoading={loading}
        />
      </section>
    </div>
  );
}
