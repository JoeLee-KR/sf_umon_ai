package com.nxclabs.sfumonbill;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.CommandRegistry;
import com.nxclabs.sfumonbill.core.EnvConfig;

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
 *   java -jar Main.jar &lt;group&gt;/&lt;name&gt; [--env=FILE] [args...]
 *
 * 예:
 *   java -jar Main.jar check/mysql-sfbill
 *   java -jar Main.jar check/mysql-sfbill --env=.env.default
 *   java -jar Main.jar cmd/fetchup-snowflake-bill --env=.env.prod
 *   java -jar Main.jar cmd/fetchup-snowflake-bill --env=config/.env.test   (config/.env.test 를 사용)
 */
public final class Main {

    public static void main(String[] args) {
        if (args.length == 0 || "help".equals(args[0]) || "--help".equals(args[0]) || "-h".equals(args[0])) {
            printUsage();
            return;
        }

        String target = args[0];
        String group;
        String name;
        int nextArgIndex = 1;

        if (target.contains("/")) {
            String[] parts = target.split("/", 2);
            group = parts[0];
            name = parts[1];
        } else if (args.length >= 2 && !args[1].startsWith("--")) {
            // 하위 호환: <group> <name> 분리 입력 허용
            group = target;
            name = args[1];
            nextArgIndex = 2;
        } else {
            System.err.println("[오류] 커맨드는 <group>/<name> 형태로 지정해야 합니다 (예: check/mysql-sfbill).");
            printUsage();
            System.exit(1);
            return;
        }

        String envName = null;
        List<String> remaining = new ArrayList<>();

        for (int i = nextArgIndex; i < args.length; i++) {
            String arg = args[i];
            if (arg.startsWith("--env=")) {
                envName = arg.substring("--env=".length());
            } else {
                remaining.add(arg);
            }
        }

        Command command = CommandRegistry.find(group, name);
        if (command == null) {
            System.err.println("[오류] 알 수 없는 커맨드입니다: " + group + "/" + name);
            printUsage();
            System.exit(1);
            return;
        }

        try {
            EnvConfig env = EnvConfig.load(envName);
            command.run(remaining.toArray(new String[0]), env);
        } catch (Exception e) {
            System.err.println("[실패] " + group + "/" + name + " : " + e.getMessage());
            System.exit(1);
        }
    }

    private static void printUsage() {
        System.out.println("sf_umon_ai / backutil - Main.jar");
        System.out.println();
        System.out.println("사용법:");
        System.out.println("  java -jar Main.jar <group>/<name> [--env=FILE] [args...]");
        System.out.println();
        System.out.println("옵션:");
        System.out.println("  --env=FILE       FILE 을 .env 파일로 로드 (기본값: .env.default)");
        System.out.println("                   파일명 전체를 적는다 (예: --env=.env.myconf)");
        System.out.println("                   디렉터리를 포함시킬 수 있다 (예: --env=config/.env.test)");
        System.out.println("                   디렉터리 없이 파일명만 주면 Main.jar 파일이 있는 디렉터리에서 찾는다");
        System.out.println();
        System.out.println("사용 가능한 커맨드:");

        Map<String, List<Command>> byGroup = new TreeMap<>();
        for (Command c : CommandRegistry.all()) {
            byGroup.computeIfAbsent(c.group(), g -> new ArrayList<>()).add(c);
        }

        for (Map.Entry<String, List<Command>> entry : byGroup.entrySet()) {
            System.out.println("  [" + entry.getKey() + "]");
            for (Command c : entry.getValue()) {
                System.out.printf("    %-30s %s%n", c.path(), c.description());
            }
        }
    }

    private Main() {
    }
}
