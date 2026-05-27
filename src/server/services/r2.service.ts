import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/server/errors/app-error";

const PRESIGNED_UPLOAD_EXPIRES_SECONDS = 300;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new AppError(
      "R2_CONFIGURATION_MISSING",
      "Cloudflare R2 media storage is not configured.",
      500,
    );
  }

  return value.trim();
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${getRequiredEnv(
      "CLOUDFLARE_R2_ACCOUNT_ID",
    )}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function getR2BucketName() {
  return getRequiredEnv("CLOUDFLARE_R2_BUCKET_NAME");
}

export function buildR2PublicUrl(objectKey: string) {
  const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${objectKey}`;
}

export async function createR2PresignedUploadUrl(params: {
  objectKey: string;
  mimeType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: params.objectKey,
    ContentType: params.mimeType,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: PRESIGNED_UPLOAD_EXPIRES_SECONDS,
  });
}
