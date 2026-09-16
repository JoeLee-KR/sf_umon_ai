'use client';

import React, { useMemo, useState } from 'react';
import { StorageUsage } from '@/types/storage';
import { formatBytes } from '@/lib/formatters';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface StorageTableProps {
  data: StorageUsage[];
  columns?: string[];
}

type SortField = 'usage_date' | 'storage_bytes' | 'stage_bytes' | 'total_bytes' | 'failsafe_bytes';

export default function StorageTable({ data }: StorageTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('usage_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'usage_date' ? 'desc' : 'asc');
    }
  };

  // Filter and Sort raw data (Default: usage_date desc)
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.usage_date.toLowerCase().includes(q) ||
          item.storage_bytes.toString().includes(q) ||
          item.stage_bytes.toString().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (sortField === 'usage_date') {
        aVal = a.usage_date;
        bVal = b.usage_date;
      } else if (sortField === 'storage_bytes') {
        aVal = Number(a.storage_bytes) || 0;
        bVal = Number(b.storage_bytes) || 0;
      } else if (sortField === 'stage_bytes') {
        aVal = Number(a.stage_bytes) || 0;
        bVal = Number(b.stage_bytes) || 0;
      } else if (sortField === 'total_bytes') {
        aVal = (Number(a.storage_bytes) || 0) + (Number(a.stage_bytes) || 0) + (Number(a.failsafe_bytes) || 0);
        bVal = (Number(b.storage_bytes) || 0) + (Number(b.stage_bytes) || 0) + (Number(b.failsafe_bytes) || 0);
      } else if (sortField === 'failsafe_bytes') {
        aVal = Number(a.failsafe_bytes) || 0;
        bVal = Number(b.failsafe_bytes) || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (Number(aVal) - Number(bVal)) : (Number(bVal) - Number(aVal));
    });

    return result;
  }, [data, search, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, page, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAndSortedData.length === 0) return;
    const headers = ['usage_date', 'storage_bytes', 'storage_formatted', 'stage_bytes', 'stage_formatted', 'failsafe_bytes', 'failsafe_formatted', 'total_bytes', 'total_formatted'];
    const rows = filteredAndSortedData.map((d) => {
      const failsafe = d.failsafe_bytes ?? 0;
      const total = (Number(d.storage_bytes) || 0) + (Number(d.stage_bytes) || 0) + failsafe;
      return [
        d.usage_date,
        d.storage_bytes,
        `"${formatBytes(d.storage_bytes)}"`,
        d.stage_bytes,
        `"${formatBytes(d.stage_bytes)}"`,
        failsafe,
        `"${formatBytes(failsafe)}"`,
        total,
        `"${formatBytes(total)}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sf_storage_usage_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Search & Actions toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="날짜 (YYYY-MM-DD) 또는 바이트 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-zinc-700 hover:bg-zinc-50 transition shadow-2xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            CSV 내보내기
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1.5 bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={15}>15개씩 보기</option>
            <option value={25}>25개씩 보기</option>
            <option value={50}>50개씩 보기</option>
            <option value={100}>100개씩 보기</option>
          </select>
        </div>
      </div>

      {/* Raw Data Table with Horizontal Scroll Support */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-zinc-600 divide-y divide-zinc-200 min-w-[700px]">
            <thead className="bg-zinc-50/80 text-zinc-700 font-semibold uppercase tracking-wider text-[11px] select-none">
              <tr>
                <th
                  onClick={() => handleSort('usage_date')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>USAGE DATE</span>
                    {sortField === 'usage_date' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('storage_bytes')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STORAGE BYTES</span>
                    {sortField === 'storage_bytes' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('stage_bytes')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STAGE BYTES</span>
                    {sortField === 'stage_bytes' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('failsafe_bytes')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>FAILSAFE BYTES</span>
                    {sortField === 'failsafe_bytes' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_bytes')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-100/80 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TOTAL USAGE (누적 총합)</span>
                    {sortField === 'total_bytes' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-[12px]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans">
                    조회된 스토리지 원천 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const failsafe = Number(row.failsafe_bytes) || 0;
                  const total = (Number(row.storage_bytes) || 0) + (Number(row.stage_bytes) || 0) + failsafe;
                  return (
                    <tr
                      key={row.usage_date || idx}
                      className="hover:bg-zinc-50/80 transition-colors whitespace-nowrap"
                    >
                      <td className="py-2.5 px-4 font-semibold text-zinc-900">
                        {row.usage_date}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-800">
                        <span className="font-bold text-indigo-700">
                          {formatBytes(row.storage_bytes)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-zinc-800">
                        <span className="font-bold text-emerald-700">
                          {formatBytes(row.stage_bytes)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-zinc-800">
                        <span className="font-bold text-amber-600">
                          {row.failsafe_bytes !== undefined ? formatBytes(row.failsafe_bytes) : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-zinc-900">
                        <span className="font-bold text-purple-700">
                          {formatBytes(total)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination info */}
        <div className="px-4 py-3 bg-zinc-50/50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            전체 <span className="font-semibold text-zinc-900">{filteredAndSortedData.length}</span>개 레코드
            {search && ` (총 ${data.length}개 중 필터링)`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-md border border-zinc-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              <strong className="text-zinc-900">{page}</strong> / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-md border border-zinc-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
