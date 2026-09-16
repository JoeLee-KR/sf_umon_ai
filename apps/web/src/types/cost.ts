export interface MonthlyUsageRawData {
  month: string; // YYYY-MM
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  
  // Storage
  storageAvgBytes: number;
  storageAvgTb: number;
  storageRecordCount: number;
  
  // Compute
  comSfCredits: number;
  comAiCredits: number;
  aiTokenCredits: number;
  totalCredits: number;
  computeRecordCount: number;
}

export interface MonthlyCostCalculation {
  month: string; // YYYY-MM
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  
  // Storage
  storageAvgTb: number;
  storageUnitPrice: number; // default $5.225 / TB
  storageCost: number;
  
  // COM_SF
  comSfCredits: number;
  comSfUnitPrice: number; // default $2.0 / credit
  comSfCost: number;
  
  // COM_AI
  comAiCredits: number;
  comAiUnitPrice: number; // default $2.0 / credit
  comAiCost: number;
  
  // AI_TOKEN
  aiTokenCredits: number;
  aiTokenCost: number; // custom manual input $
  
  // Total
  totalCost: number;
}

export interface MonthlyBillingRecord {
  id: number;
  billing_month: string; // YYYY-MM
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  
  storage_tb_avg: number;
  storage_unit_price: number;
  storage_cost: number;
  
  com_sf_credits: number;
  com_sf_unit_price: number;
  com_sf_cost: number;
  
  com_ai_credits: number;
  com_ai_unit_price: number;
  com_ai_cost: number;
  
  ai_token_credits: number;
  ai_token_cost: number;
  
  total_cost: number;
  status: 'ACTIVE' | 'INACTIVE';
  note?: string;
  confirmed_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyCostCalculateResponse {
  usage: MonthlyUsageRawData;
  defaults: {
    storageUnitPrice: number;
    comSfUnitPrice: number;
    comAiUnitPrice: number;
    aiTokenCost: number;
  };
  confirmedRecord?: MonthlyBillingRecord | null; // already confirmed record for this month if exists
  source: 'mysql' | 'mock';
  message?: string;
}

export interface MonthlyCostHistoryResponse {
  data: MonthlyBillingRecord[];
  totalMonths: number;
  source: 'mysql' | 'mock';
  message?: string;
}
