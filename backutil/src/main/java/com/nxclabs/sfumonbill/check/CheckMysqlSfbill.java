package com.nxclabs.sfumonbill.check;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

/**
 * TODO: MySQL 연결 상태 및 sf_umon_ai 관련 billing 테이블 존재 여부를 점검한다.
 * 1) .env.[name] 의 MYSQL_HOST/PORT/USER/PASSWORD/DATABASE 로 커넥션 생성
 * 2) SELECT 1 등으로 연결 확인
 * 3) 필요한 테이블(sf_storage_usage 등) 존재 여부 확인 후 결과 출력
 */
public final class CheckMysqlSfbill implements Command {

    @Override
    public String group() {
        return "check";
    }

    @Override
    public String name() {
        return "mysql-sfbill";
    }

    @Override
    public String description() {
        return "MySQL 연결 및 billing 테이블 상태 점검";
    }

    @Override
    public void run(String[] args, EnvConfig env) {
        System.out.println("[check mysql-sfbill] TODO: 미구현. env=" + env.name());
    }
}
