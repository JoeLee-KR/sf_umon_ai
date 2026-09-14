'use client';

import React, { useState, useMemo } from 'react';
import { Employee } from '@/types/employee';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  CheckCircle2,
  Clock,
  UserX,
  FileSpreadsheet,
} from 'lucide-react';

interface EmployeeTableProps {
  employees: Employee[];
}

type SortField = 'id' | 'emp_no' | 'name' | 'department' | 'position' | 'status' | 'salary' | 'hire_date';
type SortOrder = 'asc' | 'desc';

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Extract unique departments & statuses for filter dropdowns
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.department && set.add(e.department));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.status && set.add(e.status));
    return ['ALL', ...Array.from(set)];
  }, [employees]);

  // Filtering & Sorting
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        const matchesSearch =
          !search ||
          emp.name.toLowerCase().includes(search.toLowerCase()) ||
          emp.emp_no.toLowerCase().includes(search.toLowerCase()) ||
          emp.email.toLowerCase().includes(search.toLowerCase());

        const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
        const matchesStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;

        return matchesSearch && matchesDept && matchesStatus;
      })
      .sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const comp = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [employees, search, selectedDept, selectedStatus, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-zinc-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-indigo-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            재직
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-500" />
            휴직
          </span>
        );
      case 'RESIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
            <UserX className="h-3 w-3 text-zinc-400" />
            퇴사
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-600">
            {status}
          </span>
        );
    }
  };

  const getDepartmentBadge = (dept: string) => {
    const colors: Record<string, string> = {
      DEV: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      SALES: 'bg-sky-50 text-sky-700 border-sky-200',
      OPS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      HR: 'bg-rose-50 text-rose-700 border-rose-200',
      QA: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    const style = colors[dept] || 'bg-zinc-50 text-zinc-700 border-zinc-200';
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${style}`}>
        {dept}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. 필터 및 검색 바 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-50/70 p-3 rounded-lg border border-zinc-200">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="사원명, 사번, 이메일 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-zinc-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 부서 필터 */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-zinc-200 rounded-md px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? '모든 부서' : `부서: ${d}`}
                </option>
              ))}
            </select>
          </div>

          {/* 재직 상태 필터 */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-zinc-200 rounded-md px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL'
                  ? '모든 상태'
                  : s === 'ACTIVE'
                  ? '재직'
                  : s === 'LEAVE'
                  ? '휴직'
                  : s === 'RESIGNED'
                  ? '퇴사'
                  : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. 데이터 테이블 */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                <th
                  onClick={() => handleSort('id')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group w-14"
                >
                  <div className="flex items-center gap-1">
                    ID {renderSortIcon('id')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('emp_no')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group"
                >
                  <div className="flex items-center gap-1">
                    사번 {renderSortIcon('emp_no')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group"
                >
                  <div className="flex items-center gap-1">
                    성명 {renderSortIcon('name')}
                  </div>
                </th>
                <th className="px-3.5 py-2.5 text-zinc-500">이메일</th>
                <th
                  onClick={() => handleSort('department')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group"
                >
                  <div className="flex items-center gap-1">
                    부서 {renderSortIcon('department')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('position')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group"
                >
                  <div className="flex items-center gap-1">
                    직급 {renderSortIcon('position')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    상태 {renderSortIcon('status')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('salary')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    연봉 {renderSortIcon('salary')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hire_date')}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-zinc-100 transition group text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    입사일 {renderSortIcon('hire_date')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FileSpreadsheet className="h-6 w-6 text-zinc-300" />
                      <p className="text-xs">조건에 부합하는 사원 데이터가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/70 transition">
                    <td className="px-3.5 py-2.5 font-mono text-zinc-400">{emp.id}</td>
                    <td className="px-3.5 py-2.5 font-mono font-medium text-zinc-700">
                      {emp.emp_no}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-zinc-900">
                      {emp.name}
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-500 font-mono text-[11px]">
                      {emp.email}
                    </td>
                    <td className="px-3.5 py-2.5">{getDepartmentBadge(emp.department)}</td>
                    <td className="px-3.5 py-2.5 font-medium text-zinc-700">
                      {emp.position}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">{getStatusBadge(emp.status)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-zinc-800">
                      {Number(emp.salary).toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-zinc-500">
                      {emp.hire_date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 3. 테이블 푸터 및 페이징 */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <div>
            전체 <span className="font-semibold text-zinc-800">{filteredEmployees.length}</span>명
            (총 {employees.length}명 중 필터링)
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition text-xs font-medium"
            >
              이전
            </button>
            <span className="px-2 text-zinc-600 font-mono">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition text-xs font-medium"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
