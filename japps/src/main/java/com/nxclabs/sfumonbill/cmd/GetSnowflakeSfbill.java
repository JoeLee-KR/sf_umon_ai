package com.nxclabs.sfumonbill.cmd;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

/**
 * TODO: Snowflake ACCOUNT_USAGE 에서 billing 관련 원본 데이터(storage/compute usage)를 조회한다.
 * querys/sf_samples/ 의 sample_storage_usage.csv, sample_metering_daily_history.csv 형태의 데이터를 다룬다.
 */
public final class GetSnowflakeSfbill implements Command {

    @Override
    public String group() {
        return "cmd";
    }

    @Override
    public String name() {
        return "snowflake-sfbill";
    }

    @Override
    public String description() {
        return "Snowflake ACCOUNT_USAGE billing 원본 데이터 조회";
    }

    @Override
    public void run(String[] args, EnvConfig env) {
        System.out.println("[cmd snowflake-sfbill] TODO: 미구현. env=" + env.name());
    }
}
