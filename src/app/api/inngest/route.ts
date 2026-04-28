import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "scaffolded",
      message:
        "Inngest route is available but background jobs are not active yet.",
    },
    {
      status: 200,
    },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: true,
      status: "scaffolded",
      message:
        "Inngest route is available but background jobs are not active yet.",
    },
    {
      status: 200,
    },
  );
}
