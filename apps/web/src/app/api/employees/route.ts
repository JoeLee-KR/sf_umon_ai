import { NextResponse } from 'next/server';
import { fetchEmployees } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchEmployees();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch employee statistics',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
