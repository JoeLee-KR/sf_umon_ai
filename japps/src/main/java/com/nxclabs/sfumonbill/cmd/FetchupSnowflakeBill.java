package com.nxclabs.sfumonbill.cmd;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

/**
 * TODO: Snowflake 에서 조회한 billing 데이터를 MySQL 로 적재(fetch + up)한다.
 * querys/up_storage.sql, querys/up_compute.sql 의 upsert 로직을 배치 작업으로 대체/자동화하는 용도.
 * 배치 스케줄러(cron 등)에서 주기적으로 이 커맨드를 호출하는 것을 상정한다.
 */
public final class FetchupSnowflakeBill implements Command {

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
    public void run(String[] args, EnvConfig env) {
        System.out.println("[cmd fetchup-snowflake-bill] TODO: 미구현. env=" + env.name());
    }
}
