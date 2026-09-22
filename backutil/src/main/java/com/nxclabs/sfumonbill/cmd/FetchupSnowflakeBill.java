package com.nxclabs.sfumonbill.cmd;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Base64;
import java.util.Locale;
import java.util.Properties;

/**
 * 지정된 날짜 구간에 해당하는 Snowflake billing(compute, storage) 기록을 MySQL로 복사(UPSERT)한다.
 *
 * - 파라미터가 없는 경우: 오늘 날짜를 포함한 최근 3일 동안의 데이터를 복사
 * - 파라미터가 2개(YYYYMMDD YYYYMMDD)인 경우: 해당 날짜 구간의 데이터를 복사
 * - 그 외 파라미터는 사용법 안내 문구만 출력
 * - 실행 시 프로젝트 홈 디렉토리(src/, target/, .env.default 가 있는 위치)의 logs/YYYYMMDDHHMMSS.log 파일에 실행 로그를 그대로 기록
 * - MySQL useAffectedRows=true 를 통해 신규(INSERT), 실제 갱신(up_dt 발생), 변경 없음(유지) 건수를 구분 집계
 */
public final class FetchupSnowflakeBill implements Command {

    static {
        // Snowflake JDBC 드라이버 내부의 과도한 java.util.logging INFO 출력 억제
        java.util.logging.Logger.getLogger("net.snowflake.client").setLevel(java.util.logging.Level.WARNING);
    }

    private static final DateTimeFormatter PARAM_DATE_FMT =
            DateTimeFormatter.ofPattern("uuuuMMdd").withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter LOG_FILE_DATE_FMT =
            DateTimeFormatter.ofPattern("uuuuMMddHHmmss");

    @Override
    public String group() {
        return "cmd";
    }

    @Override
    public String name() {
        return "fetchup-snowflake-bill";
    }

    @Override
    public String description() {
        return "Snowflake billing 데이터를 조회해 MySQL 에 적재(fetch+upsert)";
    }

