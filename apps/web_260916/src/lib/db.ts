import mysql from 'mysql2/promise';
import { Employee, DepartmentStat } from '@/types/employee';
import { StorageUsage, StorageUsageResponse, StorageUsageSummary } from '@/types/storage';
import {
  ComputeRawUsage,
  ComputeDailyUsage,
  ComputeUsageResponse,
  ComputeUsageSummary,
  ComputeServiceGroup,
  MetricStats,
  COM_SF_SERVICES,
  COM_AI_SERVICES,
  AI_TOKEN_SERVICES,
} from '@/types/compute';

export function calculateDepartmentStats(employees: Employee[]): DepartmentStat[] {
  const map = new Map<string, { count: number; maxSalary: number; minSalary: number; totalSalary: number }>();

  for (const emp of employees) {
    const dept = emp.department || 'OTHER';
    const salary = Number(emp.salary) || 0;
    const existing = map.get(dept);

    if (!existing) {
      map.set(dept, {
        count: 1,
        maxSalary: salary,
        minSalary: salary,
        totalSalary: salary,
      });
    } else {
      existing.count += 1;
      existing.totalSalary += salary;
      if (salary > existing.maxSalary) existing.maxSalary = salary;
      if (salary < existing.minSalary) existing.minSalary = salary;
    }
  }

  const result: DepartmentStat[] = [];
  map.forEach((value, department) => {
    result.push({
      department,
      count: value.count,
      maxSalary: value.maxSalary,
      minSalary: value.minSalary,
      avgSalary: Math.round(value.totalSalary / value.count),
      totalSalary: value.totalSalary,
    });
  });

  // Sort by count desc, then department name
  return result.sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
}

export async function fetchEmployees(): Promise<{
  data: Employee[];
  stats: DepartmentStat[];
  source: 'mysql';
  message?: string;
  db_host?: string;
  db_name?: string;
  db_user?: string;
}> {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'sf_umon_db';

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 2000,
  });

  try {
    const [rows] = await connection.query(
      'SELECT id, emp_no, name, email, department, position, status, salary, DATE_FORMAT(hire_date, "%Y-%m-%d") as hire_date FROM employees ORDER BY id ASC'
    );

    if (!Array.isArray(rows)) {
      throw new Error('Invalid query response: Expected an array of rows.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees: Employee[] = rows.map((r: any) => ({
      id: Number(r.id),
      emp_no: String(r.emp_no),
      name: String(r.name),
      email: String(r.email),
      department: String(r.department),
      position: String(r.position),
      status: String(r.status),
      salary: Number(r.salary),
      hire_date: String(r.hire_date),
    }));

    return {
      data: employees,
      stats: calculateDepartmentStats(employees),
      source: 'mysql',
      message: 'MySQL sf_umon_db.employees 실시간 연결 성공',
      db_host: host,
      db_name: database,
      db_user: user,
    };
  } finally {
    await connection.end();
  }
}

export function calculateStorageSummary(data: StorageUsage[]): StorageUsageSummary {
  if (data.length === 0) {
    return {
      latestStorageBytes: 0,
      latestStageBytes: 0,
      latestTotalBytes: 0,
      avgStorageBytes: 0,
      avgStageBytes: 0,
      maxStorageBytes: 0,
      minStorageBytes: 0,
      totalRecords: 0,
    };
  }

  // Sorted by usage_date desc for raw data, so first element is latest
  const sortedDesc = [...data].sort((a, b) => b.usage_date.localeCompare(a.usage_date));
  const latest = sortedDesc[0];

  let totalStorage = 0;
  let totalStage = 0;
  let maxStorage = -Infinity;
  let minStorage = Infinity;

  for (const item of data) {
    const storage = Number(item.storage_bytes) || 0;
    const stage = Number(item.stage_bytes) || 0;
    totalStorage += storage;
    totalStage += stage;
    if (storage > maxStorage) maxStorage = storage;
    if (storage < minStorage) minStorage = storage;
  }

  return {
    latestStorageBytes: Number(latest.storage_bytes) || 0,
    latestStageBytes: Number(latest.stage_bytes) || 0,
    latestTotalBytes: (Number(latest.storage_bytes) || 0) + (Number(latest.stage_bytes) || 0),
    avgStorageBytes: Math.round(totalStorage / data.length),
    avgStageBytes: Math.round(totalStage / data.length),
    maxStorageBytes: maxStorage === -Infinity ? 0 : maxStorage,
    minStorageBytes: minStorage === Infinity ? 0 : minStorage,
    totalRecords: data.length,
  };
}

