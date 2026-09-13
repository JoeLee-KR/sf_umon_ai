import { redirect } from 'next/navigation';

export default function RootPage() {
  // 💡 [기본 첫 화면 설정]
  // 1. 임직원 통계를 첫 화면으로 설정하려면 아래 코드를 활성화하세요 (현재 기본 설정):
  // redirect('/employees');

  // 2. 만약 대시보드를 첫 화면으로 설정하려면 아래 주석을 활성화하고 위를 주석처리 하세요:
  redirect('/dashboard');
}