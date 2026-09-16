'use client';

import React, { useMemo, useState } from 'react';
import { MonthlyBillingRecord } from '@/types/cost';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  HardDrive,
  Cpu,
  Info,
} from 'lucide-react';

interface MonthlyCostHistoryChartProps {
  data: MonthlyBillingRecord[];
  monthsLimit: number;
  onMonthsLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export default function MonthlyCostHistoryChart({
  data,
  monthsLimit,
  onMonthsLimitChange,
  isLoading = false,
}: MonthlyCostHistoryChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter and sort chronologically (oldest to newest) for chart display
  const chartData = useMemo(() => {
    // data is typically passed sorted DESC from API, so reverse to ASC for timeline chart
    const copy = [...data].sort((a, b) => a.billing_month.localeCompare(b.billing_month));
    if (monthsLimit > 0 && copy.length > monthsLimit) {
      return copy.slice(copy.length - monthsLimit);
    }
    return copy;
  }, [data, monthsLimit]);

  // Overall statistics for KPI badges
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { total: 0, avg: 0, maxMonth: '-', maxAmount: 0, latestAmount: 0 };
    }

    let total = 0;
    let maxAmount = -Infinity;
    let maxMonth = '-';

    chartData.forEach((item) => {
      total += item.total_cost;
      if (item.total_cost > maxAmount) {
        maxAmount = item.total_cost;
        maxMonth = item.billing_month;
      }
    });

    const avg = total / chartData.length;
    const latest = chartData[chartData.length - 1];

