import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "scaffolded",
      message:
        "Overdue alerts cron route is available but not active yet. Outstanding-balance duration logic has not been enabled.",
    },
    {
      status: 200,
    },
  );
}
