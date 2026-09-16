import React from 'react';
import {
  Bell,
  Database,
  KeyRound,
  Mail,
  Save,
  Settings,
  Shield,
  Sliders,
  UserCog,
} from 'lucide-react';

const settingSections = [
  {
    title: '기본 환경 설정',
    description: '서비스명, 기본 조회 기간, 화면 표시 옵션을 관리합니다.',
    icon: Sliders,
    items: ['기본 조회 기간: 최근 30일', '대시보드 자동 새로고침: 사용 안 함', '숫자 단위 표시: 자동 변환'],
  },
  {
    title: '사용자 및 권한 관리',
    description: '관리자, 일반 사용자, 조회 전용 권한을 설정합니다.',
    icon: UserCog,
    items: ['관리자 계정 관리', '메뉴별 접근 권한', '사용자별 데이터 조회 범위'],
  },
  {
    title: '데이터베이스 연결 설정',
    description: '모니터링 데이터 조회를 위한 연결 정보를 관리합니다.',
    icon: Database,
    items: ['MySQL 연결 정보', 'Snowflake 원천 테이블 매핑', '연결 상태 점검'],
  },
  {
    title: '보안 정책',
    description: '비밀번호, 세션, 접근 제한 정책을 설정합니다.',
    icon: Shield,
    items: ['비밀번호 만료 주기', '세션 유지 시간', 'IP 접근 제한'],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              <Settings className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">설정 관리</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                개발중
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            시스템 운영에 필요한 환경 설정, 권한, 알림, 데이터 연결 정보를 관리하는 임시 화면입니다.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-zinc-400 text-xs font-medium rounded-md cursor-not-allowed"
        >
          <Save className="h-3.5 w-3.5" />
          저장 준비중
        </button>
      </div>

      {/* 안내 영역 */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">설정 관리 화면 개발중</h2>
            <p className="text-xs text-zinc-500 mt-1 leading-5">
              현재 화면은 임시 페이지입니다. 향후 운영 환경 설정, 사용자 권한 관리,
              데이터베이스 연결 정보, 알림 정책 등의 기능이 추가될 예정입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 설정 카드 목록 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {settingSections.map((section) => {
          const Icon = section.icon;

          return (
            <div
              key={section.title}
              className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{section.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{section.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-zinc-700">{item}</span>
                    <span className="text-[11px] text-zinc-400">예정</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* 하단 임시 입력 영역 */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <KeyRound className="h-4 w-4 text-zinc-700" />
          <h2 className="text-sm font-bold text-zinc-800">운영 설정 예시</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700">시스템명</span>
            <input
              type="text"
              defaultValue="Snowflake 사용량 모니터링"
              disabled
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700">알림 이메일</span>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="email"
                defaultValue="admin@example.com"
                disabled
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-2 text-xs text-zinc-500"
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700">사용량 임계치 알림</span>
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <Bell className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-500">비활성화</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
