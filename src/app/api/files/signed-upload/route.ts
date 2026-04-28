import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      status: "scaffolded",
      message:
        "Signed upload is not active yet. Tenant document storage has not been enabled.",
    },
    {
      status: 501,
    },
  );
}
