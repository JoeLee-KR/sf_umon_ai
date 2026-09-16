export type ComputeServiceGroup = 'COM_SF' | 'COM_AI' | 'AI_TOKEN' | 'OTHER';

export const COM_SF_SERVICES = [
  'AI_SERVICES',
  'AUTO_CLUSTERING',
  'COPY_FILES',
  'PIPE',
  'SNOWPARK_CONTAINER_SERVICES',
  'TELEMETRY_DATA_INGEST',
  'TRUST_CENTER',
  'WAREHOUSE_METERING',
  'CLOUD_SERVICES',
] as const;

export const COM_AI_SERVICES = [
  'CORTEX_AGENTS',
  'SNOWFLAKE_INTELLIGENCE',
  'SNOWFLAKE_COWORK',
  'CORTEX_CODE_SNOWSIGHT',
  'SNOWFLAKE_COCO_SNOWSIGHT',
  'AI_FUNCTIONS',
  'CORTEX_CODE_DESKTOP',
  'CORTEX_SEARCH',
] as const;

export const AI_TOKEN_SERVICES = [
  'AI_INFERENCE',
] as const;

export interface ComputeRawUsage {
  pkid?: number;
  service_type: string;
  usage_date: string; // YYYY-MM-DD
  credits_used_compute: number;
  credits_used_cloud_services: number;
  credits_used: number;
  credits_adjustment_cloud_services: number;
  credits_billed: number;
  service_group: ComputeServiceGroup;
  up_dt?: string;
  [key: string]: unknown;
}

export interface ComputeDailyUsage {
  usage_date: string; // YYYY-MM-DD
  com_sf: number;
  com_ai: number;
  ai_token: number;
  total_credits: number;
}

export interface MetricStats {
  latest: number;
  max: number;
  avg: number;
  min: number;
  total: number;
}

export interface ComputeUsageSummary {
  // 통계 모음
  comSf: MetricStats;
  comAi: MetricStats;
  aiToken: MetricStats;
  totalCreditsStat: MetricStats;

  // 기존 호환용 필드
  latestComSf: number;
  latestComAi: number;
  latestAiToken: number;
  latestTotalCredits: number;
  totalComSf: number;
  totalComAi: number;
  totalAiToken: number;
  totalCredits: number;
  avgDailyCredits: number;
  maxDailyCredits: number;
  minDailyCredits: number;
  totalRecords: number;
}

export interface ComputeUsageResponse {
  currentData: ComputeRawUsage[];
  dailyData: ComputeDailyUsage[];
  columns: string[];
  summary: ComputeUsageSummary;
  source: 'mysql' | 'mock';
  message?: string;
  db_host?: string;
  db_name?: string;
  db_user?: string;
  error?: string;
}
