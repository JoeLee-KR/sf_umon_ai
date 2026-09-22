import { redirect } from 'next/navigation';

export default function RootPage() {
  // 💡 기본 첫 화면: 대시보드(/dashboard)
  redirect('/dashboard');
}