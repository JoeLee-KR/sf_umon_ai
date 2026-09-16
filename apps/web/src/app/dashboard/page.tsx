'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  HardDrive,
  Cpu,
  RefreshCw,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Sparkles,
  Server,
  Layers,
  Shield,
  Zap,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import StorageChart from '@/components/storage/StorageChart';
import ComputeChart from '@/components/compute/ComputeChart';
import { StorageUsageResponse, StorageUsage } from '@/types/storage';
import { ComputeUsageResponse, ComputeDailyUsage } from '@/types/compute';
import { formatBytes, formatCredits } from '@/lib/formatters';

type DateRangeOption = 7 | 30;

export default function DashboardPage() {
  // 조회 기간 상태: 7일(기본), 30일
  const [rangeDays, setRangeDays] = useState<DateRangeOption>(7);

  // 데이터 로딩 및 에러 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 선택 기간 데이터
  const [storageData, setStorageData] = useState<StorageUsageResponse | null>(null);
  const [computeData, setComputeData] = useState<ComputeUsageResponse | null>(null);

  // 이번 달 누적/예상량 계산용 데이터
  const [monthStorageData, setMonthStorageData] = useState<StorageUsage[]>([]);
  const [monthComputeDaily, setMonthComputeDaily] = useState<ComputeDailyUsage[]>([]);

  // 현재 기준 년/월 정보
  const currentDateInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const formatted = `${year}년 ${month}월`;
    return { year, month, monthStr, formatted };
  }, []);

  // 데이터 조회 함수
  const fetchDashboardData = useCallback(async (selectedDays: DateRangeOption) => {
    setLoading(true);
    setError(null);

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    try {
      // 1. 선택된 기간(7일 or 30일)의 스토리지 & 컴퓨트 데이터 조회
      const [storageRes, computeRes, monthStorageRes, monthComputeRes] = await Promise.all([
        fetch(`${basePath}/api/storage?days=${selectedDays}`),
        fetch(`${basePath}/api/compute?days=${selectedDays}`),
        fetch(`${basePath}/api/storage?days=31`), // 이번달 데이터 커버용
        fetch(`${basePath}/api/compute?days=31`), // 이번달 데이터 커버용
      ]);

      if (!storageRes.ok || !computeRes.ok) {
        throw new Error('대시보드 데이터를 가져오는데 실패했습니다.');
      }

      const storageJson: StorageUsageResponse = await storageRes.json();
      const computeJson: ComputeUsageResponse = await computeRes.json();
      setStorageData(storageJson);
      setComputeData(computeJson);

      // 이번달 데이터 가공
      if (monthStorageRes.ok) {
        const mStorageJson: StorageUsageResponse = await monthStorageRes.json();
        setMonthStorageData(mStorageJson.currentData || []);
      }
      if (monthComputeRes.ok) {
        const mComputeJson: ComputeUsageResponse = await monthComputeRes.json();
        setMonthComputeDaily(mComputeJson.dailyData || []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(rangeDays);
  }, [rangeDays, fetchDashboardData]);

  // 이번달 스토리지 사용량 통계 계산
  const monthlyStorageStats = useMemo(() => {
    const prefix = currentDateInfo.monthStr;
    // 이번달 데이터 우선 필터링, 없으면 전체 최신 데이터 사용
    const currentMonthItems = monthStorageData.filter((item) =>
      item.usage_date?.startsWith(prefix)
    );
    const sourceData = currentMonthItems.length > 0 ? currentMonthItems : monthStorageData;

    if (sourceData.length === 0) {
      return {
        latestDate: '',
        storageBytes: 0,
        stageBytes: 0,
        failsafeBytes: 0,
        totalBytes: 0,
      };
    }

    // 최신 항목
    const latest = sourceData[0]; // DESC 정렬이 기본
    const s = Number(latest.storage_bytes) || 0;
    const st = Number(latest.stage_bytes) || 0;
    const f = Number(latest.failsafe_bytes) || 0;
    return {
      latestDate: latest.usage_date || '',
      storageBytes: s,
      stageBytes: st,
      failsafeBytes: f,
      totalBytes: s + st + f,
    };
  }, [monthStorageData, currentDateInfo.monthStr]);

  // 이번달 컴퓨트 누적 사용량 계산
  const monthlyComputeStats = useMemo(() => {
    const prefix = currentDateInfo.monthStr;
    const currentMonthItems = monthComputeDaily.filter((item) =>
      item.usage_date?.startsWith(prefix)
    );
    const sourceData = currentMonthItems.length > 0 ? currentMonthItems : monthComputeDaily;

    let totalCredits = 0;
    let comSfTotal = 0;
    let comAiTotal = 0;
    let aiTokenTotal = 0;
    let latestDate = '';

    for (const item of sourceData) {
      totalCredits += item.total_credits || 0;
      comSfTotal += item.com_sf || 0;
      comAiTotal += item.com_ai || 0;
      aiTokenTotal += item.ai_token || 0;
      if (!latestDate || item.usage_date > latestDate) {
        latestDate = item.usage_date;
      }
    }

    return {
      recordCount: sourceData.length,
      latestDate,
      totalCredits: Number(totalCredits.toFixed(4)),
      comSfTotal: Number(comSfTotal.toFixed(4)),
      comAiTotal: Number(comAiTotal.toFixed(4)),
      aiTokenTotal: Number(aiTokenTotal.toFixed(4)),
    };
  }, [monthComputeDaily, currentDateInfo.monthStr]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 0. 대시보드 타이틀 & 새로고침 버튼 */}
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
              <span>
                {storageData.db_host}:{storageData.db_name}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchDashboardData(rangeDays)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-medium rounded-md hover:bg-zinc-50 shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 에러 알림 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-3 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="space-y-1">
            <p className="font-semibold">대시보드 데이터 조회 중 오류가 발생했습니다.</p>
            <p className="text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. 첫 번째 블럭: 이번달 예상량 (년도와 월 표시, 월말 기준 스토리지/컴퓨트 사용량 및 예측량) */}
      {/* ========================================================================= */}
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
                월말 기준 현재까지의 누적 사용량 및 월말 예측량
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            기준월: {currentDateInfo.monthStr}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1-1. 스토리지 사용량 및 예측량 카드 */}
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
              {/* 현재까지 스토리지 사용량 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3">
                <span className="text-xs font-medium text-zinc-500 block mb-1">
                  현재까지 사용량
                </span>
                <div className="text-xl font-extrabold text-zinc-900 font-mono tracking-tight">
                  {formatBytes(monthlyStorageStats.totalBytes)}
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="font-mono font-medium text-zinc-700">
                      {formatBytes(monthlyStorageStats.storageBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stage:</span>
                    <span className="font-mono font-medium text-zinc-700">
                      {formatBytes(monthlyStorageStats.stageBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failsafe:</span>
                    <span className="font-mono font-medium text-zinc-700">
                      {formatBytes(monthlyStorageStats.failsafeBytes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 월말 스토리지 예측량 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-500 block mb-1">
                    월말 예측량
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                      NotYet
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
                  예측 알고리즘 산정 후 추가 예정
                </p>
              </div>
            </div>
          </div>

          {/* 1-2. Compute 사용량 및 예측량 카드 */}
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
              {/* 이번달 누적 Compute 사용량 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3">
                <span className="text-xs font-medium text-zinc-500 block mb-1">
                  이번달 누적 사용량
                </span>
                <div className="text-xl font-extrabold text-zinc-900 font-mono tracking-tight">
                  {formatCredits(monthlyComputeStats.totalCredits, 2)}
                  <span className="text-xs font-normal text-zinc-500 ml-1">Credits</span>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>COM_SF:</span>
                    <span className="font-mono font-medium text-zinc-700">
                      {formatCredits(monthlyComputeStats.comSfTotal, 1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>COM_AI:</span>
                    <span className="font-mono font-medium text-zinc-700">
                      {formatCredits(monthlyComputeStats.comAiTotal, 1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI_TOKEN:</span>
                    <span className="font-mono font-medium text-zinc-700">
                      {formatCredits(monthlyComputeStats.aiTokenTotal, 1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 월말 Compute 예측량 */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-500 block mb-1">
                    월말 예측량
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                      NotYet
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
                  예측 알고리즘 산정 후 추가 예정
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 두 번째 블럭: 조회 기간 선택 (7일 기본, 30일 2가지 옵션) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-zinc-700">
          <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="text-sm font-bold tracking-tight">조회 기간 선택</span>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            (하단 스토리지 및 컴퓨트 요약 차트에 적용됩니다)
          </span>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setRangeDays(7)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              rangeDays === 7
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-bold text-indigo-700'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            7일 (기본)
          </button>
          <button
            type="button"
            onClick={() => setRangeDays(30)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              rangeDays === 30
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-bold text-indigo-700'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            30일
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 세 번째 블럭: 스토리지 요약 (최근 스토리지 사용량 + 그래프) */}
      {/* ========================================================================= */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">스토리지 요약 (Storage Usage)</h2>
              <p className="text-[11px] text-zinc-400">
                선택 기간({rangeDays}일) 내 Failsafe, Stage, Storage Bytes 누적 추이
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
            최근 {rangeDays}일 기준
          </span>
        </div>

        <StorageChart
          currentData={storageData?.currentData || []}
          selectedRange="days"
          days={rangeDays}
          hideRangeControls={true}
          isLoading={loading}
        />
      </section>

      {/* ========================================================================= */}
      {/* 4. 네 번째 블럭: 컴퓨트 요약 (COM_SF, COM_AI, AI_TOKEN, 총합 + 그래프) */}
      {/* ========================================================================= */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">컴퓨트 요약 (Compute Usage)</h2>
              <p className="text-[11px] text-zinc-400">
                선택 기간({rangeDays}일) 내 서비스별(COM_SF, COM_AI, AI_TOKEN) 일일 크레딧 추이
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
            최근 {rangeDays}일 기준
          </span>
        </div>

        <ComputeChart
          data={computeData?.dailyData || []}
          summary={computeData?.summary}
          selectedRange="days"
          days={rangeDays}
          hideRangeControls={true}
          isLoading={loading}
        />
      </section>
    </div>
  );
}