    return {
      total,
      avg,
      maxMonth,
      maxAmount: maxAmount === -Infinity ? 0 : maxAmount,
      latestAmount: latest ? latest.total_cost : 0,
    };
  }, [chartData]);

  // Determine Y-axis max scale
  const yMax = useMemo(() => {
    if (chartData.length === 0) return 100;
    let maxVal = 0;
    chartData.forEach((d) => {
      if (d.total_cost > maxVal) maxVal = d.total_cost;
    });
    if (maxVal <= 0) return 100;
    
    // Round up nicely
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const rounded = Math.ceil(maxVal / magnitude) * magnitude;
    return Math.max(rounded * 1.15, maxVal * 1.1);
  }, [chartData]);

  // Chart layout dimensions
  const svgHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((ratio) => yMax * ratio);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-zinc-900">월별 확정 요금 추이</h3>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            유효(Active) 확정된 월단위 요금의 상세 구성 및 총액 변화 추이를 확인합니다.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200 self-start sm:self-auto">
          {[
            { label: '6개월', value: 6 },
            { label: '12개월 (기본)', value: 12 },
            { label: '24개월', value: 24 },
            { label: '전체', value: 0 },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onMonthsLimitChange(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                monthsLimit === opt.value
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">조회 기간 합계</div>
          <div className="text-xl font-extrabold text-zinc-900 font-mono mt-1">
            {formatCurrency(stats.total)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">{chartData.length}개 월 확정분</div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">월평균 확정 요금</div>
          <div className="text-xl font-extrabold text-zinc-900 font-mono mt-1">
            {formatCurrency(stats.avg)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">월평균 비용</div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">최대 요금 발생월</div>
          <div className="text-xl font-extrabold text-indigo-700 font-mono mt-1">
            {formatCurrency(stats.maxAmount)}
          </div>
          <div className="text-[10px] text-indigo-500 font-medium mt-0.5">{stats.maxMonth}</div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase">최근 확정월 요금</div>
          <div className="text-xl font-extrabold text-emerald-700 font-mono mt-1">
            {formatCurrency(stats.latestAmount)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {chartData.length > 0 ? chartData[chartData.length - 1].billing_month : '-'}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
            <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>
            <span>Storage 요금</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
            <span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span>
            <span>COM_SF 요금</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
            <span className="w-3 h-3 rounded bg-violet-500 inline-block"></span>
            <span>COM_AI 요금</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
            <span>AI_TOKEN 요금</span>
          </div>
        </div>
        <div className="text-zinc-400 text-[11px]">
          * 막대에 마우스를 올리면 상세 항목 요금을 확인할 수 있습니다.
        </div>
      </div>

      {/* Chart Canvas Area */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
          차트 데이터를 불러오는 중입니다...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50 gap-2">
          <Info className="h-6 w-6 text-zinc-400" />
          <p className="text-sm font-medium">확정된 요금 내역이 없습니다.</p>
          <p className="text-xs text-zinc-400">첫 번째 블록에서 월별 요금을 산정하고 Confirm 버튼을 눌러주세요.</p>
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[600px] relative">
            <svg
              viewBox={`0 0 800 ${svgHeight}`}
              className="w-full h-auto select-none overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Grid Lines & Y-Axis Labels */}
              {yTicks.map((val, idx) => {
                const yPos = paddingTop + chartHeight - (val / yMax) * chartHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={800 - paddingRight}
                      y2={yPos}
                      stroke="#e4e4e7"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={yPos + 3}
                      textAnchor="end"
                      fontSize="10"
                      className="fill-zinc-400 font-mono"
                    >
                      ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Stacked Bars for each Month */}
              {chartData.map((item, index) => {
                const totalBars = chartData.length;
                const availableWidth = 800 - paddingLeft - paddingRight;
                const slotWidth = availableWidth / totalBars;
                const barWidth = Math.min(Math.max(slotWidth * 0.55, 14), 48);
                const xCenter = paddingLeft + slotWidth * index + slotWidth / 2;
                const xLeft = xCenter - barWidth / 2;

                // Heights for each stacked segment
                const storageH = (item.storage_cost / yMax) * chartHeight;
                const comSfH = (item.com_sf_cost / yMax) * chartHeight;
                const comAiH = (item.com_ai_cost / yMax) * chartHeight;
                const aiTokenH = (item.ai_token_cost / yMax) * chartHeight;

                const baseBottom = paddingTop + chartHeight;

                const storageY = baseBottom - storageH;
                const comSfY = storageY - comSfH;
                const comAiY = comSfY - comAiH;
                const aiTokenY = comAiY - aiTokenH;
                const totalTopY = aiTokenY;

                const isHovered = hoverIndex === index;

                return (
                  <g
                    key={item.id || item.billing_month}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    {/* Hover Highlight Area */}
                    {isHovered && (
                      <rect
                        x={xCenter - slotWidth / 2}
                        y={paddingTop}
                        width={slotWidth}
                        height={chartHeight}
                        className="fill-indigo-50/50"
                        rx="4"
                      />
                    )}

                    {/* Storage Bar Segment */}
                    {storageH > 0 && (
                      <rect
                        x={xLeft}
                        y={storageY}
                        width={barWidth}
                        height={storageH}
                        className="fill-blue-500 hover:fill-blue-600 transition"
                      />
                    )}

                    {/* COM_SF Bar Segment */}
                    {comSfH > 0 && (
                      <rect
                        x={xLeft}
                        y={comSfY}
                        width={barWidth}
                        height={comSfH}
                        className="fill-indigo-500 hover:fill-indigo-600 transition"
                      />
                    )}

                    {/* COM_AI Bar Segment */}
                    {comAiH > 0 && (
                      <rect
                        x={xLeft}
                        y={comAiY}
                        width={barWidth}
                        height={comAiH}
                        className="fill-violet-500 hover:fill-violet-600 transition"
                      />
                    )}

                    {/* AI_TOKEN Bar Segment */}
                    {aiTokenH > 0 && (
                      <rect
                        x={xLeft}
                        y={aiTokenY}
                        width={barWidth}
                        height={aiTokenH}
                        className="fill-amber-500 hover:fill-amber-600 transition"
                        rx="2"
                      />
                    )}

                    {/* Total Value on Top of Bar */}
                    <text
                      x={xCenter}
                      y={Math.max(totalTopY - 5, 12)}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      className={`font-mono transition ${
                        isHovered ? 'fill-zinc-900 font-extrabold' : 'fill-zinc-500'
                      }`}
                    >
                      ${item.total_cost >= 1000 ? `${(item.total_cost / 1000).toFixed(1)}k` : item.total_cost.toFixed(0)}
                    </text>

                    {/* X-Axis Month Label */}
                    <text
                      x={xCenter}
                      y={baseBottom + 18}
                      textAnchor="middle"
                      fontSize="10"
                      className={`font-mono transition ${
                        isHovered ? 'fill-zinc-900 font-bold' : 'fill-zinc-600'
                      }`}
                    >
                      {item.billing_month.substring(2)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoverIndex !== null && chartData[hoverIndex] && (
              <div
                className="absolute z-20 pointer-events-none bg-zinc-900 text-white rounded-lg shadow-xl p-3 text-xs w-56 border border-zinc-700"
                style={{
                  top: '10px',
                  left: `${Math.min(
                    Math.max(
                      ((hoverIndex + 0.5) / chartData.length) * 100,
                      15
                    ),
                    85
                  )}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-bold text-sm text-emerald-400 border-b border-zinc-700 pb-1.5 mb-2 flex items-center justify-between">
                  <span>{chartData[hoverIndex].billing_month} 확정분</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-1 font-mono">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-blue-500"></span>
                      Storage:
                    </span>
                    <span className="font-bold">{formatCurrency(chartData[hoverIndex].storage_cost)}</span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-indigo-500"></span>
                      COM_SF:
                    </span>
                    <span className="font-bold">{formatCurrency(chartData[hoverIndex].com_sf_cost)}</span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-violet-500"></span>
                      COM_AI:
                    </span>
                    <span className="font-bold">{formatCurrency(chartData[hoverIndex].com_ai_cost)}</span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-500"></span>
                      AI_TOKEN:
                    </span>
                    <span className="font-bold">{formatCurrency(chartData[hoverIndex].ai_token_cost)}</span>
                  </div>

                  <div className="border-t border-zinc-700 pt-1.5 mt-1.5 flex justify-between items-center text-white font-bold text-sm">
                    <span>총 확정 요금:</span>
                    <span className="text-emerald-400">{formatCurrency(chartData[hoverIndex].total_cost)}</span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 mt-2 pt-1 border-t border-zinc-800">
                  확정일시: {chartData[hoverIndex].confirmed_at}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