    @Override
    public void run(String[] args, EnvConfig env) throws Exception {
        LocalDate startDate;
        LocalDate endDate;

        if (args.length == 0) {
            // 오늘 날짜 포함 3일 동안의 데이터
            LocalDate today = LocalDate.now();
            startDate = today.minusDays(2);
            endDate = today;
        } else if (args.length == 2) {
            if (!args[0].matches("^\\d{8}$") || !args[1].matches("^\\d{8}$")) {
                printUsage();
                return;
            }
            try {
                startDate = LocalDate.parse(args[0], PARAM_DATE_FMT);
                endDate = LocalDate.parse(args[1], PARAM_DATE_FMT);
            } catch (DateTimeParseException e) {
                printUsage();
                return;
            }
            if (startDate.isAfter(endDate)) {
                System.err.println("[오류] 시작일(" + args[0] + ")이 종료일(" + args[1] + ")보다 이후일 수 없습니다.");
                System.out.println();
                printUsage();
                return;
            }
        } else {
            printUsage();
            return;
        }

        // 로그 디렉토리 및 파일 준비 (프로젝트 홈 기준 logs/YYYYMMDDHHMMSS.log)
        Path projectHome = resolveProjectHome(env);
        Path logsDir = projectHome.resolve("logs");
        Files.createDirectories(logsDir);

        String logFileName = LocalDateTime.now().format(LOG_FILE_DATE_FMT) + ".log";
        Path logFile = logsDir.resolve(logFileName);

        // 콘솔 출력과 파일 저장을 동시에 수행하는 Tee 로깅 설정
        PrintStream originalOut = System.out;
        PrintStream originalErr = System.err;
        FileOutputStream logFos = new FileOutputStream(logFile.toFile(), true);
        PrintStream teeOut = new PrintStream(new TeeOutputStream(originalOut, logFos), true, StandardCharsets.UTF_8);
        PrintStream teeErr = new PrintStream(new TeeOutputStream(originalErr, logFos), true, StandardCharsets.UTF_8);

        System.setOut(teeOut);
        System.setErr(teeErr);

        long startTime = System.currentTimeMillis();

        try {
            System.out.println("================================================================================");
            System.out.println("[cmd/fetchup-snowflake-bill] Snowflake -> MySQL billing 데이터 복사");
            System.out.println("================================================================================");
            System.out.println("- 대상 기간: " + startDate + " ~ " + endDate);

            // 1. 접속 정보 확인
            String sfAccount = env.require("SNOWFLAKE_ACCOUNT");
            String sfUser = env.require("SNOWFLAKE_USER");
            String mysqlHost = env.get("MYSQL_HOST", "127.0.0.1");
            String mysqlPort = env.get("MYSQL_PORT", "3306");
            String mysqlDatabase = env.require("MYSQL_DATABASE");
            String mysqlUser = env.require("MYSQL_USER");

            String sfEndpoint = sfAccount;
            String mysqlEndpoint = mysqlHost + ":" + mysqlPort + "/" + mysqlDatabase;

            try (Connection sfConn = createSnowflakeConnection(env);
                 Connection mysqlConn = createMysqlConnection(env)) {

                System.out.println("- 접속 snowflake 정보: 접속점 " + sfEndpoint + ", 유저명 " + sfUser);
                System.out.println("- 접속 mysql 정보: 접속점 " + mysqlEndpoint + ", 유저명 " + mysqlUser);

                mysqlConn.setAutoCommit(false);
                try {
                    // 2. Compute 복사
                    SyncStats computeStats = syncComputeData(sfConn, mysqlConn, startDate, endDate);
                    System.out.printf(Locale.KOREA,
                            "- compute 처리: snowflake %,d건 읽음. mysql %,d건 대상 (신규 %,d건, 실제 갱신(up_dt) %,d건, 유지 %,d건)%n",
                            computeStats.readCount, computeStats.targetCount(),
                            computeStats.insertedCount, computeStats.updatedCount, computeStats.unchangedCount);

                    // 3. Storage 복사
                    SyncStats storageStats = syncStorageData(sfConn, mysqlConn, startDate, endDate);
                    System.out.printf(Locale.KOREA,
                            "- storage 처리: snowflake %,d건 읽음. mysql %,d건 대상 (신규 %,d건, 실제 갱신(up_dt) %,d건, 유지 %,d건)%n",
                            storageStats.readCount, storageStats.targetCount(),
                            storageStats.insertedCount, storageStats.updatedCount, storageStats.unchangedCount);

                    mysqlConn.commit();
                } catch (Exception e) {
                    mysqlConn.rollback();
                    throw e;
                } finally {
                    mysqlConn.setAutoCommit(true);
                }

            } catch (Exception e) {
                long elapsedMs = System.currentTimeMillis() - startTime;
                System.err.println("- 처리 중 오류 발생: " + e.getMessage());
                System.out.println("================================================================================");
                System.out.printf(Locale.KOREA, "[작업 실패] 총 소요 시간: %,d ms (%.3f 초)%n", elapsedMs, elapsedMs / 1000.0);
                System.out.println("- 로그 파일: " + logFile.toAbsolutePath());
                System.out.println("================================================================================");
                throw e;
            }

            long elapsedMs = System.currentTimeMillis() - startTime;
            System.out.println("================================================================================");
            System.out.printf(Locale.KOREA, "[작업 완료] 총 소요 시간: %,d ms (%.3f 초)%n", elapsedMs, elapsedMs / 1000.0);
            System.out.println("- 로그 파일: " + logFile.toAbsolutePath());
            System.out.println("================================================================================");

        } finally {
            System.setOut(originalOut);
            System.setErr(originalErr);
            teeOut.flush();
            teeErr.flush();
            try {
                logFos.close();
            } catch (IOException ignored) {
            }
        }
    }

