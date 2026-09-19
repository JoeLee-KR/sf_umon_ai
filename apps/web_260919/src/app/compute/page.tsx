'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Cpu,
  RefreshCw,
  Server,
  AlertCircle,
  Database,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react';
import ComputeChart, { RangeOption } from '@/components/compute/ComputeChart';
import ComputeTable from '@/components/compute/ComputeTable';
import { ComputeUsageResponse } from '@/types/compute';

export default function ComputePage() {
  const [response, setResponse] = useState<ComputeUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Range options: 'days' | 'custom'
  const [selectedRange, setSelectedRange] = useState<RangeOption>('days');
  const [days, setDays] = useState<number>(30);

  // Custom date range state (default to last 30 days)
  const [startDate, setStartDate] = useState(() => {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });

  const fetchData = useCallback(
    async (range: RangeOption, currentDays?: number, customStart?: string, customEnd?: string) => {
      setLoading(true);
      setError(null);

      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        let url = `${basePath}/api/compute`;

        if (range === 'days') {
          url += `?days=${currentDays !== undefined ? currentDays : days}`;
        } else if (range === 'custom') {
          const s = customStart || startDate;
          const e = customEnd || endDate;
          if (s && e) {
            url += `?startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
          }
        }

        const res = await fetch(url);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          let errorMsg = errJson.message || '컴퓨트 사용량 데이터를 불러올 수 없습니다.';
          if (errJson.db_host || errJson.db_name || errJson.db_user) {
            errorMsg = `MySQL 연결 실패 (${errJson.db_host || ''}, ${errJson.db_name || ''}, ${errJson.db_user || ''}): ${errorMsg}`;
          }
          throw new Error(errorMsg);
        }

        const json: ComputeUsageResponse = await res.json();
        setResponse(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [days, startDate, endDate]
  );

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        let url = `${basePath}/api/compute`;

        if (selectedRange === 'days') {
          url += `?days=${days}`;
        } else if (selectedRange === 'custom') {
          if (startDate && endDate) {
            url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
          }
        }

        const res = await fetch(url);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          let errorMsg = errJson.message || '컴퓨트 사용량 데이터를 불러올 수 없습니다.';
          if (errJson.db_host || errJson.db_name || errJson.db_user) {
            errorMsg = `MySQL 연결 실패 (${errJson.db_host || ''}, ${errJson.db_name || ''}, ${errJson.db_user || ''}): ${errorMsg}`;
          }
          throw new Error(errorMsg);
        }

        const json: ComputeUsageResponse = await res.json();
        if (!ignore) {
          setResponse(json);
        }
      } catch (err) {
        if (!ignore) {
          setError((err as Error).message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [selectedRange, days, startDate, endDate]);

  const handleRangeChange = (range: RangeOption) => {
    setSelectedRange(range);
    if (range === 'days') {
      fetchData('days', days);
    }
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    if (selectedRange === 'days') {
      fetchData('days', newDays);
    }
  };

  const handleFetchCustomRange = () => {
    if (startDate && endDate) {
      fetchData('custom', undefined, startDate, endDate);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 상단 타이틀 및 정보 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              <Cpu className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900">컴퓨트 사용량 조회</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Snowflake 컴퓨트 사용량 기록(sf_metering_daily_history) 시계열 트렌드 및 원천 데이터 조회
          </p>
        </div>

        <div className="flex items-center gap-2">
          {response && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Server className="h-3.5 w-3.5" />
              <span>
                {response.db_host}:{response.db_name}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchData(selectedRange)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-medium rounded-md hover:bg-zinc-50 shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 에러 메시지 알림 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-3 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="space-y-1">
            <p className="font-semibold">데이터 조회 중 오류가 발생했습니다.</p>
            <p className="text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* 2. 위쪽 박스: 그래프 박스 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-zinc-800">
              컴퓨트 사용량 추이 (Compute Usage Trend, 단위: Credit)
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            {selectedRange === 'days' && `최근 ${days}일`}
            {selectedRange === 'custom' && `${startDate} ~ ${endDate}`}
          </span>
        </div>

        <ComputeChart
          data={response?.dailyData || []}
          summary={response?.summary}
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
          days={days}
          onDaysChange={handleDaysChange}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onFetchCustomRange={handleFetchCustomRange}
          isLoading={loading}
        />
      </div>

      {/* 3. 아래쪽 박스: Raw 데이터 조회 (Grid) */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-zinc-700" />
            <h2 className="text-sm font-bold text-zinc-800">
              컴퓨트 데이터 조회 (sf_metering_daily_history)
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Database className="h-3.5 w-3.5 text-zinc-400" />
            <span>sf_metering_daily_history</span>
          </div>
        </div>

        <ComputeTable
          rawData={response?.currentData || []}
          dailyData={response?.dailyData || []}
        />
      </div>
    </div>
  );
}
