import type {
  OfflineEntityPayload,
  OfflineEntityType,
  OfflineMutationOperation,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

export type OfflineSafeMutationRequest = {
  clientMutationId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  entityType: OfflineEntityType;
  entityId: string;
  operation: OfflineMutationOperation;
  baseRevision: number | null;
  payload: OfflineEntityPayload;
};

export type OfflineSafeMutationEntity = {
  entityType: OfflineEntityType;
  entityId: string;
  serverRevision: number;
  updatedAt: string;
  deletedAt: string | null;
  data: OfflineEntityPayload;
};

export type OfflineSafeMutationAppliedResult = {
  clientMutationId: string;
  status: "applied" | "duplicate";
  entity: OfflineSafeMutationEntity;
};

export type OfflineSafeMutationConflictResult = {
  clientMutationId: string;
  status: "conflict";
  code: "OFFLINE_CONFLICT";
  message: string;
  serverEntity: OfflineSafeMutationEntity;
};

export type OfflineSafeMutationRejectedResult = {
  clientMutationId: string;
  status: "rejected";
  code: string;
  message: string;
  serverEntity?: OfflineSafeMutationEntity;
};

export type OfflineSafeMutationRetryResult = {
  clientMutationId: string;
  status: "retry";
  code: string;
  message: string;
};

export type OfflineSafeMutationResult =
  | OfflineSafeMutationAppliedResult
  | OfflineSafeMutationConflictResult
  | OfflineSafeMutationRejectedResult
  | OfflineSafeMutationRetryResult;

export type OfflineSafeMutationBatchResponse = {
  results: OfflineSafeMutationResult[];
};
