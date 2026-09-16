import { NextRequest, NextResponse } from "next/server";
import { confirmMonthlyBilling } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.billing_month || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: "필수 정보(billing_month, start_date, end_date)가 누락되었습니다." },
        { status: 400 }
      );
    }

    const payload = {
      billing_month: String(body.billing_month),
      start_date: String(body.start_date),
      end_date: String(body.end_date),
      storage_tb_avg: Number(body.storage_tb_avg) || 0,
      storage_unit_price: Number(body.storage_unit_price) || 0,
      storage_cost: Number(body.storage_cost) || 0,
      com_sf_credits: Number(body.com_sf_credits) || 0,
      com_sf_unit_price: Number(body.com_sf_unit_price) || 0,
      com_sf_cost: Number(body.com_sf_cost) || 0,
      com_ai_credits: Number(body.com_ai_credits) || 0,
      com_ai_unit_price: Number(body.com_ai_unit_price) || 0,
      com_ai_cost: Number(body.com_ai_cost) || 0,
      ai_token_credits: Number(body.ai_token_credits) || 0,
      ai_token_cost: Number(body.ai_token_cost) || 0,
      total_cost: Number(body.total_cost) || 0,
      note: body.note ? String(body.note) : undefined,
    };

    const savedRecord = await confirmMonthlyBilling(payload);

    return NextResponse.json({
      success: true,
      message: `${payload.billing_month} 요금이 성공적으로 확정되었습니다.`,
      data: savedRecord,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to confirm monthly billing",
        message: (error as Error).message,
        db_host: process.env.MYSQL_HOST || "127.0.0.1",
        db_name: process.env.MYSQL_DATABASE || "sf_umon_db",
        db_user: process.env.MYSQL_USER || "root",
      },
      { status: 500 }
    );
  }
}
