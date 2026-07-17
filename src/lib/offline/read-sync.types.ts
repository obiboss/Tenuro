import type {
  OfflineEntityPayload,
  OfflineEntityType,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

export type OfflineReadMode =
  | "full"
  | "delta";

export type OfflineReadEntity = {
  entityType: OfflineEntityType;
  entityId: string;
  serverRevision: number;
  updatedAt: string;
  deletedAt: string | null;
  data: OfflineEntityPayload;
};

export type OfflineReadResponse = {
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  workspaceName: string;
  mode: OfflineReadMode;
  cursor: string;
  generatedAt: string;
  entities: OfflineReadEntity[];
};
