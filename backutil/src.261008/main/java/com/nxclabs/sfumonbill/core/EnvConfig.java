package com.nxclabs.sfumonbill.core;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * .env 파일을 읽어 KEY=VALUE 로 로드한다. --env 값은 .env.default, .env.myconf 처럼
 * 파일명 전체를 그대로 적는다 (축약하지 않음 — 파일명만 보고 바로 어떤 파일인지 알 수 있게 하기 위함).
 * apps/web 의 .env.local 방식과 동일한 컨벤션: 실 자격증명 파일은 git에 커밋하지 않고,
 * .env.default 만 예시 템플릿으로 커밋한다.
 *
 * --env 값에 디렉터리를 포함시킬 수 있다 (예: "config/.env.test" -> config/.env.test).
 * 디렉터리 없이 파일명만 주어지면(예: ".env.test") Main.jar 파일이 위치한 디렉터리에서 찾는다.
 *
 * 조회 우선순위: .env 파일의 값 > 프로세스 환경변수(System.getenv).
 */
public final class EnvConfig {

    private final String name;
    private final Path file;
    private final Map<String, String> values = new LinkedHashMap<>();

    private EnvConfig(String name, Path file) {
        this.name = name;
        this.file = file;
    }

    /**
     * @param spec --env 로 지정된 값 (예: ".env.default", ".env.myconf", "config/.env.test"). null 이면 ".env.default".
     *             디렉터리 부분이 포함되어 있으면 그 디렉터리에서, 없으면 Main.jar 가 위치한 디렉터리에서 파일을 찾는다.
     */
    public static EnvConfig load(String spec) throws IOException {
        String resolvedSpec = (spec == null || spec.isBlank()) ? ".env.default" : spec;

        Path specPath = Path.of(resolvedSpec);
        Path parent = specPath.getParent();
        Path file;
        if (parent != null) {
            file = parent.resolve(specPath.getFileName());
        } else {
            Path candidate = jarDir().resolve(specPath.getFileName());
            if (Files.exists(candidate)) {
                file = candidate;
            } else if (Files.exists(specPath)) {
                file = specPath;
            } else {
                file = candidate;
            }
        }

        EnvConfig config = new EnvConfig(resolvedSpec, file.toAbsolutePath().normalize());

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

    public Path file() {
        return file;
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
            throw new IllegalStateException("필수 설정값이 없습니다: " + key + " (" + file.toAbsolutePath() + " 확인)");
        }
        return value;
    }
}
