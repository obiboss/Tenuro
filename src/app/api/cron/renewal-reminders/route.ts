import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "scaffolded",
      message:
        "Renewal reminders cron route is available but not active yet. The 90/60/30-day renewal reminder engine has not been enabled.",
    },
    {
      status: 200,
    },
  );
}
