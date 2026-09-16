import mysql from 'mysql2/promise';
import { Employee, DepartmentStat } from '@/types/employee';
import { StorageUsage, StorageUsageResponse, StorageUsageSummary } from '@/types/storage';

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

    if (days && (days === 30 || days === 90)) {
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
