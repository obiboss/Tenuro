import type { AgentPropertyListingMediaType } from "@/server/repositories/agent-property-listing-media.repository";

export type AgentListingMediaUploadActionState = {
  ok: boolean;
  message: string;
  uploadUrl?: string;
  objectKey?: string;
  bucketName?: string;
  mediaType?: AgentPropertyListingMediaType;
  publicUrl?: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialAgentListingMediaUploadActionState: AgentListingMediaUploadActionState =
  {
    ok: false,
    message: "",
  };
