export interface Employee {
  id: number;
  emp_no: string;
  name: string;
  email: string;
  department: 'DEV' | 'SALES' | 'OPS' | 'HR' | 'QA' | string;
  position: 'LEAD' | 'SENIOR' | 'JUNIOR' | 'MANAGER' | string;
  status: 'ACTIVE' | 'LEAVE' | 'RESIGNED' | string;
  salary: number;
  hire_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentStat {
  department: string;
  count: number;
  maxSalary: number;
  minSalary: number;
  avgSalary: number;
  totalSalary: number;
}

export interface EmployeesResponse {
  data: Employee[];
  stats: DepartmentStat[];
  source: 'mysql';
  message?: string;
  db_host?: string;
  db_name?: string;
  db_user?: string;
}
