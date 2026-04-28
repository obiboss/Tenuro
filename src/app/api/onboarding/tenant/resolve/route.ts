import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      status: "scaffolded",
      message:
        "Tenant onboarding token resolution is not active yet. Public onboarding form has not been enabled.",
    },
    {
      status: 501,
    },
  );
}