    /**
     * Compute 데이터 동기화 (snowflake.account_usage.metering_daily_history -> sf_metering_daily_history)
     */
    private SyncStats syncComputeData(Connection sfConn, Connection mysqlConn,
                                      LocalDate startDate, LocalDate endDate) throws Exception {
        String sfSql = "SELECT "
                + "  usage_date, "
                + "  service_type, "
                + "  credits_used_compute, "
                + "  credits_used_cloud_services, "
                + "  credits_used, "
                + "  credits_adjustment_cloud_services, "
                + "  credits_billed "
                + "FROM snowflake.account_usage.metering_daily_history "
                + "WHERE usage_date >= to_date(?, 'YYYY-MM-DD') "
                + "  AND usage_date <= to_date(?, 'YYYY-MM-DD') "
                + "ORDER BY usage_date ASC, service_type ASC";

        String mysqlSql = "INSERT INTO sf_metering_daily_history ( "
                + "  service_type, "
                + "  usage_date, "
                + "  credits_used_compute, "
                + "  credits_used_cloud_services, "
                + "  credits_used, "
                + "  credits_adjustment_cloud_services, "
                + "  credits_billed "
                + ") VALUES (?, ?, ?, ?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE "
                + "  credits_used_compute              = VALUES(credits_used_compute), "
                + "  credits_used_cloud_services       = VALUES(credits_used_cloud_services), "
                + "  credits_used                      = VALUES(credits_used), "
                + "  credits_adjustment_cloud_services = VALUES(credits_adjustment_cloud_services), "
                + "  credits_billed                    = VALUES(credits_billed)";

        int sfCount = 0;
        int inserted = 0;
        int updated = 0;
        int unchanged = 0;

        try (PreparedStatement sfStmt = sfConn.prepareStatement(sfSql);
             PreparedStatement mysqlStmt = mysqlConn.prepareStatement(mysqlSql)) {

            sfStmt.setString(1, startDate.toString());
            sfStmt.setString(2, endDate.toString());

            try (ResultSet rs = sfStmt.executeQuery()) {
                while (rs.next()) {
                    sfCount++;
                    java.sql.Date usageDate = rs.getDate(1);
                    String serviceType = rs.getString(2);
                    BigDecimal compute = rs.getBigDecimal(3);
                    BigDecimal cloudServices = rs.getBigDecimal(4);
                    BigDecimal creditsUsed = rs.getBigDecimal(5);
                    BigDecimal adjustment = rs.getBigDecimal(6);
                    BigDecimal billed = rs.getBigDecimal(7);

                    mysqlStmt.setString(1, serviceType);
                    mysqlStmt.setDate(2, usageDate);
                    mysqlStmt.setBigDecimal(3, compute != null ? compute : BigDecimal.ZERO);
                    mysqlStmt.setBigDecimal(4, cloudServices != null ? cloudServices : BigDecimal.ZERO);
                    mysqlStmt.setBigDecimal(5, creditsUsed != null ? creditsUsed : BigDecimal.ZERO);
                    mysqlStmt.setBigDecimal(6, adjustment != null ? adjustment : BigDecimal.ZERO);
                    mysqlStmt.setBigDecimal(7, billed != null ? billed : BigDecimal.ZERO);
                    mysqlStmt.addBatch();
                }
            }

            if (sfCount > 0) {
                int[] results = mysqlStmt.executeBatch();
                for (int res : results) {
                    if (res == 1) {
                        inserted++;
                    } else if (res == 2) {
                        updated++;
                    } else if (res == 0) {
                        unchanged++;
                    } else if (res > 0) {
                        updated++;
                    }
                }
            }
        }

        return new SyncStats(sfCount, inserted, updated, unchanged);
    }

