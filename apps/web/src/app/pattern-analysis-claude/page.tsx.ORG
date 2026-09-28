'use client';

import React, { useState, useCallback } from 'react';
import {
  BrainCircuit,
  Calendar,
  Info,
  Database,
  FileText,
} from 'lucide-react';
import PatternAnalysisChart from '@/components/pattern/PatternAnalysisChart';
import AiAnalysisResult from '@/components/pattern/AiAnalysisResult';
import {
  DailyUsagePatternItem,
  PatternAnalysisSummary,
  PatternAnalysisResponse,
  AiStatusType,
} from '@/types/pattern';

export default function PatternAnalysisClaudePage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10));

  const [dailyData, setDailyData] = useState<DailyUsagePatternItem[]>([]);
  const [summary, setSummary] = useState<PatternAnalysisSummary>({
    totalCredits: 0, avgDailyCredits: 0,
    maxDailyCredits: 0, maxDailyCreditDate: '',
    minDailyCredits: 0, minDailyCreditDate: '',
    latestStorageBytes: 0, avgStorageBytes: 0,
    maxStorageBytes: 0, maxStorageDate: '',
    minStorageBytes: 0, minStorageDate: '',
    totalDays: 0,
  });

  const [aiStatus, setAiStatus] = useState<AiStatusType>('IDLE');
  const [aiMessage, setAiMessage] = useState<string | undefined>();
  const [aiDetail, setAiDetail] = useState<string | undefined>();
  const [aiAnalysis, setAiAnalysis] = useState<string | undefined>();
  const [logFileName, setLogFileName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'mysql' | 'mock'>('mysql');
  const [dbNotice, setDbNotice] = useState<string | undefined>();


  const executeAnalysis = useCallback(async (start: string, end: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/sfumonai';
      const url = `${basePath}/api/pattern-analysis-claude?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;

      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '패턴 분석 데이터 요청에 실패했습니다.');
      }

      const json: PatternAnalysisResponse = await res.json();
      setDailyData(json.data || []);
      if (json.summary) setSummary(json.summary);
      setAiStatus(json.aiStatus);
      setAiMessage(json.aiMessage);
      setAiDetail(json.aiDetail);
      setAiAnalysis(json.aiAnalysis);
      setDataSource(json.source);
      setDbNotice(json.message);
      setLogFileName(json.logFile);
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMessage(msg);
      setAiStatus('CONNECTION_ERROR');
      setAiMessage('접속 오류');
      setAiDetail(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRequestClick = () => {
    if (startDate > endDate) {
      alert('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }
    executeAnalysis(startDate, endDate);
  };

  return (
    <div className="space-y-6">
      {/* 1. 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900">
              사용량 패턴 분석 (Claude)
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            조회 기간을 지정한 후 <strong>[분석 요청]</strong> 버튼을 누르면, 일별 스토리지 및 컴퓨트 사용 기록을 바탕으로 Claude AI 분석과 사용량 그래프가 생성됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {logFileName && (
            <div
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200"
              title={`로그 파일 위치: apps/web/logs/${logFileName}`}
            >
              <FileText className="h-3 w-3 text-zinc-500" />
              <span>logs/{logFileName}</span>
            </div>
          )}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
              dataSource === 'mysql'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Database className="h-3 w-3" />
            <span>{dataSource === 'mysql' ? 'MySQL 실시간 연동' : '시뮬레이션 모드'}</span>
          </div>
        </div>
      </div>

      {/* DB 시뮬레이션 알림 */}
      {dataSource === 'mock' && dbNotice && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold">{dbNotice}</span>
            <p className="text-[11px] text-amber-700">
              로컬 개발 환경에서 MySQL SSH 터널(<code className="font-mono">bin/palm252_mysql_tunnel.sh</code>) 가동 시 자동으로 실제 DB 데이터로 전환됩니다.
            </p>
          </div>
        </div>
      )}

      {/* 2. 컨트롤 바 */}
      <section className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-zinc-800 text-xs font-mono focus:outline-hidden"
              />
              <span className="text-zinc-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-zinc-800 text-xs font-mono focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleRequestClick}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <BrainCircuit className={`h-3.5 w-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
              <span>{isLoading ? '분석 요청 중...' : '분석 요청'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. AI 분석 의견 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
          <BrainCircuit className="h-4 w-4 text-amber-500" />
          <span>AI 사용 패턴 및 특이점 분석의견 (Claude)</span>
        </h2>
        <AiAnalysisResult
          status={aiStatus}
          message={aiMessage}
          detail={aiDetail}
          analysisText={aiAnalysis}
          startDate={startDate}
          endDate={endDate}
          onRetry={handleRequestClick}
          isLoading={isLoading}
          aiProvider="claude"
        />
      </section>

      {/* 4. 사용량 추이 그래프 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <span>사용량 추이 그래프</span>
            {dailyData.length > 0 && (
              <span className="text-xs font-normal text-zinc-500 font-mono">
                ({startDate} ~ {endDate})
              </span>
            )}
          </h2>
        </div>
        <PatternAnalysisChart
          data={dailyData}
          summary={summary}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
}
