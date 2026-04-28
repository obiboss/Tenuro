import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "scaffolded",
      message:
        "Rent due notifications cron route is available but not active yet. Monthly rent reminder logic is intentionally not enabled for the Nigerian annual-rent workflow.",
    },
    {
      status: 200,
    },
  );
}
