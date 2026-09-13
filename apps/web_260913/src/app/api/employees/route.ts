import { NextResponse } from "next/server";
import { fetchEmployees } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchEmployees();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch employee statistics",
        message: (error as Error).message,
        db_host: process.env.MYSQL_HOST || "127.0.0.1",
        db_name: process.env.MYSQL_DATABASE || "sf_umon_db",
        db_user: process.env.MYSQL_USER || "root",
      },
      { status: 500 }
    );
  }
}
