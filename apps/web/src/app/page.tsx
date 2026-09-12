'use client';

import React, { useState } from 'react';
import { Calendar, BarChart3, Table as TableIcon } from 'lucide-react';

type DateRangeKey = '1d' | '7d' | '30d';

const RANGE_OPTIONS: { label: string; value: DateRangeKey }[] = [
  { label: '오늘', value: '1d' },
  { label: '최근 7일', value: '7d' },
  { label: '최근 30일', value: '30d' },
];

export default function DashboardPage() {
  const [range, setRange] = useState<DateRangeKey>('7d');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. 상단: 기간 선택 필터바 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 text-zinc-700">
          <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="text-sm font-semibold tracking-tight">조회 기간</span>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          {RANGE_OPTIONS.map((item) => {
            const isSelected = range === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  isSelected
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold border border-zinc-200/50'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 중단: 차트 시각화 영역 (Recharts 배치 예정) */}
      <section className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">지표 추세 시각화</h2>
          </div>
          <span className="text-xs font-mono text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
            Window: {range}
          </span>
        </div>
        <div className="h-56 border border-dashed border-zinc-200 rounded-md bg-zinc-50/50 flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-zinc-600">Recharts Area Chart 컨테이너</p>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono">선택된 기간: [{range}]</p>
        </div>
      </section>

      {/* 3. 하단: 원천 데이터 그리드 영역 (TanStack Table 배치 예정) */}
      <section className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">원천 지표 로우 데이터</h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Phase 1 Data Grid</span>
        </div>
        <div className="h-64 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50 flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-zinc-600">TanStack Table 컨테이너</p>
          <p className="text-[11px] text-zinc-400 mt-1">MySQL 페이징 연동 예정</p>
        </div>
      </section>
    </div>
  );
}