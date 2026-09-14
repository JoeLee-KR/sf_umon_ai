import React, { Suspense } from 'react';
import FilterBar, { DateRangeKey } from '@/components/dashboard/FilterBar';
import { BarChart3, Table as TableIcon } from 'lucide-react';

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Next.js 15: searchParams는 비동기 Promise 객체이므로 명시적으로 await 처리
  const resolvedParams = await searchParams;
  const rawRange = resolvedParams.range;

  // URL 파라미터 유효성 검증 (허용되지 않은 파라미터 인입 시 기본값 7d로 폴백)
  const currentRange: DateRangeKey =
    rawRange === '1d' || rawRange === '7d' || rawRange === '30d'
      ? rawRange
      : '7d';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. 상단: 기간/필터 컨트롤바 (useSearchParams 사용 클라이언트 컴포넌트는 Suspense 필수) */}
      <Suspense fallback={<div className="h-14 bg-white border border-zinc-200 rounded-lg animate-pulse" />}>
        <FilterBar />
      </Suspense>

      {/* 2. 중단: 시계열 차트 슬롯 (향후 Recharts 연동 영역) */}
      <section className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">지표 추세 시각화</h2>
          </div>
          <span className="text-xs font-mono text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
            Window: {currentRange}
          </span>
        </div>
        <div className="h-56 border border-dashed border-zinc-200 rounded-md bg-zinc-50/50 flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-zinc-600">
            Recharts Area Chart가 안착될 컨테이너입니다.
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono">
            Active Filter: [{currentRange}]
          </p>
        </div>
      </section>

      {/* 3. 하단: 원천 데이터 그리드 슬롯 (향후 TanStack Table 연동 영역) */}
      <section className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">원천 지표 로우 데이터</h2>
          </div>
          <span className="text-xs text-zinc-400">Phase 1 MySQL Data Grid</span>
        </div>
        <div className="h-64 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50 flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-zinc-600">
            TanStack Table 기반 데이터 그리드가 안착될 컨테이너입니다.
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            페이징 및 컬럼 정렬 인터페이스 지원 예정
          </p>
        </div>
      </section>
    </div>
  );
}