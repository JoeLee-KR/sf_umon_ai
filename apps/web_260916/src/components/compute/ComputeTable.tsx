'use client';

import React, { useMemo, useState } from 'react';
import { ComputeRawUsage, ComputeDailyUsage, ComputeServiceGroup } from '@/types/compute';
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

type IndividualSortField =
  | 'usage_date'
  | 'credits_billed'
  | 'service_type'
  | 'service_group'
  | 'credits_used_compute'
  | 'credits_used_cloud_services'
  | 'credits_used'
  | 'credits_adjustment_cloud_services'
  | 'up_dt';

export default function ComputeTable({ rawData, dailyData }: ComputeTableProps) {
  const [viewMode, setViewMode] = useState<TableViewMode>('grouped');

  // Grouped mode state
  const [groupedSortField, setGroupedSortField] = useState<GroupedSortField>('usage_date');
  const [groupedSortOrder, setGroupedSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupedPage, setGroupedPage] = useState(1);
  const [groupedPageSize, setGroupedPageSize] = useState(25);

  // Individual mode state
  const [indivSortField, setIndivSortField] = useState<IndividualSortField>('usage_date');
  const [indivSortOrder, setIndivSortOrder] = useState<'asc' | 'desc'>('desc');
  const [indivPage, setIndivPage] = useState(1);
  const [indivPageSize, setIndivPageSize] = useState(25);

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
  const handleIndivSort = (field: IndividualSortField) => {
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

  // Sorted Individual Data (default desc)
  const sortedIndivData = useMemo(() => {
    const list = [...rawData];
    list.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (indivSortField === 'usage_date') {
        aVal = a.usage_date;
        bVal = b.usage_date;
      } else if (indivSortField === 'credits_billed') {
        aVal = Number(a.credits_billed) || 0;
        bVal = Number(b.credits_billed) || 0;
      } else if (indivSortField === 'service_type') {
        aVal = a.service_type;
        bVal = b.service_type;
      } else if (indivSortField === 'service_group') {
        aVal = a.service_group;
        bVal = b.service_group;
      } else if (indivSortField === 'credits_used_compute') {
        aVal = Number(a.credits_used_compute) || 0;
        bVal = Number(b.credits_used_compute) || 0;
      } else if (indivSortField === 'credits_used_cloud_services') {
        aVal = Number(a.credits_used_cloud_services) || 0;
        bVal = Number(b.credits_used_cloud_services) || 0;
      } else if (indivSortField === 'credits_used') {
        aVal = Number(a.credits_used) || 0;
        bVal = Number(b.credits_used) || 0;
      } else if (indivSortField === 'credits_adjustment_cloud_services') {
        aVal = Number(a.credits_adjustment_cloud_services) || 0;
        bVal = Number(b.credits_adjustment_cloud_services) || 0;
      } else if (indivSortField === 'up_dt') {
        aVal = a.up_dt || '';
        bVal = b.up_dt || '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return indivSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return indivSortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [rawData, indivSortField, indivSortOrder]);

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
      const headers = [
        'usage_date',
        'credits_billed',
        'service_type',
        'service_group',
        'credits_used_compute',
        'credits_used_cloud_services',
        'credits_used',
        'credits_adjustment_cloud_services',
        'up_dt',
      ];
      const rows = sortedIndivData.map((d) => [
        d.usage_date,
        d.credits_billed,
        `"${d.service_type}"`,
        d.service_group,
        d.credits_used_compute,
        d.credits_used_cloud_services,
        d.credits_used,
        d.credits_adjustment_cloud_services,
        `"${d.up_dt || ''}"`,
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `compute_raw_individual_${new Date().toISOString().substring(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderGroupBadge = (group: ComputeServiceGroup) => {
    switch (group) {
      case 'COM_SF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            COM_SF
          </span>
        );
      case 'COM_AI':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            COM_AI
          </span>
        );
      case 'AI_TOKEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            AI_TOKEN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            {group}
          </span>
        );
    }
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

      {/* Table 1: Service Type 모아보기 (기본형: 하루 1개 행, 날짜 바로 뒤에 합산 위치) */}
      {viewMode === 'grouped' && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-zinc-600 divide-y divide-zinc-200 min-w-[720px]">
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

                  {/* 총 합산 (날짜 바로 다음) */}
                  <th
                    onClick={() => handleGroupedSort('total_credits')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right bg-indigo-50/40"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-indigo-950 font-bold">
                      <span>총 합산</span>
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
                        {formatCredits(row.total_credits, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-indigo-700">
                        {formatCredits(row.com_sf, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-purple-700">
                        {formatCredits(row.com_ai, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-emerald-600">
                        {formatCredits(row.ai_token, 4)}
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

      {/* Table 2: Service Type 개별보기 (날짜 바로 다음에 합산/청구 컬럼 위치) */}
      {viewMode === 'individual' && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-zinc-600 divide-y divide-zinc-200 min-w-[1050px]">
              <thead className="bg-zinc-50/80 text-zinc-700 font-semibold uppercase tracking-wider text-[11px] select-none">
                <tr>
                  {/* 1. USAGE DATE */}
                  <th
                    onClick={() => handleIndivSort('usage_date')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
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

                  {/* 2. 합산/청구 (CREDITS BILLED) - 날짜 바로 다음 위치 */}
                  <th
                    onClick={() => handleIndivSort('credits_billed')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right bg-indigo-50/40"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-indigo-950 font-bold">
                      <span>합산 청구 (CREDITS BILLED)</span>
                      {indivSortField === 'credits_billed' ? (
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

                  {/* 3. SERVICE TYPE */}
                  <th
                    onClick={() => handleIndivSort('service_type')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>SERVICE TYPE</span>
                      {indivSortField === 'service_type' ? (
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

                  {/* 4. 모음 구분 */}
                  <th
                    onClick={() => handleIndivSort('service_group')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>모음 구분</span>
                      {indivSortField === 'service_group' ? (
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

                  {/* 5. USED COMPUTE */}
                  <th
                    onClick={() => handleIndivSort('credits_used_compute')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>USED COMPUTE</span>
                      {indivSortField === 'credits_used_compute' ? (
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

                  {/* 6. USED CLOUD SERVICES */}
                  <th
                    onClick={() => handleIndivSort('credits_used_cloud_services')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>USED CLOUD SERVICES</span>
                      {indivSortField === 'credits_used_cloud_services' ? (
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

                  {/* 7. CREDITS USED */}
                  <th
                    onClick={() => handleIndivSort('credits_used')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>CREDITS USED</span>
                      {indivSortField === 'credits_used' ? (
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

                  {/* 8. ADJUSTMENT */}
                  <th
                    onClick={() => handleIndivSort('credits_adjustment_cloud_services')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>ADJUSTMENT</span>
                      {indivSortField === 'credits_adjustment_cloud_services' ? (
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

                  {/* 9. UPDATE TIME */}
                  <th
                    onClick={() => handleIndivSort('up_dt')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>UP DT</span>
                      {indivSortField === 'up_dt' ? (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white font-mono text-[12px]">
                {paginatedIndivData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-400 font-sans">
                      조회된 개별 컴퓨트 레코드가 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedIndivData.map((row, idx) => (
                    <tr
                      key={`indiv-${row.pkid || idx}`}
                      className="hover:bg-zinc-50/80 transition-colors whitespace-nowrap"
                    >
                      <td className="py-2.5 px-4 font-medium text-zinc-900">
                        {row.usage_date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-950 bg-indigo-50/20">
                        {formatCredits(row.credits_billed, 4)}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-zinc-900">
                        {row.service_type}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        {renderGroupBadge(row.service_group)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-600">
                        {formatCredits(row.credits_used_compute, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-600">
                        {formatCredits(row.credits_used_cloud_services, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-600">
                        {formatCredits(row.credits_used, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-500">
                        {formatCredits(row.credits_adjustment_cloud_services, 4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[11px] text-zinc-400">
                        {row.up_dt || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Individual */}
          <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <div>
              총 <span className="font-semibold text-zinc-800">{sortedIndivData.length}</span>개 개별 레코드
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
