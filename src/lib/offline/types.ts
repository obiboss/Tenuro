export type OfflineWorkspaceType =
  | "manager"
  | "developer"
  | "landlord";

export type OfflineEntityType =
  | "manager_property"
  | "manager_unit"
  | "manager_tenant"
  | "manager_maintenance_request"
  | "developer_estate"
  | "developer_plot"
  | "developer_buyer"
  | "developer_sale";

export type OfflineMutationOperation =
  | "create"
  | "update"
  | "delete";

export type OfflineOutboxStatus =
  | "waiting"
  | "processing"
  | "retry";

export type OfflineConflictStatus =
  | "unresolved"
  | "resolved";

export type OfflineStoragePersistenceStatus =
  | "unknown"
  | "granted"
  | "best_effort"
  | "unsupported";

export type OfflineSyncRuntimeState =
  | "idle"
  | "syncing"
  | "error";

export type OfflineEntityPayload =
  Record<string, unknown>;

export type OfflineEntityRecord = {
  localKey: string;
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  entityType: OfflineEntityType;
  entityId: string;
  serverRevision: number;
  serverUpdatedAt: string | null;
  localUpdatedAt: string;
  deletedAt: string | null;
  data: OfflineEntityPayload;
};

export type OfflineWorkspaceRecord = {
  localKey: string;
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  workspaceName: string;
  registeredAt: string;
  lastOpenedAt: string;
};

export type OfflineOutboxRecord = {
  clientMutationId: string;
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  entityType: OfflineEntityType;
  entityId: string;
  operation: OfflineMutationOperation;
  baseRevision: number | null;
  payload: OfflineEntityPayload;
  status: OfflineOutboxStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OfflineSyncCursorRecord = {
  localKey: string;
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  cursor: string | null;
  updatedAt: string;
};

export type OfflineConflictRecord = {
  id: string;
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  entityType: OfflineEntityType;
  entityId: string;
  clientMutationId: string;
  operation?: OfflineMutationOperation;
  localPayload: OfflineEntityPayload;
  serverPayload: OfflineEntityPayload;
  baseRevision: number | null;
  serverRevision: number;
  reasonCode?: string;
  reasonMessage?: string;
  status: OfflineConflictStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type OfflineDraftRecord = {
  localKey: string;
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  draftType: string;
  draftId: string;
  data: OfflineEntityPayload;
  createdAt: string;
  updatedAt: string;
};

export type OfflineMetaRecord = {
  key: string;
  value: string;
  updatedAt: string;
};

export type OfflineRuntimeSnapshot = {
  ready: boolean;
  pendingCount: number;
  conflictCount: number;
  syncState: OfflineSyncRuntimeState;
  lastSyncError: string | null;
};


export type OfflineStorageLevel =
  | "unknown"
  | "healthy"
  | "warning"
  | "critical";

export type OfflineStaleLevel =
  | "unknown"
  | "fresh"
  | "stale"
  | "very_stale";

export type OfflineHealthSnapshot = {
  ready: boolean;
  storageLevel: OfflineStorageLevel;
  staleLevel: OfflineStaleLevel;
  usageBytes: number | null;
  quotaBytes: number | null;
  usageRatio: number | null;
  persistenceStatus:
    OfflineStoragePersistenceStatus;
  lastReadSyncAt: string | null;
};
