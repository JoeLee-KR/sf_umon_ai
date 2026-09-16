'use client';

import React, { useMemo, useState } from 'react';
import {
  ComputeRawUsage,
  ComputeDailyUsage,
  ComputeServiceGroup,
  COM_SF_SERVICES,
  COM_AI_SERVICES,
  AI_TOKEN_SERVICES,
} from '@/types/compute';
import { formatCredits } from '@/lib/formatters';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  ListFilter,
} from 'lucide-react';

export type TableViewMode = 'grouped' | 'individual';

interface ComputeTableProps {
  rawData: ComputeRawUsage[];
  dailyData: ComputeDailyUsage[];
}

type GroupedSortField = 'usage_date' | 'total_credits' | 'com_sf' | 'com_ai' | 'ai_token';

interface PivotRow {
  usage_date: string;
  total_compute: number;
  values: Record<string, number>;
}

const CANONICAL_SERVICES = [...COM_SF_SERVICES, ...COM_AI_SERVICES, ...AI_TOKEN_SERVICES];

const getServiceGroup = (st: string): ComputeServiceGroup => {
  if ((COM_SF_SERVICES as readonly string[]).includes(st)) return 'COM_SF';
  if ((COM_AI_SERVICES as readonly string[]).includes(st)) return 'COM_AI';
  if ((AI_TOKEN_SERVICES as readonly string[]).includes(st)) return 'AI_TOKEN';
  return 'OTHER';
};

