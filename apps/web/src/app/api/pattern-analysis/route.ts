import { NextRequest, NextResponse } from "next/server";
import { fetchStorageUsage, fetchComputeUsage } from "@/lib/db";
import {
  DailyUsagePatternItem,
  PatternAnalysisSummary,
  PatternAnalysisResponse,
} from "@/types/pattern";
import { formatBytes, formatCredits } from "@/lib/formatters";
import { AgyLogger } from "@/lib/agy-logger";

export const dynamic = "force-dynamic";

/**
 * 지정된 날짜 범위의 날짜 배열 (YYYY-MM-DD) 생성
 */
function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return dates;
  }

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().substring(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * DB 연결 불가 시 로컬 테스트/시뮬레이션용 데이터 생성기
 */
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
    const total_credits = Number(
      (isSpikeDay ? baseCredits * 2.8 : baseCredits).toFixed(4)
    );
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
    const total_storage_bytes = storage_bytes + stage_bytes + failsafe_bytes;

    return {
      usage_date: date,
      total_credits,
      com_sf,
      com_ai,
      ai_token,
      storage_bytes,
      stage_bytes,
      failsafe_bytes,
      total_storage_bytes,
    };
  });
}

/**
 * 일별 데이터를 집계하여 통계 요약 산출
 */
function calculateSummary(data: DailyUsagePatternItem[]): PatternAnalysisSummary {
  if (data.length === 0) {
    return {
      totalCredits: 0,
      avgDailyCredits: 0,
      maxDailyCredits: 0,
      maxDailyCreditDate: '',
      minDailyCredits: 0,
      minDailyCreditDate: '',
      latestStorageBytes: 0,
      avgStorageBytes: 0,
      maxStorageBytes: 0,
      maxStorageDate: '',
      minStorageBytes: 0,
      minStorageDate: '',
      totalDays: 0,
    };
  }

  let totalCredits = 0;
  let maxCredits = -Infinity;
  let maxCreditDate = '';
  let minCredits = Infinity;
  let minCreditDate = '';

  let totalStorage = 0;
  let maxStorage = -Infinity;
  let maxStorageDate = '';
  let minStorage = Infinity;
  let minStorageDate = '';

  for (const item of data) {
    totalCredits += item.total_credits;
    if (item.total_credits > maxCredits) {
      maxCredits = item.total_credits;
      maxCreditDate = item.usage_date;
    }
    if (item.total_credits < minCredits) {
      minCredits = item.total_credits;
      minCreditDate = item.usage_date;
    }

    const storageTotal = item.total_storage_bytes;
    totalStorage += storageTotal;
    if (storageTotal > maxStorage) {
      maxStorage = storageTotal;
      maxStorageDate = item.usage_date;
    }
    if (storageTotal < minStorage) {
      minStorage = storageTotal;
      minStorageDate = item.usage_date;
    }
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
    maxStorageDate: maxStorageDate,
    minStorageBytes: minStorage === Infinity ? 0 : minStorage,
    minStorageDate: minStorageDate,

    totalDays: data.length,
  };
}

/**
 * 일별 데이터를 CSV 문자열로 변환
 */
function convertToCsv(data: DailyUsagePatternItem[]): string {
  const header = "usage_date,total_credits,com_sf_credits,com_ai_credits,ai_token_credits,total_storage_bytes,active_storage_bytes,stage_bytes,failsafe_bytes\n";
  const rows = data.map((d) =>
    `${d.usage_date},${d.total_credits},${d.com_sf},${d.com_ai},${d.ai_token},${d.total_storage_bytes},${d.storage_bytes},${d.stage_bytes},${d.failsafe_bytes || 0}`
  ).join("\n");
  return header + rows;
}

/**
 * Gemini File API를 통해 대용량 CSV 파일 업로드
 */
async function uploadCsvToFileApi(
  apiKey: string,
  csvData: string,
  displayName: string
): Promise<{ fileUri: string; fileName: string }> {
  const blob = Buffer.from(csvData, "utf-8");

  // 1. Resumable Upload 세션 개시
  const startRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": blob.length.toString(),
      "X-Goog-Upload-Header-Content-Type": "text/csv",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: { display_name: displayName },
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`File API 세션 생성 실패 (HTTP ${startRes.status}): ${errText}`);
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new Error("File API 응답 헤더에 x-goog-upload-url이 없습니다.");
  }

  // 2. CSV 바이너리 업로드 및 파이널라이즈
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": blob.length.toString(),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`File API 데이터 업로드 실패 (HTTP ${uploadRes.status}): ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileJson: any = await uploadRes.json();
  const fileUri = fileJson?.file?.uri;
  const fileName = fileJson?.file?.name;

  if (!fileUri || !fileName) {
    throw new Error("File API 응답에 file.uri 또는 file.name이 없습니다.");
  }

  return { fileUri, fileName };
}

