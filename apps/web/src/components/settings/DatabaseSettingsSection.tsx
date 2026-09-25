'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Table,
  ArrowRight,
  ShieldCheck,
  Key,
  Layers,
} from 'lucide-react';
import { DatabaseConnectionInfo } from '@/app/api/settings/database/route';

export default function DatabaseSettingsSection() {
  const [data, setData] = useState<DatabaseConnectionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDbInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/sfumonai';
      const res = await fetch(`${basePath}/api/settings/database`);
      if (!res.ok) {
        let errorMsg = `서버 응답 오류 (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson.error) errorMsg = errJson.error;
        } catch {
          // ignore non-json error
        }
        throw new Error(errorMsg);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || '데이터베이스 설정 정보를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbInfo();
  }, []);

  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">데이터베이스 연결 설정 정보</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              실시간 조회를 위한 로컬 MySQL 저장소 및 데이터 원천인 Snowflake 클라우드 연결 구성 정보입니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDbInfo}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          상태 새로고침
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid for MySQL and Snowflake */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. MySQL Connection Info */}
        <div className="border border-zinc-200 rounded-xl p-5 bg-zinc-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-zinc-900">MySQL 연결 정보 (조회/캐시 저장소)</h3>
            </div>
            {data?.mysql.status === 'connected' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                정상 연결
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="h-3 w-3" />
                연결 실패 / 대기
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">호스트 (Host / IP)</span>
              <span className="font-mono font-medium text-zinc-800 break-all">{data?.mysql.host || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">포트 (Port)</span>
              <span className="font-mono font-medium text-zinc-800">{data?.mysql.port || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">데이터베이스 (Database)</span>
              <span className="font-mono font-medium text-zinc-800">{data?.mysql.database || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">사용자 계정 (User)</span>
              <span className="font-mono font-medium text-zinc-800">{data?.mysql.user || '-'}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold text-zinc-700 block mb-2 flex items-center gap-1.5">
              <Table className="h-3.5 w-3.5 text-zinc-500" />
              동기화 대상 MySQL 테이블
            </span>
            <div className="space-y-1.5">
              {data?.mysql.tables.map((tbl) => (
                <div
                  key={tbl.name}
                  className="bg-white p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold text-zinc-900">{tbl.name}</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{tbl.description}</p>
                  </div>
                  {typeof tbl.count === 'number' && (
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-mono text-[11px] rounded-md font-medium">
                      {tbl.count.toLocaleString()}건
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Snowflake Connection Info */}
        <div className="border border-zinc-200 rounded-xl p-5 bg-zinc-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-zinc-900">Snowflake 연결 정보 (원천 클라우드)</h3>
            </div>
            {data?.snowflake.status === 'configured' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <CheckCircle2 className="h-3 w-3" />
                설정 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                <ShieldCheck className="h-3 w-3" />
                원천 연동 구성
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 col-span-2">
              <span className="text-zinc-400 block text-[11px]">계정 식별자 (Account Identifier)</span>
              <span className="font-mono font-medium text-zinc-800 break-all">{data?.snowflake.account || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">사용자 (User)</span>
              <span className="font-mono font-medium text-zinc-800">{data?.snowflake.user || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">역할 (Role)</span>
              <span className="font-mono font-medium text-zinc-800">{data?.snowflake.role || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">웨어하우스 (Warehouse)</span>
              <span className="font-mono font-medium text-zinc-800">{data?.snowflake.warehouse || '-'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
              <span className="text-zinc-400 block text-[11px]">DB / Schema</span>
              <span className="font-mono font-medium text-zinc-800">
                {data?.snowflake.database || '-'}.{data?.snowflake.schema || '-'}
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-zinc-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-zinc-600 font-medium">인증 방식: {data?.snowflake.authType || 'RSA Key Pair'}</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">
              {data?.snowflake.keyFile || 'RSA Key File'}
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold text-zinc-700 block mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              원천 테이블 ➔ MySQL 매핑 정보
            </span>
            <div className="space-y-1.5">
              {data?.snowflake.tables.map((tbl) => (
                <div
                  key={tbl.name}
                  className="bg-white p-2.5 rounded-lg border border-zinc-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-sky-950">{tbl.name}</span>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span>{tbl.targetMysqlTable}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500">{tbl.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