export default function ComputeTable({ rawData, dailyData }: ComputeTableProps) {
  const [viewMode, setViewMode] = useState<TableViewMode>('grouped');

  // Grouped mode state
  const [groupedSortField, setGroupedSortField] = useState<GroupedSortField>('usage_date');
  const [groupedSortOrder, setGroupedSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupedPage, setGroupedPage] = useState(1);
  const [groupedPageSize, setGroupedPageSize] = useState(25);

  // Individual mode state (Pivot by Date & Service Types)
  const [indivSortField, setIndivSortField] = useState<string>('usage_date');
  const [indivSortOrder, setIndivSortOrder] = useState<'asc' | 'desc'>('desc');
  const [indivPage, setIndivPage] = useState(1);
  const [indivPageSize, setIndivPageSize] = useState(25);

  // Available service types present in rawData (ordered canonically)
  const availableServiceTypes = useMemo(() => {
    const set = new Set<string>();
    rawData.forEach((item) => {
      if (item.service_type) set.add(item.service_type);
    });

    if (set.size === 0) {
      return [...CANONICAL_SERVICES];
    }

    const list: string[] = [];
    CANONICAL_SERVICES.forEach((st) => {
      if (set.has(st)) {
        list.push(st);
        set.delete(st);
      }
    });

    // Any remaining custom service types
    Array.from(set)
      .sort()
      .forEach((st) => list.push(st));

    return list;
  }, [rawData]);

  // Pivot data for Individual View: 1 row per date, columns for service_types' USED_COMPUTE
  const indivPivotData = useMemo(() => {
    const dateMap = new Map<string, { total_compute: number; values: Record<string, number> }>();

    rawData.forEach((item) => {
      const d = item.usage_date;
      if (!d) return;
      if (!dateMap.has(d)) {
        dateMap.set(d, { total_compute: 0, values: {} });
      }
      const entry = dateMap.get(d)!;
      const compVal = Number(item.credits_used_compute) || 0;
      entry.values[item.service_type] = (entry.values[item.service_type] || 0) + compVal;
      entry.total_compute += compVal;
    });

    const list: PivotRow[] = [];
    dateMap.forEach((val, date) => {
      list.push({
        usage_date: date,
        total_compute: val.total_compute,
        values: val.values,
      });
    });

    return list;
  }, [rawData]);

  // Handle Sort for Grouped mode
  const handleGroupedSort = (field: GroupedSortField) => {
    if (groupedSortField === field) {
      setGroupedSortOrder(groupedSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setGroupedSortField(field);
      setGroupedSortOrder(field === 'usage_date' ? 'desc' : 'desc');
    }
  };

  // Handle Sort for Individual mode
  const handleIndivSort = (field: string) => {
    if (indivSortField === field) {
      setIndivSortOrder(indivSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setIndivSortField(field);
      setIndivSortOrder(field === 'usage_date' ? 'desc' : 'desc');
    }
  };

  // Sorted Grouped Data (1 row per USAGE_DATE, default desc)
  const sortedGroupedData = useMemo(() => {
    const list = [...dailyData];
    list.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (groupedSortField === 'usage_date') {
        aVal = a.usage_date;
        bVal = b.usage_date;
      } else if (groupedSortField === 'total_credits') {
        aVal = Number(a.total_credits) || 0;
        bVal = Number(b.total_credits) || 0;
      } else if (groupedSortField === 'com_sf') {
        aVal = Number(a.com_sf) || 0;
        bVal = Number(b.com_sf) || 0;
      } else if (groupedSortField === 'com_ai') {
        aVal = Number(a.com_ai) || 0;
        bVal = Number(b.com_ai) || 0;
      } else if (groupedSortField === 'ai_token') {
        aVal = Number(a.ai_token) || 0;
        bVal = Number(b.ai_token) || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return groupedSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return groupedSortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [dailyData, groupedSortField, groupedSortOrder]);

  // Sorted Individual Pivot Data (1 row per date, default desc)
  const sortedIndivData = useMemo(() => {
    const list = [...indivPivotData];
    list.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (indivSortField === 'usage_date') {
        aVal = a.usage_date;
        bVal = b.usage_date;
      } else if (indivSortField === 'total_compute') {
        aVal = a.total_compute;
        bVal = b.total_compute;
      } else {
        aVal = a.values[indivSortField] || 0;
        bVal = b.values[indivSortField] || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return indivSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return indivSortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [indivPivotData, indivSortField, indivSortOrder]);

  // Pagination for Grouped
  const totalGroupedPages = Math.max(1, Math.ceil(sortedGroupedData.length / groupedPageSize));
  const paginatedGroupedData = useMemo(() => {
    const start = (groupedPage - 1) * groupedPageSize;
    return sortedGroupedData.slice(start, start + groupedPageSize);
  }, [sortedGroupedData, groupedPage, groupedPageSize]);

  // Pagination for Individual
  const totalIndivPages = Math.max(1, Math.ceil(sortedIndivData.length / indivPageSize));
  const paginatedIndivData = useMemo(() => {
    const start = (indivPage - 1) * indivPageSize;
    return sortedIndivData.slice(start, start + indivPageSize);
  }, [sortedIndivData, indivPage, indivPageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (viewMode === 'grouped') {
      if (sortedGroupedData.length === 0) return;
      const headers = ['USAGE_DATE', 'TOTAL_CREDITS', 'COMP_SF', 'COMP_AI', 'AI_TOKEN'];
      const rows = sortedGroupedData.map((d) => [
        d.usage_date,
        d.total_credits,
        d.com_sf,
        d.com_ai,
        d.ai_token,
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `compute_daily_grouped_${new Date().toISOString().substring(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (sortedIndivData.length === 0) return;
      const headers = ['USAGE_DATE', 'TOTAL_COMPUTE', ...availableServiceTypes];
      const rows = sortedIndivData.map((d) => [
        d.usage_date,
        d.total_compute,
        ...availableServiceTypes.map((st) => d.values[st] || 0),
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `compute_service_types_used_${new Date().toISOString().substring(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderServiceTypeHeader = (st: string) => {
    const group = getServiceGroup(st);
    let colorClass = 'text-zinc-700';
    let badgeClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';

    if (group === 'COM_SF') {
      colorClass = 'text-indigo-800';
      badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (group === 'COM_AI') {
      colorClass = 'text-purple-800';
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (group === 'AI_TOKEN') {
      colorClass = 'text-emerald-800';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }

    return (
      <th
        key={`th-${st}`}
        onClick={() => handleIndivSort(st)}
        className="py-3 px-3 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
      >
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <span className={`font-mono text-[11px] font-semibold ${colorClass}`}>{st}</span>
            {indivSortField === st ? (
              indivSortOrder === 'asc' ? (
                <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
              ) : (
                <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-zinc-400 shrink-0" />
            )}
          </div>
          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${badgeClass}`}>
            {group}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: View Mode Toggle (모아보기 vs 개별보기) & Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View Mode Toggle Buttons */}
        <div className="inline-flex items-center rounded-lg bg-zinc-100 p-1 text-xs font-semibold text-zinc-600">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              viewMode === 'grouped'
                ? 'bg-white text-indigo-700 shadow-xs font-bold border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Service Type 모아보기 (기본)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              viewMode === 'individual'
                ? 'bg-white text-indigo-700 shadow-xs font-bold border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Service Type 개별보기</span>
          </button>
        </div>

        {/* Action buttons (CSV & PageSize) */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-zinc-700 hover:bg-zinc-50 transition shadow-2xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            <span>CSV 내보내기</span>
          </button>

          {viewMode === 'grouped' ? (
            <select
              value={groupedPageSize}
              onChange={(e) => {
                setGroupedPageSize(Number(e.target.value));
                setGroupedPage(1);
              }}
              className="px-2 py-1.5 bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={15}>15개씩 보기</option>
              <option value={25}>25개씩 보기</option>
              <option value={50}>50개씩 보기</option>
              <option value={100}>100개씩 보기</option>
            </select>
          ) : (
            <select
              value={indivPageSize}
              onChange={(e) => {
                setIndivPageSize(Number(e.target.value));
                setIndivPage(1);
              }}
              className="px-2 py-1.5 bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={15}>15개씩 보기</option>
              <option value={25}>25개씩 보기</option>
              <option value={50}>50개씩 보기</option>
              <option value={100}>100개씩 보기</option>
            </select>
          )}
        </div>
      </div>

      {/* Table 1: Service Type 모아보기 (기본형: 일별 1행, USAGE DATE | 총 합산 | COMP_SF | COMP_AI | AI_TOKEN) */}
      {viewMode === 'grouped' && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-zinc-600 divide-y divide-zinc-200 min-w-[700px]">
              <thead className="bg-zinc-50/80 text-zinc-700 font-semibold uppercase tracking-wider text-[11px] select-none">
                <tr>
                  {/* USAGE DATE */}
                  <th
                    onClick={() => handleGroupedSort('usage_date')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>USAGE DATE</span>
                      {groupedSortField === 'usage_date' ? (
                        groupedSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>

                  {/* 총 합산 */}
                  <th
                    onClick={() => handleGroupedSort('total_credits')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right bg-indigo-50/40"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-indigo-950 font-bold">
                      <span>총 합산 (TOTAL)</span>
                      {groupedSortField === 'total_credits' ? (
                        groupedSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>

                  {/* COMP_SF (Compute서비스) */}
                  <th
                    onClick={() => handleGroupedSort('com_sf')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-indigo-700 font-semibold">
                      <span>COMP_SF (Compute서비스)</span>
                      {groupedSortField === 'com_sf' ? (
                        groupedSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>

                  {/* COMP_AI (AI서비스) */}
                  <th
                    onClick={() => handleGroupedSort('com_ai')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-purple-700 font-semibold">
                      <span>COMP_AI (AI서비스)</span>
                      {groupedSortField === 'com_ai' ? (
                        groupedSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>

                  {/* AI_TOKEN (AI토큰) */}
                  <th
                    onClick={() => handleGroupedSort('ai_token')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-emerald-700 font-semibold">
                      <span>AI_TOKEN (AI토큰)</span>
                      {groupedSortField === 'ai_token' ? (
                        groupedSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white font-mono text-[12px]">
                {paginatedGroupedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans">
                      조회된 컴퓨트 사용량 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedGroupedData.map((row, idx) => (
                    <tr
                      key={`grp-${row.usage_date}-${idx}`}
                      className="hover:bg-zinc-50/80 transition-colors whitespace-nowrap"
                    >
                      <td className="py-2.5 px-4 font-medium text-zinc-900">
                        {row.usage_date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-950 bg-indigo-50/20">
                        {formatCredits(row.total_credits, 6, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-indigo-700">
                        {formatCredits(row.com_sf, 6, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-purple-700">
                        {formatCredits(row.com_ai, 6, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-emerald-600">
                        {formatCredits(row.ai_token, 6, true)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Grouped */}
          <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <div>
              총 <span className="font-semibold text-zinc-800">{sortedGroupedData.length}</span>일 데이터
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={groupedPage === 1}
                onClick={() => setGroupedPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-zinc-700">
                {groupedPage} / {totalGroupedPages}
              </span>
              <button
                type="button"
                disabled={groupedPage >= totalGroupedPages}
                onClick={() => setGroupedPage((p) => Math.min(totalGroupedPages, p + 1))}
                className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table 2: Service Type 개별보기 (일별 1행 피벗: USAGE DATE | 총 합산 | 개별 service_type별 USED_COMPUTE) */}
      {viewMode === 'individual' && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-zinc-600 divide-y divide-zinc-200 min-w-[1200px]">
              <thead className="bg-zinc-50/80 text-zinc-700 font-semibold uppercase tracking-wider text-[11px] select-none">
                <tr>
                  {/* 1. USAGE DATE */}
                  <th
                    onClick={() => handleIndivSort('usage_date')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap sticky left-0 bg-zinc-50/95 z-10 shadow-r"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>USAGE DATE</span>
                      {indivSortField === 'usage_date' ? (
                        indivSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>

                  {/* 2. 합산 (TOTAL COMPUTE) - 날짜 바로 다음 위치 */}
                  <th
                    onClick={() => handleIndivSort('total_compute')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right bg-indigo-50/40"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-indigo-950 font-bold">
                      <span>총 합산 (USED COMPUTE)</span>
                      {indivSortField === 'total_compute' ? (
                        indivSortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      )}
                    </div>
                  </th>

                  {/* 3. 개별 Service Type 컬럼들 (USED_COMPUTE 값) */}
                  {availableServiceTypes.map((st) => renderServiceTypeHeader(st))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white font-mono text-[12px]">
                {paginatedIndivData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={availableServiceTypes.length + 2}
                      className="py-8 text-center text-zinc-400 font-sans"
                    >
                      조회된 컴퓨트 사용량 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedIndivData.map((row, idx) => (
                    <tr
                      key={`indiv-${row.usage_date}-${idx}`}
                      className="hover:bg-zinc-50/80 transition-colors whitespace-nowrap"
                    >
                      {/* USAGE DATE */}
                      <td className="py-2.5 px-4 font-medium text-zinc-900 sticky left-0 bg-white z-10 shadow-r">
                        {row.usage_date}
                      </td>

                      {/* 총 합산 */}
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-950 bg-indigo-50/20">
                        {formatCredits(row.total_compute, 6, true)}
                      </td>

                      {/* Service Type별 USED_COMPUTE 수치 */}
                      {availableServiceTypes.map((st) => {
                        const val = row.values[st] || 0;
                        const isZero = val === 0;
                        return (
                          <td
                            key={`cell-${row.usage_date}-${st}`}
                            className={`py-2.5 px-3 text-right ${
                              isZero ? 'text-zinc-300 font-normal' : 'text-zinc-800 font-medium'
                            }`}
                          >
                            {formatCredits(val, 6, true)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Individual */}
          <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <div>
              총 <span className="font-semibold text-zinc-800">{sortedIndivData.length}</span>일 데이터
              ({availableServiceTypes.length}개 Service Type)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={indivPage === 1}
                onClick={() => setIndivPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-zinc-700">
                {indivPage} / {totalIndivPages}
              </span>
              <button
                type="button"
                disabled={indivPage >= totalIndivPages}
                onClick={() => setIndivPage((p) => Math.min(totalIndivPages, p + 1))}
                className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
