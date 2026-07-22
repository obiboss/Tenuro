import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors/app-error";
import { getManagerTenantDetailsDownload } from "@/server/services/manager-tenant-details.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    tenantId: string;
  }>;
};

export async function GET(_request: Request, { params }: Props) {
  try {
    const { tenantId } = await params;
    const download = await getManagerTenantDetailsDownload(tenantId);

    return new NextResponse(new Uint8Array(download.fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${download.fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { ok: false, message: error.userMessage },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, message: "Tenant details could not be downloaded." },
      { status: 500 },
    );
  }
}