    /**
     * Storage 데이터 동기화 (snowflake.account_usage.storage_usage -> sf_storage_usage)
     */
    private SyncStats syncStorageData(Connection sfConn, Connection mysqlConn,
                                      LocalDate startDate, LocalDate endDate) throws Exception {
        String sfSql = "SELECT "
                + "  usage_date, "
                + "  storage_bytes, "
                + "  stage_bytes, "
                + "  failsafe_bytes "
                + "FROM snowflake.account_usage.storage_usage "
                + "WHERE usage_date >= to_date(?, 'YYYY-MM-DD') "
                + "  AND usage_date <= to_date(?, 'YYYY-MM-DD') "
                + "ORDER BY usage_date ASC";

        String mysqlSql = "INSERT INTO sf_storage_usage ( "
                + "  usage_date, "
                + "  storage_bytes, "
                + "  stage_bytes, "
                + "  failsafe_bytes "
                + ") VALUES (?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE "
                + "  storage_bytes  = VALUES(storage_bytes), "
                + "  stage_bytes    = VALUES(stage_bytes), "
                + "  failsafe_bytes = VALUES(failsafe_bytes)";

        int sfCount = 0;
        int inserted = 0;
        int updated = 0;
        int unchanged = 0;

        try (PreparedStatement sfStmt = sfConn.prepareStatement(sfSql);
             PreparedStatement mysqlStmt = mysqlConn.prepareStatement(mysqlSql)) {

            sfStmt.setString(1, startDate.toString());
            sfStmt.setString(2, endDate.toString());

            try (ResultSet rs = sfStmt.executeQuery()) {
                while (rs.next()) {
                    sfCount++;
                    java.sql.Date usageDate = rs.getDate(1);
                    BigDecimal storageBytes = rs.getBigDecimal(2);
                    BigDecimal stageBytes = rs.getBigDecimal(3);
                    BigDecimal failsafeBytes = rs.getBigDecimal(4);

                    mysqlStmt.setDate(1, usageDate);
                    mysqlStmt.setBigDecimal(2, storageBytes != null ? storageBytes : BigDecimal.ZERO);
                    mysqlStmt.setBigDecimal(3, stageBytes != null ? stageBytes : BigDecimal.ZERO);
                    mysqlStmt.setBigDecimal(4, failsafeBytes != null ? failsafeBytes : BigDecimal.ZERO);
                    mysqlStmt.addBatch();
                }
            }

            if (sfCount > 0) {
                int[] results = mysqlStmt.executeBatch();
                for (int res : results) {
                    if (res == 1) {
                        inserted++;
                    } else if (res == 2) {
                        updated++;
                    } else if (res == 0) {
                        unchanged++;
                    } else if (res > 0) {
                        updated++;
                    }
                }
            }
        }

        return new SyncStats(sfCount, inserted, updated, unchanged);
    }

    private static Connection createSnowflakeConnection(EnvConfig env) throws Exception {
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

        if (!Files.exists(keyPath)) {
            throw new FileNotFoundException("Snowflake RSA 키 파일을 찾을 수 없습니다: " + keyPath);
        }

        PrivateKey privateKey = loadPrivateKey(keyPath);

        String jdbcUrl = account.startsWith("jdbc:snowflake://") ? account : "jdbc:snowflake://" + account;

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

        return DriverManager.getConnection(jdbcUrl, props);
    }

