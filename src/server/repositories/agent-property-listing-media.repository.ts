import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentPropertyListingMediaType = "image" | "video";
export type AgentPropertyListingMediaStatus = "active" | "hidden" | "deleted";

export type AgentPropertyListingMediaRow = {
  id: string;
  agent_property_listing_id: string;
  uploaded_by_profile_id: string;
  media_type: AgentPropertyListingMediaType;
  storage_provider: string;
  bucket_name: string;
  object_key: string;
  thumbnail_object_key: string | null;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  display_order: number;
  is_cover: boolean;
  status: AgentPropertyListingMediaStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const AGENT_PROPERTY_LISTING_MEDIA_SELECT = `
  id,
  agent_property_listing_id,
  uploaded_by_profile_id,
  media_type,
  storage_provider,
  bucket_name,
  object_key,
  thumbnail_object_key,
  original_filename,
  mime_type,
  file_size_bytes,
  display_order,
  is_cover,
  status,
  metadata,
  created_at,
  updated_at,
  deleted_at
`;

export async function getMediaForAgentPropertyListings(
  supabase: SupabaseClient,
  listingIds: string[],
) {
  if (listingIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("agent_property_listing_media")
    .select(AGENT_PROPERTY_LISTING_MEDIA_SELECT)
    .in("agent_property_listing_id", listingIds)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AgentPropertyListingMediaRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAgentPropertyListingMedia(
  supabase: SupabaseClient,
  params: {
    agentPropertyListingId: string;
    uploadedByProfileId: string;
    mediaType: AgentPropertyListingMediaType;
    bucketName: string;
    objectKey: string;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    displayOrder: number;
    isCover: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("agent_property_listing_media")
    .insert({
      agent_property_listing_id: params.agentPropertyListingId,
      uploaded_by_profile_id: params.uploadedByProfileId,
      media_type: params.mediaType,
      storage_provider: "cloudflare_r2",
      bucket_name: params.bucketName,
      object_key: params.objectKey,
      thumbnail_object_key: null,
      original_filename: params.originalFilename,
      mime_type: params.mimeType,
      file_size_bytes: params.fileSizeBytes,
      display_order: params.displayOrder,
      is_cover: params.isCover,
      status: "active",
      metadata: params.metadata ?? {},
    })
    .select(AGENT_PROPERTY_LISTING_MEDIA_SELECT)
    .single<AgentPropertyListingMediaRow>();

  if (error) {
    throw error;
  }

  return data;
}
