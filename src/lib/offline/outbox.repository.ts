import {
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  requestBopaBackgroundSync,
} from "@/lib/offline/service-worker-sync";
import type {
  OfflineEntityPayload,
  OfflineEntityType,
  OfflineMutationOperation,
  OfflineOutboxRecord,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

function createOutboxRecord(
  input: {
    ownerProfileId: string;
    workspaceType: OfflineWorkspaceType;
    workspaceId: string;
    entityType: OfflineEntityType;
    entityId: string;
    operation: OfflineMutationOperation;
    baseRevision: number | null;
    payload: OfflineEntityPayload;
  },
): OfflineOutboxRecord {
  const now = new Date().toISOString();

  return {
    clientMutationId: crypto.randomUUID(),
    ownerProfileId: input.ownerProfileId,
    workspaceType: input.workspaceType,
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    baseRevision: input.baseRevision,
    payload: input.payload,
    status: "waiting",
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function enqueueOfflineMutation(
  input: Parameters<
    typeof createOutboxRecord
  >[0],
) {
  const db = await openOfflineDatabase();
  const record = createOutboxRecord(input);

  await db.outbox.add(record);
  await requestBopaBackgroundSync();

  return record;
}

export async function recoverInterruptedOfflineMutations(
  ownerProfileId: string,
  olderThanMs = 2 * 60 * 1000,
) {
  const db = await openOfflineDatabase();
  const cutoff = new Date(
    Date.now() - olderThanMs,
  ).toISOString();
  const interrupted = await db.outbox
    .where("ownerProfileId")
    .equals(ownerProfileId)
    .filter(
      (record) =>
        record.status === "processing" &&
        record.updatedAt <= cutoff,
    )
    .toArray();

  if (interrupted.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();

  await db.transaction(
    "rw",
    db.outbox,
    async () => {
      for (const record of interrupted) {
        await db.outbox.update(
          record.clientMutationId,
          {
            status: "retry",
            nextAttemptAt: now,
            lastErrorCode:
              "OFFLINE_SYNC_INTERRUPTED",
            lastErrorMessage:
              "The previous sync was interrupted and will be retried.",
            updatedAt: now,
          },
        );
      }
    },
  );

  return interrupted.length;
}

export async function listReadyOfflineMutations(
  ownerProfileId: string,
  limit = 50,
) {
  const db = await openOfflineDatabase();
  const now = new Date().toISOString();
  const records = await db.outbox
    .where("ownerProfileId")
    .equals(ownerProfileId)
    .toArray();

  return records
    .filter(
      (record) =>
        record.status !== "processing" &&
        (
          !record.nextAttemptAt ||
          record.nextAttemptAt <= now
        ),
    )
    .sort((first, second) =>
      first.createdAt.localeCompare(
        second.createdAt,
      ),
    )
    .slice(0, Math.max(1, Math.min(limit, 100)));
}

export async function markOfflineMutationProcessing(
  clientMutationId: string,
) {
  const db = await openOfflineDatabase();

  await db.outbox.update(clientMutationId, {
    status: "processing",
    updatedAt: new Date().toISOString(),
  });
}

export async function markOfflineMutationForRetry(
  clientMutationId: string,
  input: {
    errorCode: string;
    errorMessage: string;
    retryAt: string;
  },
) {
  const db = await openOfflineDatabase();
  const current = await db.outbox.get(
    clientMutationId,
  );

  if (!current) {
    return;
  }

  await db.outbox.update(clientMutationId, {
    status: "retry",
    attemptCount: current.attemptCount + 1,
    nextAttemptAt: input.retryAt,
    lastErrorCode: input.errorCode,
    lastErrorMessage: input.errorMessage,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeOfflineMutation(
  clientMutationId: string,
) {
  const db = await openOfflineDatabase();

  await db.outbox.delete(clientMutationId);
}