    private static Connection createMysqlConnection(EnvConfig env) throws Exception {
        String host = env.get("MYSQL_HOST", "127.0.0.1");
        String port = env.get("MYSQL_PORT", "3306");
        String user = env.require("MYSQL_USER");
        String password = env.get("MYSQL_PASSWORD", "");
        String database = env.require("MYSQL_DATABASE");

        String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + database
                + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8&useAffectedRows=true";

        return DriverManager.getConnection(jdbcUrl, user, password);
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

    private static Path resolveProjectHome(EnvConfig env) {
        // 1. env.file()의 부모 디렉토리에 pom.xml, src, .env.default 가 존재하는지 확인
        if (env != null && env.file() != null) {
            Path envDir = env.file().getParent();
            if (envDir != null && (Files.exists(envDir.resolve("src")) || Files.exists(envDir.resolve(".env.default")) || Files.exists(envDir.resolve("pom.xml")))) {
                return envDir.toAbsolutePath().normalize();
            }
        }

        // 2. jar 파일 또는 클래스 로드 위치에서 상위 디렉토리로 이동하며 프로젝트 홈(src, .env.default, pom.xml) 탐색
        try {
            CodeSource cs = FetchupSnowflakeBill.class.getProtectionDomain().getCodeSource();
            if (cs != null && cs.getLocation() != null) {
                Path loc = Path.of(cs.getLocation().toURI()).toAbsolutePath().normalize();
                Path dir = Files.isRegularFile(loc) ? loc.getParent() : loc;
                while (dir != null) {
                    if (Files.exists(dir.resolve("src")) || Files.exists(dir.resolve(".env.default")) || Files.exists(dir.resolve("pom.xml"))) {
                        return dir;
                    }
                    dir = dir.getParent();
                }
            }
        } catch (Exception ignored) {
        }

        // 3. 현재 작업 디렉토리(CWD) 확인
        Path cwd = Path.of(".").toAbsolutePath().normalize();
        if (Files.exists(cwd.resolve("src")) || Files.exists(cwd.resolve(".env.default"))) {
            return cwd;
        }

        return cwd;
    }

    private static void printUsage() {
        System.out.println("사용법:");
        System.out.println("  java -jar Main.jar cmd/fetchup-snowflake-bill [옵션]");
        System.out.println("  java -jar Main.jar cmd/fetchup-snowflake-bill <시작일(YYYYMMDD)> <종료일(YYYYMMDD)> [옵션]");
        System.out.println();
        System.out.println("설명:");
        System.out.println("  Snowflake의 billing 데이터(compute, storage)를 조회하여 MySQL로 복사(UPSERT)합니다.");
        System.out.println();
        System.out.println("파라미터:");
        System.out.println("  (파라미터 없음)                    오늘 날짜 포함 최근 3일 동안의 데이터를 복사합니다.");
        System.out.println("  <시작일(YYYYMMDD)> <종료일(YYYYMMDD)>  지정한 날짜 구간의 데이터를 복사합니다.");
        System.out.println();
        System.out.println("옵션:");
        System.out.println("  --env=FILE                        환경설정 파일 지정 (기본값: .env.default)");
        System.out.println();
        System.out.println("실행 예시:");
        System.out.println("  java -jar Main.jar cmd/fetchup-snowflake-bill");
        System.out.println("  java -jar Main.jar cmd/fetchup-snowflake-bill 20260901 20260914");
        System.out.println("  java -jar Main.jar cmd/fetchup-snowflake-bill --env=.env.prod");
    }

    /**
     * 동기화 통계 데이터
     */
    private static final class SyncStats {
        final int readCount;
        final int insertedCount;
        final int updatedCount;
        final int unchangedCount;

        SyncStats(int readCount, int insertedCount, int updatedCount, int unchangedCount) {
            this.readCount = readCount;
            this.insertedCount = insertedCount;
            this.updatedCount = updatedCount;
            this.unchangedCount = unchangedCount;
        }

        int targetCount() {
            return insertedCount + updatedCount + unchangedCount;
        }
    }

    /**
     * 콘솔과 파일에 동시에 출력하기 위한 OutputStream
     */
    private static final class TeeOutputStream extends OutputStream {
        private final OutputStream out1;
        private final OutputStream out2;

        TeeOutputStream(OutputStream out1, OutputStream out2) {
            this.out1 = out1;
            this.out2 = out2;
        }

        @Override
        public void write(int b) throws IOException {
            out1.write(b);
            out2.write(b);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            out1.write(b, off, len);
            out2.write(b, off, len);
        }

        @Override
        public void flush() throws IOException {
            out1.flush();
            out2.flush();
        }

        @Override
        public void close() throws IOException {
            try {
                out1.flush();
            } finally {
                out2.close();
            }
        }
    }
}
