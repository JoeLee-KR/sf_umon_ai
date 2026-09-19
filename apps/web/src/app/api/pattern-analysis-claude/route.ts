import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchStorageUsage, fetchComputeUsage } from "@/lib/db";
import {
  DailyUsagePatternItem,
  PatternAnalysisSummary,
  PatternAnalysisResponse,
} from "@/types/pattern";
import { formatBytes, formatCredits } from "@/lib/formatters";
import { ClaudeLogger } from "@/lib/claude-logger";

export const dynamic = "force-dynamic";

function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return dates;
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().substring(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function generateMockDailyPattern(
  startDateStr: string,
  endDateStr: string
): DailyUsagePatternItem[] {
  const dates = getDateRangeArray(startDateStr, endDateStr);
  if (dates.length === 0) return [];

  return dates.map((date, idx) => {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseCredits = isWeekend ? 10 + Math.random() * 8 : 45 + Math.random() * 35;
    const isSpikeDay = idx % 11 === 4;
    const total_credits = Number((isSpikeDay ? baseCredits * 2.8 : baseCredits).toFixed(4));
    const com_sf = Number((total_credits * 0.8).toFixed(4));
    const com_ai = Number((total_credits * 0.15).toFixed(4));
    const ai_token = Number((total_credits * 0.05).toFixed(4));

    const baseStorageTb = 124 + idx * 0.18 + Math.sin(idx) * 0.3;
    const stageTb = 1.8 + Math.sin(idx * 0.5) * 0.4;
    const failsafeTb = 2.4 + Math.cos(idx * 0.3) * 0.2;
    const tbToBytes = 1024 * 1024 * 1024 * 1024;
    const storage_bytes = Math.round(baseStorageTb * tbToBytes);
    const stage_bytes = Math.round(stageTb * tbToBytes);
    const failsafe_bytes = Math.round(failsafeTb * tbToBytes);

    return {
      usage_date: date,
      total_credits,
      com_sf,
      com_ai,
      ai_token,
      storage_bytes,
      stage_bytes,
      failsafe_bytes,
      total_storage_bytes: storage_bytes + stage_bytes + failsafe_bytes,
    };
  });
}

function calculateSummary(data: DailyUsagePatternItem[]): PatternAnalysisSummary {
  if (data.length === 0) {
    return {
      totalCredits: 0, avgDailyCredits: 0,
      maxDailyCredits: 0, maxDailyCreditDate: '',
      minDailyCredits: 0, minDailyCreditDate: '',
      latestStorageBytes: 0, avgStorageBytes: 0,
      maxStorageBytes: 0, maxStorageDate: '',
      minStorageBytes: 0, minStorageDate: '',
      totalDays: 0,
    };
  }

  let totalCredits = 0;
  let maxCredits = -Infinity, maxCreditDate = '';
  let minCredits = Infinity, minCreditDate = '';
  let totalStorage = 0;
  let maxStorage = -Infinity, maxStorageDate = '';
  let minStorage = Infinity, minStorageDate = '';

  for (const item of data) {
    totalCredits += item.total_credits;
    if (item.total_credits > maxCredits) { maxCredits = item.total_credits; maxCreditDate = item.usage_date; }
    if (item.total_credits < minCredits) { minCredits = item.total_credits; minCreditDate = item.usage_date; }
    const st = item.total_storage_bytes;
    totalStorage += st;
    if (st > maxStorage) { maxStorage = st; maxStorageDate = item.usage_date; }
    if (st < minStorage) { minStorage = st; minStorageDate = item.usage_date; }
  }

  const latest = data[data.length - 1];
  return {
    totalCredits: Number(totalCredits.toFixed(4)),
    avgDailyCredits: Number((totalCredits / data.length).toFixed(4)),
    maxDailyCredits: maxCredits === -Infinity ? 0 : maxCredits,
    maxDailyCreditDate: maxCreditDate,
    minDailyCredits: minCredits === Infinity ? 0 : minCredits,
    minDailyCreditDate: minCreditDate,
    latestStorageBytes: latest.total_storage_bytes,
    avgStorageBytes: Math.round(totalStorage / data.length),
    maxStorageBytes: maxStorage === -Infinity ? 0 : maxStorage,
    maxStorageDate,
    minStorageBytes: minStorage === Infinity ? 0 : minStorage,
    minStorageDate,
    totalDays: data.length,
  };
}

function convertToCsv(data: DailyUsagePatternItem[]): string {
  const header = "usage_date,total_credits,com_sf_credits,com_ai_credits,ai_token_credits,total_storage_bytes,active_storage_bytes,stage_bytes,failsafe_bytes\n";
  const rows = data.map((d) =>
    `${d.usage_date},${d.total_credits},${d.com_sf},${d.com_ai},${d.ai_token},${d.total_storage_bytes},${d.storage_bytes},${d.stage_bytes},${d.failsafe_bytes || 0}`
  ).join("\n");
  return header + rows;
}

async function requestClaudeAnalysis(
  apiKey: string,
  startDate: string,
  endDate: string,
  csvData: string,
  summary: PatternAnalysisSummary,
  logger: ClaudeLogger
): Promise<{ success: boolean; status: 'SUCCESS' | 'CONNECTION_ERROR'; analysis?: string; detail?: string }> {
  const startTime = Date.now();
  const csvBytes = Buffer.byteLength(csvData, "utf-8");

  const promptText = `당신은 클라우드 데이터 플랫폼(Snowflake) 및 FinOps 비용 최적화 전문 AI 컨설턴트입니다.
아래 CSV 데이터에는 [조회 기간] 동안의 Snowflake 일별 스토리지(Storage) 및 컴퓨트(Compute) 사용량 기록이 포함되어 있습니다.
이 일별 기록을 정밀 분석하여, 사용 패턴과 특이점을 진단하고 실무적인 개선 의견을 제시해 주십시오.

[조회 기간]
- 분석 대상 기간: ${startDate} ~ ${endDate} (총 ${summary.totalDays}일)

[주요 통계 요약]
- 총 컴퓨트 크레딧: ${formatCredits(summary.totalCredits, 2)} Credits
- 일평균 컴퓨트 크레딧: ${formatCredits(summary.avgDailyCredits, 2)} Credits
- 최대 일일 컴퓨트: ${formatCredits(summary.maxDailyCredits, 2)} Credits (발생일: ${summary.maxDailyCreditDate})
- 최소 일일 컴퓨트: ${formatCredits(summary.minDailyCredits, 2)} Credits (발생일: ${summary.minDailyCreditDate})
- 최신 스토리지 용량: ${formatBytes(summary.latestStorageBytes, 2)}
- 일평균 스토리지 용량: ${formatBytes(summary.avgStorageBytes, 2)}
- 최대 스토리지 용량: ${formatBytes(summary.maxStorageBytes, 2)} (발생일: ${summary.maxStorageDate})

[CSV 세부 데이터]
${csvData}

[분석 및 리포트 작성 요구사항]
다음 구조로 명확하고 전문적이며 읽기 쉽게 마크다운(Markdown) 포맷으로 작성해 주십시오:

### 1. 📊 사용 패턴 분석 (Usage Pattern Analysis)
- 해당 기간 동안 컴퓨트(Compute) 사용량의 주기성(예: 평일 vs 주말, 특정 요일 배치 워크로드) 분석
- 스토리지(Storage) 용량의 누적/증감 추세 및 스테이지(Stage) 데이터 변동 분석
- 스토리지 사용 증가와 컴퓨트 사용량 간의 상관관계 진단

### 2. ⚠️ 특이점 및 이상치 분석 (Anomalies & Notable Spikes)
- 사용량이 급격히 튀어 오른 날짜(스파이크 일자) 및 급감한 구간 명시
- 해당 이상치 발생 원인에 대한 전문적 추정

### 3. 💡 비용 및 자원 최적화 제안 (FinOps Recommendations)
- 웨어하우스(Compute) 최적화 제안
- 스토리지 및 스테이지 관리 제안
- 비용 절감 및 안정적 운영을 위한 구체적인 실행 권고

### 4. 📝 종합 평가 요약
- 현재 클라우드 자원 활용 상태에 대한 핵심 요약 및 조언 (2~3문장)
`;

  logger.log("claude에 요청할 csv데이터 생성", { csvBytes, rows: csvData.split('\n').length - 1 });
  logger.log("claude에 요청할 내용 (전체요청내용)", promptText);

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: promptText }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const analysisText = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!analysisText) {
      const detail = `응답에 텍스트 블록이 없습니다. stop_reason: ${response.stop_reason}`;
      logger.log("claude의 답변 (오류 내용, 메시지 등)", { stop_reason: response.stop_reason, content: response.content });
      return { success: false, status: "CONNECTION_ERROR", detail };
    }

    const durationMs = Date.now() - startTime;
    logger.log("claude의 답변 (오류시 오류 내용, 메시지 등)", analysisText);
    logger.log("claude답변 성공 기록", {
      model: response.model,
      stop_reason: response.stop_reason,
      durationMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      textLength: analysisText.length,
    });

    return { success: true, status: "SUCCESS", analysis: analysisText };
  } catch (err) {
    const error = err as Error;
    logger.log("claude의 답변 (오류 내용, 메시지 등)", {
      error: error.message,
      name: error.name,
    });
    return { success: false, status: "CONNECTION_ERROR", detail: error.message };
  }
}

