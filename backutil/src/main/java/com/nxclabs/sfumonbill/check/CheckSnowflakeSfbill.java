package com.nxclabs.sfumonbill.check;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

/**
 * TODO: Snowflake 연결 상태 및 ACCOUNT_USAGE 조회 권한을 점검한다.
 * 1) .env.[name] 의 SNOWFLAKE_ACCOUNT/USER/PASSWORD(또는 KEY)/WAREHOUSE/ROLE 로 커넥션 생성
 * 2) SELECT CURRENT_VERSION() 등으로 연결 확인
 * 3) SNOWFLAKE.ACCOUNT_USAGE.STORAGE_USAGE / METERING_DAILY_HISTORY 조회 권한 확인
 */
public final class CheckSnowflakeSfbill implements Command {

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
    public void run(String[] args, EnvConfig env) {
        System.out.println("[check snowflake-sfbill] TODO: 미구현. env=" + env.name());
    }
}