export async function fetchStorageUsage(options?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<StorageUsageResponse> {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'sf_umon_db';

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 2000,
  });

  try {
    let currentQuery = '';
    let currentParams: (string | number)[] = [];
    let previousQuery = '';
    let previousParams: (string | number)[] = [];

    const days = options?.days;
    const startDate = options?.startDate;
    const endDate = options?.endDate;

    if (days && days > 0) {
      // Fetch latest usage_date first or use CURDATE()
      // Current period: recent N days
      // Previous period: N days prior to current period
      currentQuery = `
        SELECT 
          pkid, 
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          storage_bytes,
          stage_bytes,
          failsafe_bytes,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_storage_usage
        WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY usage_date DESC
      `;
      currentParams = [days - 1];

      previousQuery = `
        SELECT 
          pkid, 
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          storage_bytes,
          stage_bytes,
          failsafe_bytes,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_storage_usage
        WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND usage_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY usage_date DESC
      `;
      previousParams = [days * 2 - 1, days - 1];
    } else if (startDate && endDate) {
      currentQuery = `
        SELECT 
          pkid, 
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          storage_bytes,
          stage_bytes,
          failsafe_bytes,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_storage_usage
        WHERE usage_date >= ? AND usage_date <= ?
        ORDER BY usage_date DESC
      `;
      currentParams = [startDate, endDate];
    } else {
      // Default: 30 days
      currentQuery = `
        SELECT 
          pkid, 
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          storage_bytes,
          stage_bytes,
          failsafe_bytes,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_storage_usage
        WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
        ORDER BY usage_date DESC
      `;
      currentParams = [];

      previousQuery = `
        SELECT 
          pkid, 
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          storage_bytes,
          stage_bytes,
          failsafe_bytes,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_storage_usage
        WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL 59 DAY)
          AND usage_date < DATE_SUB(CURDATE(), INTERVAL 29 DAY)
        ORDER BY usage_date DESC
      `;
      previousParams = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentRows, fields]: [any[], any] = await connection.query(currentQuery, currentParams);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let previousRows: any[] = [];
    if (previousQuery) {
      const [pRows] = await connection.query(previousQuery, previousParams);
      if (Array.isArray(pRows)) {
        previousRows = pRows;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRow = (r: any): StorageUsage => {
      const item: StorageUsage = {
        usage_date: String(r.usage_date),
        storage_bytes: Number(r.storage_bytes) || 0,
        stage_bytes: Number(r.stage_bytes) || 0,
      };
      if (r.pkid !== undefined && r.pkid !== null) item.pkid = Number(r.pkid);
      if (r.failsafe_bytes !== undefined && r.failsafe_bytes !== null) item.failsafe_bytes = Number(r.failsafe_bytes);
      if (r.up_dt) item.up_dt = String(r.up_dt);
      return item;
    };

    const currentData = Array.isArray(currentRows) ? currentRows.map(mapRow) : [];
    const previousData = previousRows.map(mapRow);

    // Get column names from query fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns = Array.isArray(fields) ? fields.map((f: any) => f.name) : ['pkid', 'usage_date', 'storage_bytes', 'stage_bytes', 'failsafe_bytes', 'up_dt'];

    return {
      currentData,
      previousData: previousData.length > 0 ? previousData : undefined,
      columns,
      summary: calculateStorageSummary(currentData),
      source: 'mysql',
      message: 'MySQL sf_umon_db.sf_storage_usage 실시간 연결 성공',
      db_host: host,
      db_name: database,
      db_user: user,
    };
  } finally {
    await connection.end();
  }
}

const COM_SF_SET = new Set<string>(COM_SF_SERVICES);
const COM_AI_SET = new Set<string>([
  ...COM_AI_SERVICES,
  'SNOWFLAKE_CODE_SNOWSIGHT',
]);
const AI_TOKEN_SET = new Set<string>(AI_TOKEN_SERVICES);

export function classifyServiceType(serviceType: string): ComputeServiceGroup {
  const norm = (serviceType || '').trim().toUpperCase();
  if (COM_SF_SET.has(norm)) return 'COM_SF';
  if (COM_AI_SET.has(norm)) return 'COM_AI';
  if (AI_TOKEN_SET.has(norm)) return 'AI_TOKEN';
  return 'COM_SF';
}

export function aggregateComputeDaily(rawData: ComputeRawUsage[]): ComputeDailyUsage[] {
  const map = new Map<string, { com_sf: number; com_ai: number; ai_token: number }>();

  for (const item of rawData) {
    const date = item.usage_date;
    if (!date) continue;
    const billed = Number(item.credits_billed) || 0;
    const group = item.service_group || classifyServiceType(item.service_type);

    if (!map.has(date)) {
      map.set(date, { com_sf: 0, com_ai: 0, ai_token: 0 });
    }

    const current = map.get(date)!;
    if (group === 'COM_SF') {
      current.com_sf += billed;
    } else if (group === 'COM_AI') {
      current.com_ai += billed;
    } else if (group === 'AI_TOKEN') {
      current.ai_token += billed;
    } else {
      current.com_sf += billed;
    }
  }

  const result: ComputeDailyUsage[] = [];
  map.forEach((val, usage_date) => {
    result.push({
      usage_date,
      com_sf: Number(val.com_sf.toFixed(6)),
      com_ai: Number(val.com_ai.toFixed(6)),
      ai_token: Number(val.ai_token.toFixed(6)),
      total_credits: Number((val.com_sf + val.com_ai + val.ai_token).toFixed(6)),
    });
  });

  // Sort by date asc for charting
  return result.sort((a, b) => a.usage_date.localeCompare(b.usage_date));
}

export function calculateComputeSummary(
  dailyData: ComputeDailyUsage[],
  rawData: ComputeRawUsage[]
): ComputeUsageSummary {
  const emptyStats = (): MetricStats => ({
    latest: 0,
    max: 0,
    avg: 0,
    min: 0,
    total: 0,
  });

  if (dailyData.length === 0) {
    return {
      comSf: emptyStats(),
      comAi: emptyStats(),
      aiToken: emptyStats(),
      totalCreditsStat: emptyStats(),
      latestComSf: 0,
      latestComAi: 0,
      latestAiToken: 0,
      latestTotalCredits: 0,
      totalComSf: 0,
      totalComAi: 0,
      totalAiToken: 0,
      totalCredits: 0,
      avgDailyCredits: 0,
      maxDailyCredits: 0,
      minDailyCredits: 0,
      totalRecords: 0,
    };
  }

  // dailyData is sorted asc, so last item is latest
  const latest = dailyData[dailyData.length - 1];
  const count = dailyData.length;

  let totalComSf = 0;
  let totalComAi = 0;
  let totalAiToken = 0;
  let totalCredits = 0;

  let maxComSf = -Infinity;
  let minComSf = Infinity;

  let maxComAi = -Infinity;
  let minComAi = Infinity;

  let maxAiToken = -Infinity;
  let minAiToken = Infinity;

  let maxTotalCredits = -Infinity;
  let minTotalCredits = Infinity;

  for (const item of dailyData) {
    totalComSf += item.com_sf;
    totalComAi += item.com_ai;
    totalAiToken += item.ai_token;
    totalCredits += item.total_credits;

    if (item.com_sf > maxComSf) maxComSf = item.com_sf;
    if (item.com_sf < minComSf) minComSf = item.com_sf;

    if (item.com_ai > maxComAi) maxComAi = item.com_ai;
    if (item.com_ai < minComAi) minComAi = item.com_ai;

    if (item.ai_token > maxAiToken) maxAiToken = item.ai_token;
    if (item.ai_token < minAiToken) minAiToken = item.ai_token;

    if (item.total_credits > maxTotalCredits) maxTotalCredits = item.total_credits;
    if (item.total_credits < minTotalCredits) minTotalCredits = item.total_credits;
  }

  const comSfStats: MetricStats = {
    latest: Number(latest.com_sf.toFixed(6)),
    max: maxComSf === -Infinity ? 0 : Number(maxComSf.toFixed(6)),
    avg: Number((totalComSf / count).toFixed(6)),
    min: minComSf === Infinity ? 0 : Number(minComSf.toFixed(6)),
    total: Number(totalComSf.toFixed(6)),
  };

  const comAiStats: MetricStats = {
    latest: Number(latest.com_ai.toFixed(6)),
    max: maxComAi === -Infinity ? 0 : Number(maxComAi.toFixed(6)),
    avg: Number((totalComAi / count).toFixed(6)),
    min: minComAi === Infinity ? 0 : Number(minComAi.toFixed(6)),
    total: Number(totalComAi.toFixed(6)),
  };

  const aiTokenStats: MetricStats = {
    latest: Number(latest.ai_token.toFixed(6)),
    max: maxAiToken === -Infinity ? 0 : Number(maxAiToken.toFixed(6)),
    avg: Number((totalAiToken / count).toFixed(6)),
    min: minAiToken === Infinity ? 0 : Number(minAiToken.toFixed(6)),
    total: Number(totalAiToken.toFixed(6)),
  };

  const totalCreditsStats: MetricStats = {
    latest: Number(latest.total_credits.toFixed(6)),
    max: maxTotalCredits === -Infinity ? 0 : Number(maxTotalCredits.toFixed(6)),
    avg: Number((totalCredits / count).toFixed(6)),
    min: minTotalCredits === Infinity ? 0 : Number(minTotalCredits.toFixed(6)),
    total: Number(totalCredits.toFixed(6)),
  };

  return {
    comSf: comSfStats,
    comAi: comAiStats,
    aiToken: aiTokenStats,
    totalCreditsStat: totalCreditsStats,

    latestComSf: comSfStats.latest,
    latestComAi: comAiStats.latest,
    latestAiToken: aiTokenStats.latest,
    latestTotalCredits: totalCreditsStats.latest,
    totalComSf: comSfStats.total,
    totalComAi: comAiStats.total,
    totalAiToken: aiTokenStats.total,
    totalCredits: totalCreditsStats.total,
    avgDailyCredits: totalCreditsStats.avg,
    maxDailyCredits: totalCreditsStats.max,
    minDailyCredits: totalCreditsStats.min,
    totalRecords: rawData.length,
  };
}

export async function fetchComputeUsage(options?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ComputeUsageResponse> {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'sf_umon_db';

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 2000,
  });

  try {
    let query = '';
    let params: (string | number)[] = [];

    const days = options?.days;
    const startDate = options?.startDate;
    const endDate = options?.endDate;

    if (days && days > 0) {
      query = `
        SELECT 
          pkid,
          service_type,
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          credits_used_compute,
          credits_used_cloud_services,
          credits_used,
          credits_adjustment_cloud_services,
          credits_billed,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_metering_daily_history
        WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY usage_date DESC, pkid DESC
      `;
      params = [days - 1];
    } else if (startDate && endDate) {
      query = `
        SELECT 
          pkid,
          service_type,
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          credits_used_compute,
          credits_used_cloud_services,
          credits_used,
          credits_adjustment_cloud_services,
          credits_billed,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_metering_daily_history
        WHERE usage_date >= ? AND usage_date <= ?
        ORDER BY usage_date DESC, pkid DESC
      `;
      params = [startDate, endDate];
    } else {
      query = `
        SELECT 
          pkid,
          service_type,
          DATE_FORMAT(usage_date, '%Y-%m-%d') as usage_date,
          credits_used_compute,
          credits_used_cloud_services,
          credits_used,
          credits_adjustment_cloud_services,
          credits_billed,
          DATE_FORMAT(up_dt, '%Y-%m-%d %H:%i:%s') as up_dt
        FROM sf_metering_daily_history
        WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
        ORDER BY usage_date DESC, pkid DESC
      `;
      params = [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows, fields]: [any[], any] = await connection.query(query, params);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRow = (r: any): ComputeRawUsage => {
      const st = String(r.service_type || '');
      const item: ComputeRawUsage = {
        service_type: st,
        usage_date: String(r.usage_date),
        credits_used_compute: Number(r.credits_used_compute) || 0,
        credits_used_cloud_services: Number(r.credits_used_cloud_services) || 0,
        credits_used: Number(r.credits_used) || 0,
        credits_adjustment_cloud_services: Number(r.credits_adjustment_cloud_services) || 0,
        credits_billed: Number(r.credits_billed) || 0,
        service_group: classifyServiceType(st),
      };
      if (r.pkid !== undefined && r.pkid !== null) item.pkid = Number(r.pkid);
      if (r.up_dt) item.up_dt = String(r.up_dt);
      return item;
    };

    const currentData = Array.isArray(rows) ? rows.map(mapRow) : [];
    const dailyData = aggregateComputeDaily(currentData);
    const summary = calculateComputeSummary(dailyData, currentData);

    // Columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns = Array.isArray(fields)
      ? fields.map((f: any) => f.name)
      : [
          'pkid',
          'service_type',
          'usage_date',
          'credits_used_compute',
          'credits_used_cloud_services',
          'credits_used',
          'credits_adjustment_cloud_services',
          'credits_billed',
          'up_dt',
        ];

    return {
      currentData,
      dailyData,
      columns,
      summary,
      source: 'mysql',
      message: 'MySQL sf_umon_db.sf_metering_daily_history 실시간 연결 성공',
      db_host: host,
      db_name: database,
      db_user: user,
    };
  } finally {
    await connection.end();
  }
}
