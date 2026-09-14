import mysql from 'mysql2/promise';
import { Employee, DepartmentStat } from '@/types/employee';

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
