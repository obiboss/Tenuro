import {
  openOfflineDatabase,
} from "@/lib/offline/database";
import type {
  OfflineConflictRecord,
  OfflineEntityPayload,
  OfflineEntityType,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

export async function addOfflineConflict(
  input: {
    ownerProfileId: string;
    workspaceType: OfflineWorkspaceType;
    workspaceId: string;
    entityType: OfflineEntityType;
    entityId: string;
    clientMutationId: string;
    operation?: "create" | "update" | "delete";
    localPayload: OfflineEntityPayload;
    serverPayload: OfflineEntityPayload;
    baseRevision: number | null;
    serverRevision: number;
    reasonCode?: string;
    reasonMessage?: string;
  },
) {
  const db = await openOfflineDatabase();
  const record: OfflineConflictRecord = {
    id: crypto.randomUUID(),
    ...input,
    status: "unresolved",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  await db.conflicts.add(record);

  return record;
}

export async function resolveOfflineConflict(
  conflictId: string,
) {
  const db = await openOfflineDatabase();

  await db.conflicts.update(conflictId, {
    status: "resolved",
    resolvedAt: new Date().toISOString(),
  });
}
