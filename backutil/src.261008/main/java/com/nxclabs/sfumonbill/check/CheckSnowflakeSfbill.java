package com.nxclabs.sfumonbill.check;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.NumberFormat;
import java.util.Base64;
import java.util.Locale;
import java.util.Properties;

/**
 * Snowflake 연결 상태 및 ACCOUNT_USAGE 핵심 billing 뷰의 조회 권한 및 데이터를 점검한다.
 *
 * 1) env 파일명 및 접속 설정(계정, 사용자, 롤, 웨어하우스, DB, 스키마, 키파일 경로) 표시
 * 2) RSA_KEY_PAIR 방식을 통한 Snowflake 인증
 * 3) Snowflake JDBC 드라이버 위치 및 버전 표시
 * 4) snowflake.account_usage.storage_usage 저장 건수 및 최근 데이터 일자 확인
 * 5) snowflake.account_usage.metering_daily_history 저장 건수 및 최근 데이터 일자 확인
 * 6) 총 점검 소요 시간 표시
 */
public final class CheckSnowflakeSfbill implements Command {

    static {
        // Snowflake JDBC 드라이버 내부의 과도한 java.util.logging INFO 출력 억제
        java.util.logging.Logger.getLogger("net.snowflake.client").setLevel(java.util.logging.Level.WARNING);
    }

    private static final String TABLE_STORAGE_USAGE = "snowflake.account_usage.storage_usage";
    private static final String TABLE_METERING_DAILY = "snowflake.account_usage.metering_daily_history";

    @Override
    public String group() {
        return "check";
    }

    @Override
    public String name() {
        return "snowflake-sfbill";
    }

    @Override
    public String description() {
        return "Snowflake 연결 및 ACCOUNT_USAGE 조회 권한 점검";
    }

    @Override
    public void run(String[] args, EnvConfig env) throws Exception {
        long startTime = System.currentTimeMillis();

        System.out.println("================================================================================");
        System.out.println("[check/snowflake-sfbill] Snowflake 연결 및 ACCOUNT_USAGE 점검");
        System.out.println("================================================================================");

        // 1. 환경설정 정보 조회
        String account = env.require("SNOWFLAKE_ACCOUNT");
        String user = env.require("SNOWFLAKE_USER");
        String role = env.get("SNOWFLAKE_ROLE");
        String warehouse = env.get("SNOWFLAKE_WAREHOUSE");
        String database = env.get("SNOWFLAKE_DATABASE");
        String schema = env.get("SNOWFLAKE_SCHEMA");
        String keyPathStr = env.require("SNOWFLAKE_RSAKEYFILE");

        Path keyPath = Path.of(keyPathStr);
        if (!keyPath.isAbsolute() && env.file() != null && env.file().getParent() != null) {
            keyPath = env.file().getParent().resolve(keyPath);
        }
        keyPath = keyPath.toAbsolutePath().normalize();

        String jdbcUrl = account.startsWith("jdbc:snowflake://") ? account : "jdbc:snowflake://" + account;

        System.out.println("1. 환경설정 정보 (RSA Key Pair 인증)");
        System.out.println("   - Env 파일       : " + env.file());
        System.out.println("   - Account        : " + account);
        System.out.println("   - User           : " + user);
        System.out.println("   - Role           : " + (role != null ? role : "(지정 안 됨)"));
        System.out.println("   - Warehouse      : " + (warehouse != null ? warehouse : "(지정 안 됨)"));
        System.out.println("   - Database       : " + (database != null ? database : "(지정 안 됨)"));
        System.out.println("   - Schema         : " + (schema != null ? schema : "(지정 안 됨)"));
        System.out.println("   - RSA Key File   : " + keyPath + (Files.exists(keyPath) ? " [존재함]" : " [파일 없음]"));
        System.out.println("   - 인증 방식      : RSA_KEY_PAIR (JWT Token)");
        System.out.println("   - JDBC URL       : " + jdbcUrl);
        System.out.println();

        // 2. RSA 개인키 로드
        if (!Files.exists(keyPath)) {
            throw new FileNotFoundException("Snowflake RSA 키 파일을 찾을 수 없습니다: " + keyPath);
        }
        PrivateKey privateKey = loadPrivateKey(keyPath);

        // 3. JDBC 드라이버 위치 및 버전
        String driverClass = "net.snowflake.client.jdbc.SnowflakeDriver";
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
        System.out.println();

        // 4. Snowflake 연결 프로퍼티 설정
        Properties props = new Properties();
        props.put("user", user);
        props.put("privateKey", privateKey);
        props.put("authenticator", "snowflake_jwt");
        if (role != null && !role.isBlank()) {
            props.put("role", role);
        }
        if (warehouse != null && !warehouse.isBlank()) {
            props.put("warehouse", warehouse);
        }
        if (database != null && !database.isBlank()) {
            props.put("db", database);
        }
        if (schema != null && !schema.isBlank()) {
            props.put("schema", schema);
        }

        // 5. Snowflake 연결 및 상태 확인
        System.out.println("3. Snowflake 연결 상태");
        try (Connection conn = DriverManager.getConnection(jdbcUrl, props)) {
            DatabaseMetaData metaData = conn.getMetaData();
            System.out.println("   - 드라이버명/버전 : " + metaData.getDriverName() + " " + metaData.getDriverVersion());
            System.out.println("   - DBMS 버전      : " + metaData.getDatabaseProductName() + " " + metaData.getDatabaseProductVersion());
            System.out.println("   - 연결 상태      : 정상 (OK)");
            System.out.println();

            // 6. 핵심 ACCOUNT_USAGE 뷰 상태 점검
            System.out.println("4. 핵심 테이블 상태 점검 (ACCOUNT_USAGE)");
            inspectAccountUsageTable(conn, TABLE_STORAGE_USAGE);
            inspectAccountUsageTable(conn, TABLE_METERING_DAILY);

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

    private static PrivateKey loadPrivateKey(Path keyPath) throws Exception {
        String keyContent = Files.readString(keyPath, StandardCharsets.UTF_8);
        String cleanPem = keyContent
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] decoded = Base64.getDecoder().decode(cleanPem);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decoded);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return kf.generatePrivate(keySpec);
    }

    private static void inspectAccountUsageTable(Connection conn, String fqdnTable) {
        System.out.println("   [" + fqdnTable + "]");
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.KOREA);

        String sql = "SELECT COUNT(*), MAX(USAGE_DATE) FROM " + fqdnTable;
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            long count = 0;
            String maxUsageDate = null;
            if (rs.next()) {
                count = rs.getLong(1);
                maxUsageDate = rs.getString(2);
            }

            System.out.println("     - 테이블 상태    : 접근 가능 (OK)");
            System.out.println("     - 저장 건수      : " + nf.format(count) + " 건");
            System.out.println("     - 최근 데이터 날짜: " + (maxUsageDate != null ? maxUsageDate : "(데이터 없음)") + " (USAGE_DATE)");

        } catch (Exception e) {
            System.out.println("     - 조회 실패      : " + e.getMessage());
        }
        System.out.println();
    }
}

