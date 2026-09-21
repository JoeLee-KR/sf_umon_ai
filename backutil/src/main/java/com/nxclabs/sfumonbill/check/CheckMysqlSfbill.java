package com.nxclabs.sfumonbill.check;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

import java.nio.file.Path;
import java.security.CodeSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * MySQL 연결 상태 및 sf_umon_ai 관련 billing 테이블 상태를 점검한다.
 *
 * 1) env 파일명 및 암호 제외 접속 설정 표시
 * 2) JDBC 드라이버 위치 및 버전 표시
 * 3) 해당 데이터베이스 내 존재하는 테이블 목록 리스트업
 * 4) 핵심 테이블(sf_storage_usage) 저장 건수 및 최근 데이터 일자 확인
 * 5) 핵심 테이블(sf_metering_daily_history) 저장 건수 및 최근 데이터 일자 확인
 * 6) 총 점검 소요 시간 표시
 */
public final class CheckMysqlSfbill implements Command {

    private static final String STORAGE_TABLE = "sf_storage_usage";
    private static final String METERING_TABLE = "sf_metering_daily_history";

    @Override
    public String group() {
        return "check";
    }

    @Override
    public String name() {
        return "mysql-sfbill";
    }

    @Override
    public String description() {
        return "MySQL 연결 및 billing 테이블 상태 점검";
    }

    @Override
    public void run(String[] args, EnvConfig env) throws Exception {
        long startTime = System.currentTimeMillis();

        System.out.println("================================================================================");
        System.out.println("[check/mysql-sfbill] MySQL 연결 및 billing 테이블 상태 점검");
        System.out.println("================================================================================");

        // 1. 환경설정 정보 (암호 제외)
        String host = env.get("MYSQL_HOST", "127.0.0.1");
        String port = env.get("MYSQL_PORT", "3306");
        String user = env.require("MYSQL_USER");
        String password = env.get("MYSQL_PASSWORD", "");
        String database = env.require("MYSQL_DATABASE");

        String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + database
                + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8";

        System.out.println("1. 환경설정 정보");
        System.out.println("   - Env 파일       : " + env.file());
        System.out.println("   - Host           : " + host);
        System.out.println("   - Port           : " + port);
        System.out.println("   - User           : " + user);
        System.out.println("   - Password       : ******** (비공개)");
        System.out.println("   - Database       : " + database);
        System.out.println("   - JDBC URL       : " + jdbcUrl);
        System.out.println();

        // 2. JDBC 드라이버 위치 및 버전
        String driverClass = "com.mysql.cj.jdbc.Driver";
        String driverLocation = "알 수 없음";
        try {
            Class<?> driverClazz = Class.forName(driverClass);
            CodeSource cs = driverClazz.getProtectionDomain().getCodeSource();
            if (cs != null && cs.getLocation() != null) {
                driverLocation = Path.of(cs.getLocation().toURI()).toAbsolutePath().toString();
            }
        } catch (Exception e) {
            driverLocation = "(드라이버 위치 확인 실패: " + e.getMessage() + ")";
        }

        System.out.println("2. JDBC 드라이버 정보");
        System.out.println("   - 드라이버 클래스 : " + driverClass);
        System.out.println("   - 드라이버 위치   : " + driverLocation);

        // 3. MySQL 연결 시도
        System.out.println();
        System.out.println("3. MySQL 연결 상태");
        try (Connection conn = DriverManager.getConnection(jdbcUrl, user, password)) {
            DatabaseMetaData metaData = conn.getMetaData();
            System.out.println("   - 드라이버명/버전 : " + metaData.getDriverName() + " " + metaData.getDriverVersion());
            System.out.println("   - DBMS 버전      : " + metaData.getDatabaseProductName() + " " + metaData.getDatabaseProductVersion());
            System.out.println("   - 연결 상태      : 정상 (OK)");
            System.out.println();

            // 4. 존재하는 테이블 목록 리스트업
            System.out.println("4. 스키마 내 테이블 목록 (" + database + ")");
            List<String> tables = new ArrayList<>();
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SHOW TABLES")) {
                while (rs.next()) {
                    tables.add(rs.getString(1));
                }
            }

            if (tables.isEmpty()) {
                System.out.println("   (존재하는 테이블이 없습니다)");
            } else {
                System.out.println("   - 총 테이블 수: " + tables.size() + "개");
                for (int i = 0; i < tables.size(); i++) {
                    System.out.printf("     [%2d] %s%n", i + 1, tables.get(i));
                }
            }
            System.out.println();

            // 5. 핵심 테이블 상태 점검
            System.out.println("5. 핵심 테이블 상태 점검");
            inspectCoreTable(conn, tables, STORAGE_TABLE);
            inspectCoreTable(conn, tables, METERING_TABLE);

        } catch (Exception e) {
            System.err.println("   - 연결 상태      : 실패 (ERROR)");
            System.err.println("   - 에러 내용      : " + e.getMessage());
            long elapsedMs = System.currentTimeMillis() - startTime;
            System.out.println();
            System.out.println("================================================================================");
            System.out.println("[점검 실패] 총 소요 시간: " + elapsedMs + " ms");
            System.out.println("================================================================================");
            throw e;
        }

        long elapsedMs = System.currentTimeMillis() - startTime;
        System.out.println("================================================================================");
        System.out.printf(Locale.KOREA, "[점검 완료] 총 소요 시간: %,d ms (%.3f 초)%n", elapsedMs, elapsedMs / 1000.0);
        System.out.println("================================================================================");
    }

    private static void inspectCoreTable(Connection conn, List<String> allTables, String tableName) {
        boolean exists = allTables.stream().anyMatch(t -> t.equalsIgnoreCase(tableName));
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.KOREA);

        System.out.println("   [" + tableName + "]");
        if (!exists) {
            System.out.println("     - 테이블 상태    : 미존재 (FAIL)");
            System.out.println();
            return;
        }

        System.out.println("     - 테이블 상태    : 존재함 (OK)");

        try (Statement stmt = conn.createStatement()) {
            // 건수 조회
            long count = 0;
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM " + tableName)) {
                if (rs.next()) {
                    count = rs.getLong(1);
                }
            }
            System.out.println("     - 저장 건수      : " + nf.format(count) + " 건");

            // 최근 데이터 날짜(usage_date) 및 최근 갱신 일시(up_dt) 조회
            if (count > 0) {
                String sql = "SELECT MAX(usage_date), MAX(up_dt) FROM " + tableName;
                try (ResultSet rs = stmt.executeQuery(sql)) {
                    if (rs.next()) {
                        String maxUsageDate = rs.getString(1);
                        String maxUpDt = rs.getString(2);
                        System.out.println("     - 최근 데이터 날짜: " + (maxUsageDate != null ? maxUsageDate : "(null)") + " (usage_date)");
                        if (maxUpDt != null) {
                            System.out.println("     - 최근 갱신 일시  : " + maxUpDt + " (up_dt)");
                        }
                    }
                }
            } else {
                System.out.println("     - 최근 데이터 날짜: (데이터 없음)");
            }
        } catch (Exception e) {
            System.out.println("     - 데이터 조회 실패 : " + e.getMessage());
        }
        System.out.println();
    }
}
