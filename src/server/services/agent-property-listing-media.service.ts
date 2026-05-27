import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createAgentPropertyListingMedia,
  getMediaForAgentPropertyListings,
  type AgentPropertyListingMediaType,
} from "@/server/repositories/agent-property-listing-media.repository";
import { getAgentPropertyListingById } from "@/server/repositories/agent-property-listings.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import {
  buildR2PublicUrl,
  createR2PresignedUploadUrl,
  getR2BucketName,
} from "@/server/services/r2.service";
import { requireAgent } from "@/server/services/auth.service";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type ListingMediaUploadRequest = {
  listingId: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
};

function sanitizeFilename(filename: string) {
  return filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getMediaTypeFromMimeType(
  mimeType: string,
): AgentPropertyListingMediaType {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return "image";
  }

  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)) {
    return "video";
  }

  throw new AppError(
    "UNSUPPORTED_LISTING_MEDIA_TYPE",
    "Only JPG, PNG, WEBP, MP4, WEBM, and MOV files are supported.",
    400,
  );
}

function assertFileSize(params: {
  mediaType: AgentPropertyListingMediaType;
  fileSizeBytes: number;
}) {
  if (!Number.isInteger(params.fileSizeBytes) || params.fileSizeBytes <= 0) {
    throw new AppError(
      "INVALID_LISTING_MEDIA_SIZE",
      "Media file size is invalid.",
      400,
    );
  }

  const maxBytes =
    params.mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (params.fileSizeBytes > maxBytes) {
    throw new AppError(
      "LISTING_MEDIA_TOO_LARGE",
      params.mediaType === "image"
        ? "Images must not be larger than 8MB."
        : "Videos must not be larger than 80MB.",
      400,
    );
  }
}

function createMediaObjectKey(params: {
  agentId: string;
  listingId: string;
  filename: string;
}) {
  const safeFilename = sanitizeFilename(params.filename);
  const extension = safeFilename.includes(".")
    ? safeFilename.split(".").pop()
    : null;

  const objectId = crypto.randomUUID().replaceAll("-", "");
  const finalFilename = extension ? `${objectId}.${extension}` : objectId;

  return `agent-listings/${params.agentId}/${params.listingId}/${finalFilename}`;
}

export async function createListingMediaUploadForCurrentAgent(
  input: ListingMediaUploadRequest,
) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();
  const listing = await getAgentPropertyListingById(supabase, input.listingId);

  if (listing.agent_id !== agent.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to upload media for this listing.",
      403,
    );
  }

  const mediaType = getMediaTypeFromMimeType(input.mimeType);

  assertFileSize({
    mediaType,
    fileSizeBytes: input.fileSizeBytes,
  });

  const objectKey = createMediaObjectKey({
    agentId: agent.id,
    listingId: listing.id,
    filename: input.filename,
  });

  const uploadUrl = await createR2PresignedUploadUrl({
    objectKey,
    mimeType: input.mimeType,
  });

  return {
    uploadUrl,
    objectKey,
    bucketName: getR2BucketName(),
    mediaType,
    publicUrl: buildR2PublicUrl(objectKey),
  };
}

export async function confirmListingMediaUploadForCurrentAgent(params: {
  listingId: string;
  objectKey: string;
  bucketName: string;
  mediaType: AgentPropertyListingMediaType;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  const agent = await requireAgent();
  const supabase = createSupabaseAdminClient();
  const listing = await getAgentPropertyListingById(supabase, params.listingId);

  if (listing.agent_id !== agent.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to save media for this listing.",
      403,
    );
  }

  const expectedPrefix = `agent-listings/${agent.id}/${listing.id}/`;

  if (!params.objectKey.startsWith(expectedPrefix)) {
    throw new AppError(
      "INVALID_LISTING_MEDIA_OBJECT_KEY",
      "Uploaded media path is invalid.",
      400,
    );
  }

  const mediaType = getMediaTypeFromMimeType(params.mimeType);

  if (mediaType !== params.mediaType) {
    throw new AppError(
      "LISTING_MEDIA_TYPE_MISMATCH",
      "Uploaded media type does not match the saved media type.",
      400,
    );
  }

  assertFileSize({
    mediaType,
    fileSizeBytes: params.fileSizeBytes,
  });

  const existingMedia = await getMediaForAgentPropertyListings(supabase, [
    listing.id,
  ]);

  return createAgentPropertyListingMedia(supabase, {
    agentPropertyListingId: listing.id,
    uploadedByProfileId: agent.id,
    mediaType,
    bucketName: params.bucketName,
    objectKey: params.objectKey,
    originalFilename: params.filename,
    mimeType: params.mimeType,
    fileSizeBytes: params.fileSizeBytes,
    displayOrder: existingMedia.length,
    isCover: existingMedia.length === 0 && mediaType === "image",
    metadata: {
      public_url: buildR2PublicUrl(params.objectKey),
    },
  });
}