/**
 * Gemini File API에 업로드된 임시 파일 삭제
 */
async function deleteUploadedFile(apiKey: string, fileName: string): Promise<void> {
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Gemini File cleanup error:", err);
  }
}

/**
 * 지연 유틸리티 (ms 대기)
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 모델이 Thinking 기능을 지원하는지 판별
 */
function isThinkingSupported(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  // antigravity 계열이나 gemma 계열, 구형 모델은 thinking 미지원
  if (lower.includes("antigravity") || lower.includes("gemma") || lower.includes("pro-latest")) {
    return false;
  }
  return true;
}

/**
 * Gemini / Antigravity AI에 사용 패턴 및 특이점 분석 요청
 */
async function requestGeminiAnalysis(
  apiKey: string,
  startDate: string,
  endDate: string,
  csvData: string,
  summary: PatternAnalysisSummary,
  logger: AgyLogger
): Promise<{ success: boolean; status: 'SUCCESS' | 'CONNECTION_ERROR'; analysis?: string; detail?: string }> {
  const startTime = Date.now();
  const csvBytes = Buffer.byteLength(csvData, "utf-8");

  const promptInstructions = `당신은 클라우드 데이터 플랫폼(Snowflake) 및 FinOps 비용 최적화 전문 AI 컨설턴트입니다.
첨부된 CSV 파일(또는 데이터 테이블)에는 [조회 기간] 동안의 Snowflake 일별 스토리지(Storage) 및 컴퓨트(Compute) 사용량 기록이 포함되어 있습니다.
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
- 해당 이상치 발생 원인에 대한 전문적 추정 (대용량 ETL 적재, 롱러닝 쿼리, AI 모델 집중 추론, 스테이지 미정리 등)

### 3. 💡 비용 및 자원 최적화 제안 (FinOps Recommendations)
- 웨어하우스(Compute) 최적화 제안 (Auto-suspend 타임아웃, 클러스터링 및 크기 적정성)
- 스토리지 및 스테이지 관리 제안 (타임트래블 보존주기, 미사용 임시 스테이지 정리 방안)
- 비용 절감 및 안정적 운영을 위한 구체적인 실행 권고

### 4. 📝 종합 평가 요약
- 현재 클라우드 자원 활용 상태에 대한 핵심 요약 및 조언 (2~3문장)
`;

  // 데이터 크기 기반 전송 방식 분기:
  // 10KB (약 100일 분량) 이상일 때는 File API 업로드, 10KB 미만은 인라인 직접 전송으로 통신 왕복 최적화
  const USE_FILE_API_THRESHOLD = 10 * 1024; // 10KB
  const shouldUseFileApi = csvBytes >= USE_FILE_API_THRESHOLD;

  let fileInfo: { fileUri: string; fileName: string } | null = null;

  if (shouldUseFileApi) {
    const fileName = `sf_usage_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.csv`;
    try {
      fileInfo = await uploadCsvToFileApi(apiKey, csvData, fileName);
      logger.log(`Gemini File API 업로드 완료 (대용량 모드: ${csvBytes} bytes)`, {
        fileName: fileInfo.fileName,
        fileUri: fileInfo.fileUri,
        csvBytes,
      });
    } catch (fileErr) {
      logger.log(`Gemini File API 업로드 실패 (인라인 본문 방식으로 폴백)`, (fileErr as Error).message);
    }
  } else {
    logger.log(`데이터 전송 모드: 인라인 직접 전송 (${csvBytes} bytes, 통신 왕복 최적화)`);
  }

  const systemInstruction = `당신은 Snowflake FinOps 분석가입니다.
인사말·서론·맺음말 없이 아래 4개 섹션만 마크다운으로 작성하세요.
각 섹션은 불릿 3~5개 이내로 작성하세요.
전체 응답은 반드시 한국어 2000자 이내로 완결하세요.`;

  // agy에 요청할 내용 전체 로깅
  logger.log("agy에 요청할 내용 (전체요청내용)", {
    prompt: promptInstructions,
    transferMode: fileInfo ? "File API" : "Inline CSV",
    fileUri: fileInfo?.fileUri,
    csvBytes,
    thinkingBudgetBlocked: true,
    maxOutputTokens: 3200,
  });

  // 지원 후보 모델 목록 (Flash 계열 우선, 503 과부하 대비 Pro 백업, 최후 Antigravity)
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "antigravity-preview-09-2026",
  ];

  try {
    for (const model of candidateModels) {
      // 503(일시적 과부하) 발생 시 지수 백오프를 통해 최대 2회 재시도
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parts: any[] = [{ text: promptInstructions }];
          if (fileInfo) {
            parts.push({
              fileData: {
                mimeType: "text/csv",
                fileUri: fileInfo.fileUri,
              },
            });
          } else {
            parts.push({
              text: `\n[CSV 세부 데이터]\n${csvData}`,
            });
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const generationConfig: any = {
            temperature: 0.2,
            maxOutputTokens: 3200,
          };

          // 모델이 Thinking 기능을 지원하는 경우에만 thinkingBudget: 0 주입 (미지원 모델 400 방지)
          if (isThinkingSupported(model)) {
            generationConfig.thinkingConfig = {
              thinkingBudget: 0,
            };
          }

          const requestBody: Record<string, unknown> = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts }],
            generationConfig,
          };

          let res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          // 만약 "Thinking is not enabled" 에러(400)가 반환되면, thinkingConfig를 제거하고 즉시 1회 재요청
          if (!res.ok && res.status === 400) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const badReqJson: any = await res.json().catch(() => ({}));
            const errMsg = badReqJson?.error?.message || "";
            if (errMsg.includes("Thinking is not enabled")) {
              logger.log(`모델 ${model}는 Thinking 미지원 확인 (400), thinkingConfig 제거 후 즉시 재시도`, {
                model,
                error: errMsg,
              });
              delete generationConfig.thinkingConfig;
              res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestBody, generationConfig }),
              });
            }
          }

          if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const json: any = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const candidateParts = json?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(candidateParts)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? candidateParts.map((p: any) => p?.text || "").filter(Boolean).join("\n")
              : "";

            if (text) {
              const durationMs = Date.now() - startTime;
              logger.log("agy의 답변 (성공 전문)", text);
              logger.log("agy답변 성공 기록", {
                model,
                durationMs,
                attempt,
                textLength: text.length,
                usageMetadata: json?.usageMetadata,
              });
              return { success: true, status: "SUCCESS", analysis: text };
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errJson: any = await res.json().catch(() => ({}));
          const msg = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;

          // 404인 경우 해당 모델은 사용 불가하므로 재시도 없이 다음 모델로 이동
          if (res.status === 404) {
            logger.log(`모델 ${model} 미지원 (HTTP 404), 다음 후보 모델로 이동`);
            break;
          }

          // 503(일시적 과부하) 또는 429(속도 제한)인 경우 지수 백오프 대기 후 재시도
          if (res.status === 503 || res.status === 429) {
            if (attempt === 1) {
              const backoffMs = 1500;
              logger.log(`모델 ${model} 일시적 과부하 (HTTP ${res.status}), ${backoffMs}ms 대기 후 동일 모델 재시도 (1/2)...`, {
                model,
                status: res.status,
                error: msg,
              });
              await delay(backoffMs);
              continue; // 2번째 attempt 실행
            } else {
              logger.log(`모델 ${model} 2회 연속 과부하 (HTTP ${res.status}), 다음 후보 모델로 전환`);
              break; // 다음 모델로 이동
            }
          }

          // 그 외 클라이언트/인증 오류 (401, 403 등)
          logger.log("agy의 답변 (오류 내용, 메시지 등)", {
            model,
            status: res.status,
            statusText: res.statusText,
            error: msg,
            rawResponse: errJson,
          });

          return {
            success: false,
            status: "CONNECTION_ERROR",
            detail: msg,
          };
        } catch (fetchErr) {
          logger.log(`모델 ${model} 네트워크 통신 오류 (시도 ${attempt}/2)`, {
            model,
            error: (fetchErr as Error).message,
          });
          if (attempt === 1) {
            await delay(1000);
            continue;
          }
          break;
        }
      }
    }

    return {
      success: false,
      status: "CONNECTION_ERROR",
      detail: "사용 가능한 Gemini AI 모델에 접속할 수 없거나 일시적으로 모든 모델의 트래픽이 집중되었습니다. 잠시 후 다시 시도해주세요.",
    };
  } finally {
    // 업로드된 임시 파일 리소스 정리
    if (fileInfo?.fileName) {
      await deleteUploadedFile(apiKey, fileInfo.fileName);
      logger.log(`Gemini File API 임시 파일 정리 완료`, { fileName: fileInfo.fileName });
    }
  }
}

