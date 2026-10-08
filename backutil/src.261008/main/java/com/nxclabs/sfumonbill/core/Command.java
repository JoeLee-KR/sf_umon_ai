package com.nxclabs.sfumonbill.core;

/**
 * check/, cmd/ 아래의 모든 유틸리티/배치 클래스가 구현하는 공통 인터페이스.
 * Main 이 group()+name() 으로 커맨드를 찾아 run() 을 호출한다.
 */
public interface Command {

    String group();

    String name();

    default String path() {
        return group() + "/" + name();
    }

    String description();

    void run(String[] args, EnvConfig env) throws Exception;
}
