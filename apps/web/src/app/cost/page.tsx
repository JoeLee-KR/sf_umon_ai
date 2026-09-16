'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CircleDollarSign,
  RefreshCw,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import MonthlyCostCalculator from '@/components/cost/MonthlyCostCalculator';
import MonthlyCostHistoryChart from '@/components/cost/MonthlyCostHistoryChart';
import MonthlyCostHistoryTable from '@/components/cost/MonthlyCostHistoryTable';
import { MonthlyBillingRecord, MonthlyCostHistoryResponse } from '@/types/cost';

export default function MonthlyCostPage() {
  const [historyData, setHistoryData] = useState<MonthlyBillingRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [monthsLimit, setMonthsLimit] = useState<number>(12); // Default: 12 months

  const fetchHistory = useCallback(async (limit: number) => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const url = limit > 0
        ? `${basePath}/api/cost/history?months=${limit}`
        : `${basePath}/api/cost/history`;

      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '확정 요금 히스토리를 불러오지 못했습니다.');
      }

      const json: MonthlyCostHistoryResponse = await res.json();
      setHistoryData(json.data || []);
    } catch (err) {
      setHistoryError((err as Error).message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(monthsLimit);
  }, [monthsLimit, fetchHistory]);

  const handleConfirmSuccess = (newRecord: MonthlyBillingRecord) => {
    // Refresh history immediately
    fetchHistory(monthsLimit);
  };

  const handleRefreshAll = () => {
    fetchHistory(monthsLimit);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                월 비용 확인
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                월별 스토리지 및 컴퓨트 사용량 정산, 단가 조절 및 요금 확정(Confirm)과 히스토리를 관리합니다.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={loadingHistory}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin text-indigo-600' : ''}`} />
          <span>새로고침</span>
        </button>
      </div>

      {/* Block 1: Monthly Cost Calculation & Confirmation */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            Block 1
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            전달 및 지정월 기준 요금 산정 / 확정
          </span>
        </div>

        <MonthlyCostCalculator onConfirmSuccess={handleConfirmSuccess} />
      </section>

      {/* Block 2: Confirmed Cost History (Chart & List) */}
      <section className="space-y-6 pt-4 border-t border-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 text-white text-xs font-bold">
                2
              </span>
              <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                확정 요금 히스토리 (그래프 & 리스트)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1 pl-9">
              현재까지 확정(Active)된 월단위 요금의 통계 그래프 및 상세 내역입니다. (기본 12개월 조회)
            </p>
          </div>
        </div>

        {historyError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            히스토리 로드 오류: {historyError}
          </div>
        )}

        {/* Chart Component */}
        <MonthlyCostHistoryChart
          data={historyData}
          monthsLimit={monthsLimit}
          onMonthsLimitChange={setMonthsLimit}
          isLoading={loadingHistory}
        />

        {/* Table List Component */}
        <MonthlyCostHistoryTable
          data={historyData}
          isLoading={loadingHistory}
        />
      </section>
    </div>
  );
}
