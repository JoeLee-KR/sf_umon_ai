'use client';

import React, { useState } from 'react';
import { DepartmentStat } from '@/types/employee';
import { BarChart3, Users, DollarSign, TrendingUp, Info } from 'lucide-react';

interface DepartmentChartProps {
  stats: DepartmentStat[];
}

export default function DepartmentChart({ stats }: DepartmentChartProps) {
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState({
    max: true,
    avg: true,
    min: true,
  });

  if (!stats || stats.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
        표시할 부서별 통계 데이터가 없습니다.
      </div>
    );
  }

  // Find max salary for scale
  const maxOverallSalary = Math.max(...stats.map((s) => s.maxSalary), 100000000);
  const maxHeadcount = Math.max(...stats.map((s) => s.count), 1);
  const totalEmployees = stats.reduce((acc, s) => acc + s.count, 0);
  const overallAvgSalary = Math.round(
    stats.reduce((acc, s) => acc + s.totalSalary, 0) / (totalEmployees || 1)
  );

  const formatCurrency = (amount: number) => {
    return `${(amount / 10000).toLocaleString('ko-KR')}만원`;
  };

  const formatCurrencyFull = (amount: number) => {
    return `${amount.toLocaleString('ko-KR')}원`;
  };

  const toggleMetric = (key: 'max' | 'avg' | 'min') => {
    setVisibleMetrics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedStat = stats.find((s) => s.department === activeDept) || null;

  return (
    <div className="space-y-4">
      {/* 1. 상단 KPI 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>총 인원</span>
            <Users className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <p className="text-lg font-bold text-zinc-900 mt-1">{totalEmployees}명</p>
          <span className="text-[11px] text-zinc-400">{stats.length}개 부서 집계</span>
        </div>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>전체 평균 임금</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-zinc-900 mt-1">{formatCurrency(overallAvgSalary)}</p>
          <span className="text-[11px] text-zinc-400">{formatCurrencyFull(overallAvgSalary)}</span>
        </div>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>최고 임금 부서</span>
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          {(() => {
            const topDept = [...stats].sort((a, b) => b.maxSalary - a.maxSalary)[0];
            return (
              <>
                <p className="text-lg font-bold text-indigo-600 mt-1">{topDept?.department || '-'}</p>
                <span className="text-[11px] text-zinc-400">최고: {formatCurrency(topDept?.maxSalary || 0)}</span>
              </>
            );
          })()}
        </div>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>최대 규모 부서</span>
            <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
          </div>
          {(() => {
            const largestDept = [...stats].sort((a, b) => b.count - a.count)[0];
            return (
              <>
                <p className="text-lg font-bold text-purple-600 mt-1">{largestDept?.department || '-'}</p>
                <span className="text-[11px] text-zinc-400">인원: {largestDept?.count || 0}명</span>
              </>
            );
          })()}
        </div>
      </div>

      {/* 2. 차트 컨트롤 및 범례 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">지표 토글:</span>
          <button
            type="button"
            onClick={() => toggleMetric('max')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
              visibleMetrics.max
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600"></span>
            최고 임금 (Max)
          </button>
          <button
            type="button"
            onClick={() => toggleMetric('avg')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
              visibleMetrics.avg
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            평균 임금 (Avg)
          </button>
          <button
            type="button"
            onClick={() => toggleMetric('min')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
              visibleMetrics.min
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            최저 임금 (Min)
          </button>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="font-semibold text-purple-700">● 뱃지:</span> 부서 인원수
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-400 text-[11px] flex items-center gap-1">
            <Info className="h-3 w-3" /> 막대에 마우스를 올리면 상세 정보를 볼 수 있습니다.
          </span>
        </div>
      </div>

      {/* 3. 복합 차트 렌더링 영역 (부서별 막대 + 인원수 인디케이터) */}
      <div className="border border-zinc-200 rounded-lg p-5 bg-gradient-to-b from-zinc-50/50 to-white relative">
        {/* Y축 기준선 가이드 */}
        <div className="relative h-64 w-full flex flex-col justify-between">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
              const val = Math.round(maxOverallSalary * ratio);
              return (
                <div key={ratio} className="w-full border-b border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 pl-1">
                    {formatCurrency(val)}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 pr-1">
                    {Math.round(maxHeadcount * ratio)}명
                  </span>
                </div>
              );
            })}
          </div>

          {/* X축 부서별 차트 컬럼 */}
          <div className="h-full pt-4 pb-2 z-10 flex items-end justify-around gap-2 px-6">
            {stats.map((stat) => {
              const isHovered = activeDept === stat.department;
              const maxRatio = (stat.maxSalary / maxOverallSalary) * 100;
              const avgRatio = (stat.avgSalary / maxOverallSalary) * 100;
              const minRatio = (stat.minSalary / maxOverallSalary) * 100;

              return (
                <div
                  key={stat.department}
                  className="flex-1 max-w-[130px] flex flex-col items-center h-full justify-end cursor-pointer group"
                  onMouseEnter={() => setActiveDept(stat.department)}
                  onMouseLeave={() => setActiveDept(null)}
                >
                  {/* 부서 인원수 뱃지 */}
                  <div
                    className={`mb-2 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all shadow-xs ${
                      isHovered
                        ? 'bg-purple-600 text-white scale-110'
                        : 'bg-purple-100 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {stat.count}명
                  </div>

                  {/* 3단 임금 막대 그룹 */}
                  <div className="w-full flex items-end justify-center gap-1.5 h-44 px-1">
                    {/* 1. 최고 임금 */}
                    {visibleMetrics.max && (
                      <div
                        className="w-1/3 max-w-[18px] bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all duration-300 relative group/bar shadow-xs"
                        style={{ height: `${Math.max(maxRatio, 4)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition text-[9px] bg-zinc-900 text-white px-1 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                          {formatCurrency(stat.maxSalary)}
                        </div>
                      </div>
                    )}

                    {/* 2. 평균 임금 */}
                    {visibleMetrics.avg && (
                      <div
                        className="w-1/3 max-w-[18px] bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all duration-300 relative group/bar shadow-xs"
                        style={{ height: `${Math.max(avgRatio, 4)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition text-[9px] bg-zinc-900 text-white px-1 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                          {formatCurrency(stat.avgSalary)}
                        </div>
                      </div>
                    )}

                    {/* 3. 최저 임금 */}
                    {visibleMetrics.min && (
                      <div
                        className="w-1/3 max-w-[18px] bg-amber-500 hover:bg-amber-600 rounded-t-sm transition-all duration-300 relative group/bar shadow-xs"
                        style={{ height: `${Math.max(minRatio, 4)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition text-[9px] bg-zinc-900 text-white px-1 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                          {formatCurrency(stat.minSalary)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 부서 레이블 */}
                  <div
                    className={`mt-2.5 text-xs font-semibold px-2 py-0.5 rounded transition ${
                      isHovered
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 bg-zinc-100 border border-zinc-200'
                    }`}
                  >
                    {stat.department}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. 활성 부서 호버 상세 패널 */}
        {selectedStat && (
          <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-900 text-sm">{selectedStat.department} 부서</span>
              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[11px] font-medium">
                인원 {selectedStat.count}명
              </span>
            </div>
            <div className="flex items-center gap-4 text-zinc-700 font-mono">
              <div>
                <span className="text-zinc-500 text-[11px] block">최고 임금</span>
                <span className="font-bold text-indigo-700">{formatCurrencyFull(selectedStat.maxSalary)}</span>
              </div>
              <div className="border-l border-indigo-200 pl-4">
                <span className="text-zinc-500 text-[11px] block">평균 임금</span>
                <span className="font-bold text-emerald-700">{formatCurrencyFull(selectedStat.avgSalary)}</span>
              </div>
              <div className="border-l border-indigo-200 pl-4">
                <span className="text-zinc-500 text-[11px] block">최저 임금</span>
                <span className="font-bold text-amber-700">{formatCurrencyFull(selectedStat.minSalary)}</span>
              </div>
              <div className="border-l border-indigo-200 pl-4">
                <span className="text-zinc-500 text-[11px] block">격차 (Max - Min)</span>
                <span className="font-bold text-zinc-800">
                  {formatCurrencyFull(selectedStat.maxSalary - selectedStat.minSalary)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
