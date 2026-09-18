package com.nxclabs.sfumonbill;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.CommandRegistry;
import com.nxclabs.sfumonbill.core.EnvConfig;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 통합 jar 진입점.
 *
 * 사용법:
 *   java -jar Main.jar                                  안내 출력
 *   java -jar Main.jar help                              안내 출력
 *   java -jar Main.jar &lt;group&gt; &lt;name&gt; [--env=default] [--env-dir=DIR] [args...]
 *
 * 예:
 *   java -jar Main.jar check mysql-sfbill --env=default
 *   java -jar Main.jar cmd fetchup-snowflake-bill --env=prod
 */
public final class Main {

    public static void main(String[] args) {
        if (args.length == 0 || "help".equals(args[0]) || "--help".equals(args[0]) || "-h".equals(args[0])) {
            printUsage();
            return;
        }

        if (args.length < 2) {
            System.err.println("[오류] group 과 name 을 함께 지정해야 합니다.");
            printUsage();
            System.exit(1);
        }

        String group = args[0];
        String name = args[1];

        String envName = null;
        Path envDir = null;
        List<String> remaining = new ArrayList<>();

        for (int i = 2; i < args.length; i++) {
            String arg = args[i];
            if (arg.startsWith("--env=")) {
                envName = arg.substring("--env=".length());
            } else if (arg.startsWith("--env-dir=")) {
                envDir = Path.of(arg.substring("--env-dir=".length()));
            } else {
                remaining.add(arg);
            }
        }

        Command command = CommandRegistry.find(group, name);
        if (command == null) {
            System.err.println("[오류] 알 수 없는 커맨드입니다: " + group + " " + name);
            printUsage();
            System.exit(1);
            return;
        }

        try {
            EnvConfig env = EnvConfig.load(envDir, envName);
            command.run(remaining.toArray(new String[0]), env);
        } catch (Exception e) {
            System.err.println("[실패] " + group + " " + name + " : " + e.getMessage());
            System.exit(1);
        }
    }

    private static void printUsage() {
        System.out.println("sf_umon_ai / japps - Main.jar");
        System.out.println();
        System.out.println("사용법:");
        System.out.println("  java -jar Main.jar <group> <name> [--env=default] [--env-dir=DIR] [args...]");
        System.out.println();
        System.out.println("옵션:");
        System.out.println("  --env=NAME       .env.NAME 파일을 로드 (기본값: default)");
        System.out.println("  --env-dir=DIR    .env.NAME 파일을 찾을 디렉터리 (기본값: Main.jar 파일이 있는 디렉터리)");
        System.out.println();
        System.out.println("사용 가능한 커맨드:");

        Map<String, List<Command>> byGroup = new TreeMap<>();
        for (Command c : CommandRegistry.all()) {
            byGroup.computeIfAbsent(c.group(), g -> new ArrayList<>()).add(c);
        }

        for (Map.Entry<String, List<Command>> entry : byGroup.entrySet()) {
            System.out.println("  [" + entry.getKey() + "]");
            for (Command c : entry.getValue()) {
                System.out.printf("    %-24s %s%n", c.name(), c.description());
            }
        }
    }

    private Main() {
    }
}
