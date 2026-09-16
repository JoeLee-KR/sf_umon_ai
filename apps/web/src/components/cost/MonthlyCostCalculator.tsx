'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MonthlyCostCalculateResponse,
  MonthlyBillingRecord,
} from '@/types/cost';
import { formatCurrency, formatCredits } from '@/lib/formatters';
import {
  Calculator,
  Calendar,
  HardDrive,
  Cpu,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  Loader2,
} from 'lucide-react';

interface MonthlyCostCalculatorProps {
  onConfirmSuccess?: (record: MonthlyBillingRecord) => void;
}

export function getInitialPreviousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function MonthlyCostCalculator({
  onConfirmSuccess,
}: MonthlyCostCalculatorProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(getInitialPreviousMonth);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [data, setData] = useState<MonthlyCostCalculateResponse | null>(null);

  // Editable prices and inputs
  const [storageUnitPrice, setStorageUnitPrice] = useState<number>(5.225);
  const [comSfUnitPrice, setComSfUnitPrice] = useState<number>(2.0);
  const [comAiUnitPrice, setComAiUnitPrice] = useState<number>(2.0);
  const [aiTokenCostInput, setAiTokenCostInput] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  // Fetch usage data for selected month
  const fetchUsageForMonth = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/cost/calculate?month=${month}`);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '월 사용량 데이터를 불러올 수 없습니다.');
      }

      const json: MonthlyCostCalculateResponse = await res.json();
      setData(json);

      // Initialize inputs from confirmed record if exists, otherwise defaults
      if (json.confirmedRecord) {
        setStorageUnitPrice(json.confirmedRecord.storage_unit_price);
        setComSfUnitPrice(json.confirmedRecord.com_sf_unit_price);
        setComAiUnitPrice(json.confirmedRecord.com_ai_unit_price);
        setAiTokenCostInput(json.confirmedRecord.ai_token_cost);
        setNote(json.confirmedRecord.note || '');
      } else {
        setStorageUnitPrice(json.defaults.storageUnitPrice);
        setComSfUnitPrice(json.defaults.comSfUnitPrice);
        setComAiUnitPrice(json.defaults.comAiUnitPrice);
        setAiTokenCostInput(json.defaults.aiTokenCost || 0);
        setNote('');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageForMonth(selectedMonth);
  }, [selectedMonth, fetchUsageForMonth]);

  // Navigate month
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleResetToPrevMonth = () => {
    setSelectedMonth(getInitialPreviousMonth());
  };

  const handleResetPrices = () => {
    if (data?.defaults) {
      setStorageUnitPrice(data.defaults.storageUnitPrice);
      setComSfUnitPrice(data.defaults.comSfUnitPrice);
      setComAiUnitPrice(data.defaults.comAiUnitPrice);
      setAiTokenCostInput(0);
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    if (!data?.usage) {
      return {
        storageTb: 0,
        storageCost: 0,
        comSfCredits: 0,
        comSfCost: 0,
        comAiCredits: 0,
        comAiCost: 0,
        aiTokenCredits: 0,
        aiTokenCost: 0,
        totalCost: 0,
      };
    }

    const storageTb = data.usage.storageAvgTb || 0;
    const storageCost = Number((storageTb * (Number(storageUnitPrice) || 0)).toFixed(2));

    const comSfCredits = data.usage.comSfCredits || 0;
    const comSfCost = Number((comSfCredits * (Number(comSfUnitPrice) || 0)).toFixed(2));

    const comAiCredits = data.usage.comAiCredits || 0;
    const comAiCost = Number((comAiCredits * (Number(comAiUnitPrice) || 0)).toFixed(2));

    const aiTokenCredits = data.usage.aiTokenCredits || 0;
    const aiTokenCost = Number((Number(aiTokenCostInput) || 0).toFixed(2));

    const totalCost = Number((storageCost + comSfCost + comAiCost + aiTokenCost).toFixed(2));

    return {
      storageTb,
      storageCost,
      comSfCredits,
      comSfCost,
      comAiCredits,
      comAiCost,
      aiTokenCredits,
      aiTokenCost,
      totalCost,
    };
  }, [data, storageUnitPrice, comSfUnitPrice, comAiUnitPrice, aiTokenCostInput]);

  // Handle Confirm action
  const handleConfirm = async () => {
    if (!data?.usage) return;

    setConfirming(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const payload = {
        billing_month: data.usage.month,
        start_date: data.usage.startDate,
        end_date: data.usage.endDate,
        storage_tb_avg: calculations.storageTb,
        storage_unit_price: Number(storageUnitPrice) || 0,
        storage_cost: calculations.storageCost,
        com_sf_credits: calculations.comSfCredits,
        com_sf_unit_price: Number(comSfUnitPrice) || 0,
        com_sf_cost: calculations.comSfCost,
        com_ai_credits: calculations.comAiCredits,
        com_ai_unit_price: Number(comAiUnitPrice) || 0,
        com_ai_cost: calculations.comAiCost,
        ai_token_credits: calculations.aiTokenCredits,
        ai_token_cost: calculations.aiTokenCost,
        total_cost: calculations.totalCost,
        note: note.trim() || undefined,
      };

      const res = await fetch(`${basePath}/api/cost/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '요금 확정 처리에 실패했습니다.');
      }

      const resJson = await res.json();
      setSuccessMessage(`${data.usage.month} 요금이 정상적으로 확정(Confirm)되었습니다.`);
      
      // Refresh current month data to reflect new confirmation record
      await fetchUsageForMonth(selectedMonth);

      if (onConfirmSuccess && resJson.data) {
        onConfirmSuccess(resJson.data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Block Header */}
      <div className="px-6 py-5 border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 text-white text-xs font-bold">
              1
            </span>
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-600" />
              월 요금 산정 및 확정 (Confirm)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 pl-9">
            해당 월 1일부터 말일까지의 스토리지 및 컴퓨트 사용량을 취합하여 요금을 환산하고 확정합니다.
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="inline-flex items-center bg-zinc-100 rounded-lg p-1 border border-zinc-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
              title="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative flex items-center px-2">
              <Calendar className="h-3.5 w-3.5 text-zinc-500 mr-1.5 pointer-events-none" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="bg-transparent text-sm font-semibold text-zinc-800 focus:outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
              title="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToPrevMonth}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
          >
            전달로 재설정
          </button>
        </div>
      </div>

      {/* Date Range & Status Info */}
      <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-100 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-4 text-zinc-600">
          <span className="flex items-center gap-1.5 font-medium text-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            산정 대상 기간:
          </span>
          <span className="bg-white px-2.5 py-1 rounded border border-zinc-200 font-mono text-zinc-800">
            {data?.usage.startDate || `${selectedMonth}-01`} ~ {data?.usage.endDate || `${selectedMonth}-말일`}
          </span>
          <span className="text-zinc-400">
            (스토리지 기록: {data?.usage.storageRecordCount || 0}일 / 컴퓨트 기록: {data?.usage.computeRecordCount || 0}건)
          </span>
        </div>

        {data?.confirmedRecord ? (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>이미 확정된 월입니다 ({data.confirmedRecord.confirmed_at} 확정됨, ${data.confirmedRecord.total_cost.toLocaleString()})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>미확정 상태 (요금 산정 후 확정 버튼을 눌러주세요)</span>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="m-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold">오류가 발생했습니다</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="m-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm">
          <Check className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Existing Confirmation Notice */}
      {data?.confirmedRecord && (
        <div className="mx-6 mt-6 p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-950">재확정 안내:</span> 이 월({selectedMonth})에는 이미 확정된 내역(총 {formatCurrency(data.confirmedRecord.total_cost)})이 존재합니다.
            단가나 항목을 수정하고 다시 <strong className="font-semibold text-blue-950">[요금 확정 (Confirm)]</strong>을 진행하면,
            기존 확정 내역은 자동으로 <strong>비활성(INACTIVE)</strong> 처리되고 새로운 내역이 <strong>유효(ACTIVE)</strong>로 갱신됩니다.
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-700" />
          <p className="text-sm font-medium">해당 월의 사용량 데이터를 집계하는 중입니다...</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Calculation Items Table / Grid */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <div className="bg-zinc-100/80 px-4 py-3 text-xs font-semibold text-zinc-700 grid grid-cols-12 gap-2 border-b border-zinc-200">
              <div className="col-span-12 md:col-span-4">산정 항목</div>
              <div className="col-span-12 md:col-span-3 text-right">집계 사용량</div>
              <div className="col-span-12 md:col-span-3 text-right">기본 단가 / 입력 요금 ($)</div>
              <div className="col-span-12 md:col-span-2 text-right">환산 요금 ($)</div>
            </div>

            <div className="divide-y divide-zinc-200">
              {/* 1. Storage */}
              <div className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-zinc-50/60 transition">
                <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">Storage 저장량 평균</h4>
                    <p className="text-xs text-zinc-500">1일부터 말일까지 일평균 저장 용량</p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 text-left md:text-right">
                  <div className="text-sm font-semibold text-zinc-900 font-mono">
                    {calculations.storageTb.toFixed(4)} <span className="text-xs font-normal text-zinc-500">TB</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    ({(data?.usage.storageAvgBytes || 0).toLocaleString()} Bytes)
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 flex items-center justify-start md:justify-end gap-1.5">
                  <span className="text-xs text-zinc-500">TB당 $</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={storageUnitPrice}
                    onChange={(e) => setStorageUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1 text-sm font-mono text-right bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="col-span-12 md:col-span-2 text-left md:text-right">
                  <span className="text-sm font-bold font-mono text-zinc-900">
                    {formatCurrency(calculations.storageCost)}
                  </span>
                </div>
              </div>

              {/* 2. COM_SF */}
              <div className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-zinc-50/60 transition">
                <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">COM_SF 사용량 합</h4>
                    <p className="text-xs text-zinc-500">Snowflake 표준 컴퓨팅 크레딧 합계</p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 text-left md:text-right">
                  <div className="text-sm font-semibold text-zinc-900 font-mono">
                    {formatCredits(calculations.comSfCredits, 4)} <span className="text-xs font-normal text-zinc-500">Credit</span>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 flex items-center justify-start md:justify-end gap-1.5">
                  <span className="text-xs text-zinc-500">Credit당 $</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={comSfUnitPrice}
                    onChange={(e) => setComSfUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1 text-sm font-mono text-right bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="col-span-12 md:col-span-2 text-left md:text-right">
                  <span className="text-sm font-bold font-mono text-zinc-900">
                    {formatCurrency(calculations.comSfCost)}
                  </span>
                </div>
              </div>

              {/* 3. COM_AI */}
              <div className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-zinc-50/60 transition">
                <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">COM_AI 사용량 합</h4>
                    <p className="text-xs text-zinc-500">AI / 머신러닝 전용 컴퓨팅 크레딧 합계</p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 text-left md:text-right">
                  <div className="text-sm font-semibold text-zinc-900 font-mono">
                    {formatCredits(calculations.comAiCredits, 4)} <span className="text-xs font-normal text-zinc-500">Credit</span>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 flex items-center justify-start md:justify-end gap-1.5">
                  <span className="text-xs text-zinc-500">Credit당 $</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={comAiUnitPrice}
                    onChange={(e) => setComAiUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1 text-sm font-mono text-right bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="col-span-12 md:col-span-2 text-left md:text-right">
                  <span className="text-sm font-bold font-mono text-zinc-900">
                    {formatCurrency(calculations.comAiCost)}
                  </span>
                </div>
              </div>

              {/* 4. AI_TOKEN */}
              <div className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-zinc-50/60 transition bg-amber-50/20">
                <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-zinc-900">AI_TOKEN 사용량 합</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Custom 요금
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">LLM 토큰 사용량 (비용 직접 입력)</p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 text-left md:text-right">
                  <div className="text-sm font-semibold text-zinc-900 font-mono">
                    {formatCredits(calculations.aiTokenCredits, 4)} <span className="text-xs font-normal text-zinc-500">Credit</span>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-3 flex items-center justify-start md:justify-end gap-1.5">
                  <span className="text-xs font-medium text-amber-900">직접 입력 $</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={aiTokenCostInput}
                    onChange={(e) => setAiTokenCostInput(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-28 px-2.5 py-1 text-sm font-mono font-semibold text-right bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition shadow-xs"
                  />
                </div>

                <div className="col-span-12 md:col-span-2 text-left md:text-right">
                  <span className="text-sm font-bold font-mono text-amber-700">
                    {formatCurrency(calculations.aiTokenCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls & Summary */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 p-5 bg-zinc-900 text-white rounded-xl shadow-md">
            {/* Note & Reset Unit Price */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="billing-note" className="text-xs font-medium text-zinc-300">
                  확정 메모 / 비고 (선택사항)
                </label>
                <button
                  type="button"
                  onClick={handleResetPrices}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  단가 기본값으로 복원
                </button>
              </div>
              <input
                id="billing-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 8월 정기 정산분, AI 토큰 정산 완료"
                className="w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Total Cost & Confirm Button */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 lg:border-l border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
              <div className="text-right">
                <div className="text-xs text-zinc-400 font-medium">
                  {selectedMonth} 총 확정 예정 금액
                </div>
                <div className="text-2xl font-extrabold text-white font-mono flex items-center justify-end gap-1">
                  <DollarSign className="h-6 w-6 text-emerald-400 -mr-1" />
                  {calculations.totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={confirming || loading}
                onClick={handleConfirm}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>확정 처리 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <span>{data?.confirmedRecord ? '요금 다시 확정하기 (Confirm)' : '요금 확정하기 (Confirm)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
