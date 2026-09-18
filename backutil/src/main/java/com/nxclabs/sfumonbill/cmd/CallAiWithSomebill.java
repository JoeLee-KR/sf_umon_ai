package com.nxclabs.sfumonbill.cmd;

import com.nxclabs.sfumonbill.core.Command;
import com.nxclabs.sfumonbill.core.EnvConfig;

/**
 * TODO: 적재된 billing 데이터를 바탕으로 외부 AI API(예: Claude/OpenAI)를 호출해
 * 사용량 추이 분석, 이상 탐지, 요약 리포트 등을 생성한다.
 * .env.[name] 에 AI_API_KEY, AI_MODEL 등을 정의해 사용한다.
 */
public final class CallAiWithSomebill implements Command {

    @Override
    public String group() {
        return "cmd";
    }

    @Override
    public String name() {
        return "somebill-call-ai";
    }

    @Override
    public String description() {
        return "billing 데이터를 외부 AI API 로 분석/요약";
    }

    @Override
    public void run(String[] args, EnvConfig env) {
        System.out.println("[cmd somebill-call-ai] TODO: 미구현. env=" + env.name());
    }
}
