"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AgentListingMediaUploadActionState } from "@/actions/agent-property-listing-media.state";
import { errorResult } from "@/server/errors/result";
import {
  confirmListingMediaUploadForCurrentAgent,
  createListingMediaUploadForCurrentAgent,
} from "@/server/services/agent-property-listing-media.service";

const createUploadSchema = z.object({
  listingId: z.string().uuid(),
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  fileSizeBytes: z.coerce.number().int().positive(),
});

const confirmUploadSchema = createUploadSchema.extend({
  objectKey: z.string().trim().min(1),
  bucketName: z.string().trim().min(1),
  mediaType: z.enum(["image", "video"]),
});

export async function createAgentListingMediaUploadUrlAction(
  input: z.infer<typeof createUploadSchema>,
): Promise<AgentListingMediaUploadActionState> {
  try {
    const parsed = createUploadSchema.parse(input);
    const result = await createListingMediaUploadForCurrentAgent(parsed);

    return {
      ok: true,
      message: "Upload permission created.",
      uploadUrl: result.uploadUrl,
      objectKey: result.objectKey,
      bucketName: result.bucketName,
      mediaType: result.mediaType,
      publicUrl: result.publicUrl,
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function confirmAgentListingMediaUploadAction(
  input: z.infer<typeof confirmUploadSchema>,
): Promise<AgentListingMediaUploadActionState> {
  try {
    const parsed = confirmUploadSchema.parse(input);

    await confirmListingMediaUploadForCurrentAgent({
      listingId: parsed.listingId,
      objectKey: parsed.objectKey,
      bucketName: parsed.bucketName,
      mediaType: parsed.mediaType,
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      fileSizeBytes: parsed.fileSizeBytes,
    });

    revalidatePath("/agent/listings");
    revalidatePath(`/agent-listings/${parsed.listingId}`);

    return {
      ok: true,
      message: "Listing media uploaded successfully.",
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
