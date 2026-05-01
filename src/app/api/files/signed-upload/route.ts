import { NextResponse } from "next/server";
import { errorResult } from "@/server/errors/result";
import { uploadTenantKycDocument } from "@/server/services/files.service";
import { tenantKycUploadSchema } from "@/server/validators/file.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const parsed = tenantKycUploadSchema.parse({
      token: formData.get("token"),
      documentType: formData.get("documentType"),
    });

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Select a file to upload.",
        },
        {
          status: 400,
        },
      );
    }

    const uploadedFile = await uploadTenantKycDocument({
      token: parsed.token,
      documentType: parsed.documentType,
      file,
    });

    return NextResponse.json({
      ok: true,
      message: "File uploaded successfully.",
      file: uploadedFile,
    });
  } catch (error) {
    console.error("tenant KYC upload failed:", error);

    const result = errorResult(error);

    return NextResponse.json(
      {
        ok: false,
        message: result.message,
        fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      },
      {
        status: 400,
      },
    );
  }
}
