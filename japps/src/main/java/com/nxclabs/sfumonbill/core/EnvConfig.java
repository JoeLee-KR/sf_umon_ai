package com.nxclabs.sfumonbill.core;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * jar 옆(또는 --env-dir 로 지정된 디렉터리)의 .env.[name] 파일을 읽어 KEY=VALUE 로 로드한다.
 * apps/web 의 .env.local 방식과 동일한 컨벤션: 실 자격증명 파일은 git에 커밋하지 않고,
 * .env.default 만 예시 템플릿으로 커밋한다.
 *
 * 조회 우선순위: .env.[name] 파일의 값 > 프로세스 환경변수(System.getenv).
 */
public final class EnvConfig {

    private final String name;
    private final Map<String, String> values = new LinkedHashMap<>();

    private EnvConfig(String name) {
        this.name = name;
    }

    /**
     * @param envDir --env-dir 로 지정된 디렉터리. null 이면 실행 중인 Main.jar 파일이 위치한 디렉터리를 사용한다.
     * @param name   --env 로 지정된 이름 (예: "default", "prod", "stage"). null 이면 "default"
     */
    public static EnvConfig load(Path envDir, String name) throws IOException {
        String resolvedName = (name == null || name.isBlank()) ? "default" : name;
        EnvConfig config = new EnvConfig(resolvedName);

        Path dir = (envDir != null) ? envDir : jarDir();
        Path file = dir.resolve(".env." + resolvedName);

        if (!Files.exists(file)) {
            throw new IOException(
                    "설정 파일을 찾을 수 없습니다: " + file.toAbsolutePath() +
                    " (예: .env.default 를 복사해서 만들어 두세요)"
            );
        }

        for (String rawLine : Files.readAllLines(file)) {
            String line = rawLine.strip();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            int eq = line.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String key = line.substring(0, eq).strip();
            String value = line.substring(eq + 1).strip();
            if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
                value = value.substring(1, value.length() - 1);
            }
            config.values.put(key, value);
        }

        return config;
    }

    /**
     * 실행 중인 코드가 로드된 위치의 디렉터리를 반환한다.
     * java -jar Main.jar 로 실행한 경우: Main.jar 파일이 있는 디렉터리.
     * java -cp target/classes ... 로 실행한 경우(개발 중 클래스 직접 실행): target/classes 디렉터리.
     * 위치를 알 수 없으면 현재 작업 디렉터리로 폴백한다.
     */
    private static Path jarDir() {
        try {
            CodeSource codeSource = EnvConfig.class.getProtectionDomain().getCodeSource();
            Path location = Path.of(codeSource.getLocation().toURI());
            return Files.isRegularFile(location) ? location.getParent() : location;
        } catch (Exception e) {
            return Path.of(".");
        }
    }

    public String name() {
        return name;
    }

    public String get(String key) {
        return values.getOrDefault(key, System.getenv(key));
    }

    public String get(String key, String defaultValue) {
        String value = get(key);
        return (value != null) ? value : defaultValue;
    }

    public String require(String key) {
        String value = get(key);
        if (value == null) {
            throw new IllegalStateException("필수 설정값이 없습니다: " + key + " (.env." + name + " 확인)");
        }
        return value;
    }
}
