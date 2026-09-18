package com.nxclabs.sfumonbill.cmd;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

/**
 * TODO: MySQL 에 적재된 billing 관련 데이터(sf_storage_usage 등)를 조회해 출력/반환한다.
 * apps/web 의 /api/storage, /api/compute 라우트가 조회하는 것과 동일한 테이블을 다룬다.
 */
public final class GetMysqlSfbill implements Command {

    @Override
    public String group() {
        return "cmd";
    }

    @Override
    public String name() {
        return "mysql-sfbill";
    }

    @Override
    public String description() {
        return "MySQL 에 적재된 billing 데이터 조회";
    }

    @Override
    public void run(String[] args, EnvConfig env) {
        System.out.println("[cmd mysql-sfbill] TODO: 미구현. env=" + env.name());
    }
}
