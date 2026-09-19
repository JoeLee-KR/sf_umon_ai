export interface DailyUsagePatternItem {
  usage_date: string; // YYYY-MM-DD
  // Compute
  total_credits: number;
  com_sf: number;
  com_ai: number;
  ai_token: number;
  // Storage
  storage_bytes: number;
  stage_bytes: number;
  failsafe_bytes: number;
  total_storage_bytes: number;
}

export interface PatternAnalysisSummary {
  totalCredits: number;
  avgDailyCredits: number;
  maxDailyCredits: number;
  maxDailyCreditDate: string;
  minDailyCredits: number;
  minDailyCreditDate: string;

  latestStorageBytes: number;
  avgStorageBytes: number;
  maxStorageBytes: number;
  maxStorageDate: string;
  minStorageBytes: number;
  minStorageDate: string;

  totalDays: number;
}

export type AiStatusType = 'IDLE' | 'SUCCESS' | 'NO_KEY' | 'CONNECTION_ERROR';

export interface PatternAnalysisResponse {
  success: boolean;
  data: DailyUsagePatternItem[];
  summary: PatternAnalysisSummary;
  aiStatus: AiStatusType;
  aiMessage?: string; // '지정된 API키가 없다' | '접속 오류' | 기타
  aiDetail?: string;  // 구체적인 오류 상세 (있는 경우)
  aiAnalysis?: string; // Gemini AI 마크다운 분석 의견
  error?: string;
  source: 'mysql' | 'mock';
  message?: string;
  db_host?: string;
  db_name?: string;
  db_user?: string;
  logFile?: string;
}