export async function GET(request: NextRequest) {
  const logger = new AgyLogger();

  try {
    const searchParams = request.nextUrl.searchParams;
    const now = new Date();
    const defaultEnd = now.toISOString().substring(0, 10);
    const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);

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
      // 1. 실시간 DB 데이터 조회 시도
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
          total_credits: c.total,
          com_sf: c.sf,
          com_ai: c.ai,
          ai_token: c.token,
          storage_bytes: s.storage,
          stage_bytes: s.stage,
          failsafe_bytes: s.failsafe,
          total_storage_bytes: s.storage + s.stage + s.failsafe,
        };
      });

      source = "mysql";
      dbMessage = "MySQL 실시간 데이터 연동 성공";

      // = mysql접속 성공 (접속 정보)
      logger.log(`mysql접속 성공 (접속 정보)`, {
        host,
        port,
        database,
        user,
        message: dbMessage,
      });

      // = 데이터 x건 가져옴
      logger.log(`데이터 ${dailyData.length}건 가져옴`, {
        storageCount: storageRes.currentData.length,
        computeCount: computeRes.dailyData.length,
        dailyRecords: dailyData.length,
        range: `${startDate} ~ ${endDate}`,
      });
    } catch (dbErr) {
      // DB 연결 실패 시 시뮬레이션 데이터로 대체
      dailyData = generateMockDailyPattern(startDate, endDate);
      source = "mock";
      dbMessage = `MySQL 연결 실패 (${(dbErr as Error).message})로 시뮬레이션 데이터를 제공합니다.`;

      logger.log(`mysql접속 실패 (오류 및 시뮬레이션 모드 전환)`, {
        host,
        port,
        database,
        user,
        error: (dbErr as Error).message,
      });

      // = 데이터 x건 가져옴 (시뮬레이션)
      logger.log(`데이터 ${dailyData.length}건 가져옴 (시뮬레이션)`, {
        dailyRecords: dailyData.length,
        range: `${startDate} ~ ${endDate}`,
      });
    }

    const summary = calculateSummary(dailyData);

    // = agy에 요청할 csv데이터 x bytes생성
    const csvData = convertToCsv(dailyData);
    const csvBytes = Buffer.byteLength(csvData, "utf-8");
    logger.log(`agy에 요청할 csv데이터 ${csvBytes} bytes생성`, csvData);

    // 2. Antigravity API Key 검사 및 AI 분석 요청
    const apiKey = (process.env.AGY_API_KEY || process.env.AGY_KEY || process.env.GEMINI_API_KEY)?.trim();

    // 조건 1: Key가 없으면 "지정된 API키가 없다"고 표시
    if (!apiKey) {
      logger.log("agy의 답변 (오류시 오류 내용, 메시지 등)", {
        error: "지정된 API키가 없다",
        detail: "환경 변수 AGY_API_KEY가 .env.local에 설정되어 있지 않습니다.",
      });

      const response: PatternAnalysisResponse = {
        success: true,
        data: dailyData,
        summary,
        aiStatus: "NO_KEY",
        aiMessage: "지정된 API키가 없다",
        source,
        message: dbMessage,
        logFile: logger.getFileName(),
      };
      return NextResponse.json(response);
    }

    // 조건 2: Antigravity 접속 및 분석 요청 (File API/인라인 분기 + Thinking 제어 + 백오프)
    const aiResult = await requestGeminiAnalysis(apiKey, startDate, endDate, csvData, summary, logger);

    // 조건 3: 접속이 되지 않으면 "접속 오류"라고 표시
    if (!aiResult.success) {
      const response: PatternAnalysisResponse = {
        success: true,
        data: dailyData,
        summary,
        aiStatus: "CONNECTION_ERROR",
        aiMessage: "접속 오류",
        aiDetail: aiResult.detail,
        source,
        message: dbMessage,
        logFile: logger.getFileName(),
      };
      return NextResponse.json(response);
    }

    // 성공 시 분석 의견 반환
    const response: PatternAnalysisResponse = {
      success: true,
      data: dailyData,
      summary,
      aiStatus: "SUCCESS",
      aiAnalysis: aiResult.analysis,
      source,
      message: dbMessage,
      logFile: logger.getFileName(),
    };
    return NextResponse.json(response);
  } catch (error) {
    logger.log("서버 내부 처리 오류", (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: "패턴 분석 요청 중 서버 오류가 발생했습니다.",
        message: (error as Error).message,
        logFile: logger.getFileName(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const defaultEnd = now.toISOString().substring(0, 10);
    const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);

    const startDate = body.startDate || defaultStart;
    const endDate = body.endDate || defaultEnd;

    const url = new URL(request.url);
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);

    const newReq = new NextRequest(url, { headers: request.headers });
    return GET(newReq);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "요청 본문 처리 중 오류가 발생했습니다.",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
