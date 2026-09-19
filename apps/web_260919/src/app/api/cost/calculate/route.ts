import { NextRequest, NextResponse } from "next/server";
import { fetchMonthlyCostCalculation } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month") || undefined;

    const result = await fetchMonthlyCostCalculation(month);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to calculate monthly cost",
        message: (error as Error).message,
        db_host: process.env.MYSQL_HOST || "127.0.0.1",
        db_name: process.env.MYSQL_DATABASE || "sf_umon_db",
        db_user: process.env.MYSQL_USER || "root",
      },
      { status: 500 }
    );
  }
}
