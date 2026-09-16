import { NextRequest, NextResponse } from "next/server";
import { fetchMonthlyBillingHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthsParam = searchParams.get("months");

    let monthsLimit: number | undefined;
    if (monthsParam) {
      const parsed = parseInt(monthsParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        monthsLimit = parsed;
      }
    }

    const result = await fetchMonthlyBillingHistory({ monthsLimit });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch monthly billing history",
        message: (error as Error).message,
        db_host: process.env.MYSQL_HOST || "127.0.0.1",
        db_name: process.env.MYSQL_DATABASE || "sf_umon_db",
        db_user: process.env.MYSQL_USER || "root",
      },
      { status: 500 }
    );
  }
}
