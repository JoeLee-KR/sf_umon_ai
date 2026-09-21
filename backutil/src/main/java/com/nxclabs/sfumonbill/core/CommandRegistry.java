package com.nxclabs.sfumonbill.core;

import com.nxclabs.sfumonbill.check.CheckMysqlSfbill;
import com.nxclabs.sfumonbill.check.CheckSnowflakeSfbill;
import com.nxclabs.sfumonbill.cmd.FetchupSnowflakeBill;
import com.nxclabs.sfumonbill.cmd.GetMysqlSfbill;
import com.nxclabs.sfumonbill.cmd.GetSnowflakeSfbill;
import com.nxclabs.sfumonbill.cmd.CallAiWithSomebill;

import java.util.List;

/**
 * 새 커맨드를 추가하려면: check/ 또는 cmd/ 아래에 Command 구현 클래스를 만들고 이 목록에 등록한다.
 */
public final class CommandRegistry {

    private static final List<Command> COMMANDS = List.of(
            new CheckMysqlSfbill(),
            new CheckSnowflakeSfbill(),
            new GetMysqlSfbill(),
            new GetSnowflakeSfbill(),
            new FetchupSnowflakeBill(),
            new CallAiWithSomebill()
    );

    private CommandRegistry() {
    }

    public static List<Command> all() {
        return COMMANDS;
    }

    public static Command find(String path) {
        if (path == null) {
            return null;
        }
        return COMMANDS.stream()
                .filter(c -> c.path().equals(path))
                .findFirst()
                .orElse(null);
    }

    public static Command find(String group, String name) {
        return COMMANDS.stream()
                .filter(c -> c.group().equals(group) && c.name().equals(name))
                .findFirst()
                .orElse(null);
    }
}
