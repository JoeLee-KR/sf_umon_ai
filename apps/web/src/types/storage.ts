export interface StorageUsage {
  pkid?: number;
  usage_date: string; // YYYY-MM-DD
  storage_bytes: number;
  stage_bytes: number;
  failsafe_bytes?: number;
  hybrid_table_storage_bytes?: number;
  archive_storage_cool_bytes?: number;
  archive_storage_cold_bytes?: number;
  archive_storage_retrieval_temp_bytes?: number;
  up_dt?: string;
  [key: string]: unknown;
}

export interface StorageUsageSummary {
  latestStorageBytes: number;
  latestStageBytes: number;
  latestTotalBytes: number;
  avgStorageBytes: number;
  avgStageBytes: number;
  maxStorageBytes: number;
  minStorageBytes: number;
  totalRecords: number;
}

export interface StorageUsageResponse {
  currentData: StorageUsage[];
  previousData?: StorageUsage[];
  columns: string[];
  summary: StorageUsageSummary;
  source: 'mysql' | 'mock';
  message?: string;
  db_host?: string;
  db_name?: string;
  db_user?: string;
  error?: string;
}
