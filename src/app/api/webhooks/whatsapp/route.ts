import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: true,
      status: "scaffolded",
      message:
        "WhatsApp webhook route is available but dispatch/status processing is not active yet.",
    },
    {
      status: 200,
    },
  );
}
