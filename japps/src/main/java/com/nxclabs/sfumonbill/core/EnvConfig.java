package com.nxclabs.sfumonbill.core;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * jar 옆(또는 지정 디렉터리)의 .env.[name] 파일을 읽어 KEY=VALUE 로 로드한다.
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
     * @param envDir --env-dir 로 지정된 디렉터리, 없으면 현재 작업 디렉터리(jar 실행 위치)를 사용
     * @param name   --env 로 지정된 이름 (예: "default", "prod", "stage"). null 이면 "default"
     */
    public static EnvConfig load(Path envDir, String name) throws IOException {
        String resolvedName = (name == null || name.isBlank()) ? "default" : name;
        EnvConfig config = new EnvConfig(resolvedName);

        Path dir = (envDir != null) ? envDir : Path.of(".");
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