export async function GET(request: NextRequest) {
  const logger = new ClaudeLogger();

  try {
    const searchParams = request.nextUrl.searchParams;
    const now = new Date();
    const defaultEnd = now.toISOString().substring(0, 10);
    const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      .toISOString().substring(0, 10);

    const startDate = searchParams.get("startDate") || defaultStart;
    const endDate = searchParams.get("endDate") || defaultEnd;

    logger.log(`분석 요청 접수 (조회 기간: ${startDate} ~ ${endDate})`);

    let dailyData: DailyUsagePatternItem[] = [];
    let source: "mysql" | "mock" = "mysql";
    let dbMessage: string | undefined;

    const host = process.env.MYSQL_HOST || "127.0.0.1";
    const port = Number(process.env.MYSQL_PORT) || 3306;
    const database = process.env.MYSQL_DATABASE || "sf_umon_db";
    const user = process.env.MYSQL_USER || "root";

    try {
      const [storageRes, computeRes] = await Promise.all([
        fetchStorageUsage({ startDate, endDate }),
        fetchComputeUsage({ startDate, endDate }),
      ]);

      const dateArray = getDateRangeArray(startDate, endDate);
      const storageMap = new Map<string, { storage: number; stage: number; failsafe: number }>();
      const computeMap = new Map<string, { total: number; sf: number; ai: number; token: number }>();

      for (const item of storageRes.currentData) {
        storageMap.set(item.usage_date, {
          storage: Number(item.storage_bytes) || 0,
          stage: Number(item.stage_bytes) || 0,
          failsafe: Number(item.failsafe_bytes) || 0,
        });
      }
      for (const item of computeRes.dailyData) {
        computeMap.set(item.usage_date, {
          total: Number(item.total_credits) || 0,
          sf: Number(item.com_sf) || 0,
          ai: Number(item.com_ai) || 0,
          token: Number(item.ai_token) || 0,
        });
      }

      dailyData = dateArray.map((date) => {
        const s = storageMap.get(date) || { storage: 0, stage: 0, failsafe: 0 };
        const c = computeMap.get(date) || { total: 0, sf: 0, ai: 0, token: 0 };
        return {
          usage_date: date,
          total_credits: c.total, com_sf: c.sf, com_ai: c.ai, ai_token: c.token,
          storage_bytes: s.storage, stage_bytes: s.stage, failsafe_bytes: s.failsafe,
          total_storage_bytes: s.storage + s.stage + s.failsafe,
        };
      });

      source = "mysql";
      dbMessage = "MySQL 실시간 데이터 연동 성공";
      logger.log("mysql접속 성공 (접속 정보)", { host, port, database, user, message: dbMessage });
      logger.log(`데이터 ${dailyData.length}건 가져옴`, {
        storageCount: storageRes.currentData.length,
        computeCount: computeRes.dailyData.length,
        range: `${startDate} ~ ${endDate}`,
      });
    } catch (dbErr) {
      dailyData = generateMockDailyPattern(startDate, endDate);
      source = "mock";
      dbMessage = `MySQL 연결 실패 (${(dbErr as Error).message})로 시뮬레이션 데이터를 제공합니다.`;
      logger.log("mysql접속 실패 (시뮬레이션 모드 전환)", { host, port, database, user, error: (dbErr as Error).message });
      logger.log(`데이터 ${dailyData.length}건 가져옴 (시뮬레이션)`, { range: `${startDate} ~ ${endDate}` });
    }

    const summary = calculateSummary(dailyData);
    const csvData = convertToCsv(dailyData);
    const csvBytes = Buffer.byteLength(csvData, "utf-8");
    logger.log(`claude에 요청할 csv데이터 ${csvBytes} bytes생성`);

    // API Key 확인
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (!apiKey) {
      logger.log("claude의 답변 (오류시 오류 내용, 메시지 등)", {
        error: "지정된 API키가 없다",
        detail: "환경 변수 ANTHROPIC_API_KEY가 .env.local에 설정되어 있지 않습니다.",
      });
      const response: PatternAnalysisResponse = {
        success: true, data: dailyData, summary,
        aiStatus: "NO_KEY", aiMessage: "지정된 API키가 없다",
        source, message: dbMessage, logFile: logger.getFileName(),
      };
      return NextResponse.json(response);
    }

    const aiResult = await requestClaudeAnalysis(apiKey, startDate, endDate, csvData, summary, logger);

    if (!aiResult.success) {
      const response: PatternAnalysisResponse = {
        success: true, data: dailyData, summary,
        aiStatus: "CONNECTION_ERROR", aiMessage: "접속 오류", aiDetail: aiResult.detail,
        source, message: dbMessage, logFile: logger.getFileName(),
      };
      return NextResponse.json(response);
    }

    const response: PatternAnalysisResponse = {
      success: true, data: dailyData, summary,
      aiStatus: "SUCCESS", aiAnalysis: aiResult.analysis,
      source, message: dbMessage, logFile: logger.getFileName(),
    };
    return NextResponse.json(response);
  } catch (error) {
    logger.log("서버 내부 처리 오류", (error as Error).message);
    return NextResponse.json(
      { success: false, error: "패턴 분석 요청 중 서버 오류가 발생했습니다.", message: (error as Error).message, logFile: logger.getFileName() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const defaultEnd = now.toISOString().substring(0, 10);
    const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const startDate = body.startDate || defaultStart;
    const endDate = body.endDate || defaultEnd;
    const url = new URL(request.url);
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);
    return GET(new NextRequest(url, { headers: request.headers }));
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "요청 본문 처리 중 오류가 발생했습니다.", message: (error as Error).message },
      { status: 500 }
    );
  }
}
