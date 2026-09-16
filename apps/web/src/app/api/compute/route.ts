import { NextRequest, NextResponse } from "next/server";
import { fetchComputeUsage } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    let days: number | undefined;
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 365) {
        days = parsed;
      }
    }

    const result = await fetchComputeUsage({
      days,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch compute usage data",
        message: (error as Error).message,
        db_host: process.env.MYSQL_HOST || "127.0.0.1",
        db_name: process.env.MYSQL_DATABASE || "sf_umon_db",
        db_user: process.env.MYSQL_USER || "root",
      },
      { status: 500 }
    );
  }
}
