'use client';

import React, { useState, useMemo } from 'react';
import { MonthlyBillingRecord } from '@/types/cost';
import { formatCurrency, formatCredits, formatNumberExact } from '@/lib/formatters';
import {
  Table as TableIcon,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface MonthlyCostHistoryTableProps {
  data: MonthlyBillingRecord[];
  isLoading?: boolean;
}

type SortField = 'billing_month' | 'storage_cost' | 'com_sf_cost' | 'com_ai_cost' | 'ai_token_cost' | 'total_cost' | 'confirmed_at';

export default function MonthlyCostHistoryTable({
  data,
  isLoading = false,
}: MonthlyCostHistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('billing_month');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Sorting
  const sortedData = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'billing_month') {
        cmp = a.billing_month.localeCompare(b.billing_month);
      } else if (sortField === 'confirmed_at') {
        cmp = a.confirmed_at.localeCompare(b.confirmed_at);
      } else {
        cmp = (a[sortField] || 0) - (b[sortField] || 0);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (data.length === 0) return;

    const headers = [
      'ID',
      '대상월',
      '시작일',
      '종료일',
      'Storage평균(TB)',
      'Storage단가($/TB)',
      'Storage요금($)',
      'COM_SF사용량(Credit)',
      'COM_SF단가($/Credit)',
      'COM_SF요금($)',
      'COM_AI사용량(Credit)',
      'COM_AI단가($/Credit)',
      'COM_AI요금($)',
      'AI_TOKEN사용량(Credit)',
      'AI_TOKEN요금($)',
      '총확정요금($)',
      '상태',
      '비고',
      '확정일시',
    ];

    const rows = data.map((item) => [
      item.id,
      item.billing_month,
      item.start_date,
      item.end_date,
      item.storage_tb_avg.toFixed(4),
      item.storage_unit_price.toFixed(4),
      item.storage_cost.toFixed(4),
      item.com_sf_credits.toFixed(4),
      item.com_sf_unit_price.toFixed(4),
      item.com_sf_cost.toFixed(4),
      item.com_ai_credits.toFixed(4),
      item.com_ai_unit_price.toFixed(4),
      item.com_ai_cost.toFixed(4),
      item.ai_token_credits.toFixed(4),
      item.ai_token_cost.toFixed(4),
      item.total_cost.toFixed(4),
      item.status,
      item.note ? `"${item.note.replace(/"/g, '""')}"` : '',
      item.confirmed_at,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly_billing_history_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-600 font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-600 font-bold" />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-50 to-white">
        <div>
          <div className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-zinc-900">확정 요금 리스트</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              Active {data.length}건
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            현재 활성화(Active)된 월별 확정 요금 내역입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={data.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
        >
          <Download className="h-3.5 w-3.5" />
          CSV 다운로드
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 text-sm">
          목록 데이터를 불러오는 중입니다...
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="p-12 text-center text-zinc-400 text-sm">
          확정된 요금 내역이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100/80 border-b border-zinc-200 text-zinc-700 font-semibold uppercase tracking-wider">
                <th
                  onClick={() => handleSort('billing_month')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>대상 월</span>
                    {renderSortIcon('billing_month')}
                  </div>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">산정 기간</th>
                <th
                  onClick={() => handleSort('storage_cost')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Storage 요금</span>
                    {renderSortIcon('storage_cost')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('com_sf_cost')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>COM_SF 요금</span>
                    {renderSortIcon('com_sf_cost')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('com_ai_cost')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>COM_AI 요금</span>
                    {renderSortIcon('com_ai_cost')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ai_token_cost')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>AI_TOKEN 요금</span>
                    {renderSortIcon('ai_token_cost')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_cost')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>총 확정 요금</span>
                    {renderSortIcon('total_cost')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('confirmed_at')}
                  className="py-3 px-4 cursor-pointer hover:bg-zinc-200/60 transition group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>확정 일시</span>
                    {renderSortIcon('confirmed_at')}
                  </div>
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap">상태</th>
                <th className="py-3 px-4 whitespace-nowrap">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/80 transition">
                  <td className="py-3 px-4 font-bold font-mono text-zinc-900 text-sm whitespace-nowrap">
                    {item.billing_month}
                  </td>
                  <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                    {item.start_date} ~ {item.end_date}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-semibold text-zinc-900 font-mono">
                      {formatCurrency(item.storage_cost, 4)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {formatNumberExact(item.storage_tb_avg, 4)} TB ({formatCurrency(item.storage_unit_price, 4)}/TB)
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-semibold text-zinc-900 font-mono">
                      {formatCurrency(item.com_sf_cost, 4)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {formatCredits(item.com_sf_credits, 4, true)} Cr ({formatCurrency(item.com_sf_unit_price, 4)})
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-semibold text-zinc-900 font-mono">
                      {formatCurrency(item.com_ai_cost, 4)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {formatCredits(item.com_ai_credits, 4, true)} Cr ({formatCurrency(item.com_ai_unit_price, 4)})
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-semibold text-amber-700 font-mono">
                      {formatCurrency(item.ai_token_cost, 4)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {formatCredits(item.ai_token_credits, 4, true)} Cr
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-extrabold text-sm text-emerald-700 font-mono">
                      {formatCurrency(item.total_cost, 4)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                    {item.confirmed_at}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      <CheckCircle2 className="h-3 w-3" />
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 text-xs whitespace-nowrap max-w-[200px] truncate" title={item.note || ''}>
                    {item.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-600 bg-zinc-50">
          <div>
            전체 {sortedData.length}건 중 {(page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, sortedData.length)}건 표시
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-zinc-300 rounded font-medium hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              이전
            </button>
            <span className="px-2 font-mono">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-zinc-300 rounded font-medium hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
