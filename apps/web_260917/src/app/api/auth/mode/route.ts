import { NextResponse } from 'next/server';
import { AuthMode } from '@/types/auth';

export async function GET() {
  const authMode = (process.env.AUTH_MODE || 'OPEN').toUpperCase() as AuthMode;
  return NextResponse.json({ authMode });
}
