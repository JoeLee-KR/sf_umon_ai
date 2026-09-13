'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Database,
  BarChart3,
  Table as TableIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import DepartmentChart from '@/components/employees/DepartmentChart';
import EmployeeTable from '@/components/employees/EmployeeTable';
import { EmployeesResponse } from '@/types/employee';

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<EmployeesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/sfumonai';
      const res = await fetch(`${basePath}/api/employees`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json: EmployeesResponse = await res.json();
      setResponse(json);
    } catch (err) {
      console.error('Failed to fetch employee data:', err);
      setError((err as Error).message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. 상단 타이틀 및 상태 바 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              임직원 현황 및 부서별 급여 분석
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              MySQL `employees` 테이블 원천 데이터 및 부서별(Department) 임금 통계
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* DB 소스 뱃지 */}
          {response && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>MySQL 실시간 연동</span>
            </div>
          )}

          {/* 새로고침 버튼 */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md text-xs font-medium shadow-xs disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 에러 상태 안내 */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <div>
            <span className="font-semibold">오류 발생:</span> {error}
          </div>
        </div>
      )}

      {/* 2. 중단: 부서별 임금 및 인원 분석 그래프 */}
      <section className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">
              부서별(Department) 임금 통계 및 인원수 현황
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            최고 · 평균 · 최저 임금 및 인원수
          </span>
        </div>

        {loading && !response ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-xs">통계 차트 데이터 산출 중...</span>
          </div>
        ) : (
          <DepartmentChart stats={response?.stats || []} />
        )}
      </section>

      {/* 3. 하단: 원천 데이터 테이블 (Raw Data Grid) */}
      <section className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">
              원천 사원 데이터 (employees Raw Data)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <Database className="h-3.5 w-3.5 text-zinc-400" />
            <span>sf_umon_db.employees</span>
          </div>
        </div>

        {loading && !response ? (
          <div className="h-48 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-xs">로우 데이터 로딩 중...</span>
          </div>
        ) : (
          <EmployeeTable employees={response?.data || []} />
        )}
      </section>
    </div>
  );
}
