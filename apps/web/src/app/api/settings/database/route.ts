import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export interface DatabaseConnectionInfo {
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    status: 'connected' | 'error' | 'unconfigured';
    statusMessage: string;
    tables: {
      name: string;
      description: string;
      count?: number;
    }[];
  };
  snowflake: {
    account: string;
    user: string;
    role: string;
    warehouse: string;
    database: string;
    schema: string;
    authType: string;
    keyFile: string;
    keyFileExists: boolean;
    status: 'configured' | 'unconfigured';
    statusMessage: string;
    tables: {
      name: string;
      targetMysqlTable: string;
      description: string;
    }[];
  };
}

export async function GET() {
  // 1. MySQL 설정 및 연결 테스트
  const mysqlHost = process.env.MYSQL_HOST || '127.0.0.1';
  const mysqlPort = Number(process.env.MYSQL_PORT) || 3306;
  const mysqlDatabase = process.env.MYSQL_DATABASE || 'sf_umon_db';
  const mysqlUser = process.env.MYSQL_USER || 'root';
  const mysqlPassword = process.env.MYSQL_PASSWORD || '';

  let mysqlStatus: 'connected' | 'error' | 'unconfigured' = 'unconfigured';
  let mysqlStatusMessage = '연결 확인 대기';
  let storageCount: number | undefined;
  let computeCount: number | undefined;
  let employeeCount: number | undefined;

  try {
    const connection = await mysql.createConnection({
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase,
      connectTimeout: 2000,
    });

    try {
      // 테이블 건수 조회
      const [storageRows]: any = await connection.query('SELECT COUNT(*) as cnt FROM sf_storage_usage').catch(() => [[{ cnt: 0 }]]);
      const [computeRows]: any = await connection.query('SELECT COUNT(*) as cnt FROM sf_metering_daily_history').catch(() => [[{ cnt: 0 }]]);
      const [empRows]: any = await connection.query('SELECT COUNT(*) as cnt FROM employees').catch(() => [[{ cnt: 0 }]]);

      storageCount = storageRows?.[0]?.cnt ?? 0;
      computeCount = computeRows?.[0]?.cnt ?? 0;
      employeeCount = empRows?.[0]?.cnt ?? 0;

      mysqlStatus = 'connected';
      mysqlStatusMessage = '정상 연결됨 (실시간 동기화 데이터베이스)';
    } finally {
      await connection.end();
    }
  } catch (err: any) {
    mysqlStatus = 'error';
    mysqlStatusMessage = `연결 실패: ${err.message || 'MySQL 서버에 접속할 수 없습니다.'}`;
  }

  // 2. Snowflake 설정 정보
  const sfAccount = process.env.SNOWFLAKE_ACCOUNT || '(미설정)';
  const sfUser = process.env.SNOWFLAKE_USER || '(미설정)';
  const sfRole = process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN';
  const sfWarehouse = process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH';
  const sfDatabase = process.env.SNOWFLAKE_DATABASE || 'SNOWFLAKE';
  const sfSchema = process.env.SNOWFLAKE_SCHEMA || 'ACCOUNT_USAGE';
  const sfKeyFile = process.env.SNOWFLAKE_RSAKEYFILE || '';

  const sfConfigured = Boolean(process.env.SNOWFLAKE_ACCOUNT && process.env.SNOWFLAKE_USER);

  const responseData: DatabaseConnectionInfo = {
    mysql: {
      host: mysqlHost,
      port: mysqlPort,
      database: mysqlDatabase,
      user: mysqlUser,
      status: mysqlStatus,
      statusMessage: mysqlStatusMessage,
      tables: [
        {
          name: 'sf_storage_usage',
          description: 'Snowflake 일별 스토리지 사용량 적재 테이블',
          count: storageCount,
        },
        {
          name: 'sf_metering_daily_history',
          description: 'Snowflake 일별 컴퓨트/크레딧 사용량 적재 테이블',
          count: computeCount,
        },
        {
          name: 'sf_monthly_billing_history',
          description: '월별 요금 정산 및 확정 이력 테이블',
        },
        {
          name: 'employees',
          description: '시스템 사용자 및 직원 원천 데이터',
          count: employeeCount,
        },
      ],
    },
    snowflake: {
      account: sfAccount,
      user: sfUser,
      role: sfRole,
      warehouse: sfWarehouse,
      database: sfDatabase,
      schema: sfSchema,
      authType: 'RSA_KEY_PAIR (JWT Token)',
      keyFile: sfKeyFile ? sfKeyFile.replace(/^.*[\\/]/, '.../') : '(미설정)',
      keyFileExists: Boolean(sfKeyFile),
      status: sfConfigured ? 'configured' : 'unconfigured',
      statusMessage: sfConfigured
        ? 'Snowflake 원천 계정 정보 설정됨 (배치 수집 연동)'
        : '환경 변수 미설정 (Snowflake 직접 연동 설정 필요 시 .env 파일 참조)',
      tables: [
        {
          name: 'snowflake.account_usage.storage_usage',
          targetMysqlTable: 'sf_storage_usage',
          description: '원천 스토리지(Storage) 사용량 뷰',
        },
        {
          name: 'snowflake.account_usage.metering_daily_history',
          targetMysqlTable: 'sf_metering_daily_history',
          description: '원천 컴퓨팅/웨어하우스(Compute/Credits) 사용량 뷰',
        },
        {
          name: 'snowflake.account_usage.warehouse_metering_history',
          targetMysqlTable: 'sf_warehouse_metering_history',
          description: '웨어하우스별 세부 사용량 뷰 (선택 연동)',
        },
      ],
    },
  };

  return NextResponse.json({
    success: true,
    data: responseData,
  });
}
