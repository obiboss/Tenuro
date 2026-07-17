import {
  addOfflineConflict,
} from "@/lib/offline/conflict.repository";
import {
  clearOfflineDatabase,
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  putOfflineEntity,
  removeOfflineEntity,
} from "@/lib/offline/entity.repository";
import {
  createOfflineWorkspaceKey,
} from "@/lib/offline/keys";
import {
  getOfflineOwnerProfileId,
} from "@/lib/offline/meta.repository";
import {
  listReadyOfflineMutations,
  markOfflineMutationForRetry,
  recoverInterruptedOfflineMutations,
  markOfflineMutationProcessing,
  removeOfflineMutation,
} from "@/lib/offline/outbox.repository";
import type {
  OfflineSafeMutationBatchResponse,
  OfflineSafeMutationEntity,
  OfflineSafeMutationResult,
} from "@/lib/offline/safe-mutation.types";
import type {
  OfflineOutboxRecord,
} from "@/lib/offline/types";

const MAX_SYNC_BATCH = 25;
const MAX_RETRY_ATTEMPTS = 6;
const BASE_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS =
  30 * 60 * 1000;

const ACCESS_REVOKED_CODES = new Set([
  "OFFLINE_PROFILE_INACTIVE",
  "OFFLINE_MANAGER_ACCESS_REQUIRED",
  "OFFLINE_DEVELOPER_ACCESS_REQUIRED",
  "OFFLINE_WORKSPACE_ACCESS_REVOKED",
  "OFFLINE_WORKSPACE_MISMATCH",
]);

function getRetryAt(
  attemptCount: number,
) {
  const delay = Math.min(
    BASE_RETRY_DELAY_MS *
      2 ** Math.max(0, attemptCount),
    MAX_RETRY_DELAY_MS,
  );

  return new Date(
    Date.now() + delay,
  ).toISOString();
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isResult(
  value: unknown,
): value is OfflineSafeMutationResult {
  return (
    isObject(value) &&
    typeof value.clientMutationId ===
      "string" &&
    typeof value.status === "string"
  );
}

function isBatchResponse(
  value: unknown,
): value is OfflineSafeMutationBatchResponse {
  return (
    isObject(value) &&
    Array.isArray(value.results) &&
    value.results.every(isResult)
  );
}

async function moveRetryExhaustedToReview(
  mutation: OfflineOutboxRecord,
) {
  await requireFullReadRefresh(
    mutation,
  );

  await addOfflineConflict({
    ownerProfileId:
      mutation.ownerProfileId,
    workspaceType:
      mutation.workspaceType,
    workspaceId:
      mutation.workspaceId,
    entityType:
      mutation.entityType,
    entityId:
      mutation.entityId,
    clientMutationId:
      mutation.clientMutationId,
    operation: mutation.operation,
    localPayload:
      mutation.payload,
    serverPayload: {},
    baseRevision:
      mutation.baseRevision,
    serverRevision:
      mutation.baseRevision ?? 0,
    reasonCode:
      "OFFLINE_RETRY_LIMIT_REACHED",
    reasonMessage:
      "This change could not be sent after several attempts. Review it before trying again.",
  });

  await removeOfflineMutation(
    mutation.clientMutationId,
  );
}

async function applyServerEntity(
  mutation: OfflineOutboxRecord,
  entity: OfflineSafeMutationEntity,
) {
  await putOfflineEntity({
    ownerProfileId:
      mutation.ownerProfileId,
    workspaceType:
      mutation.workspaceType,
    workspaceId:
      mutation.workspaceId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    serverRevision:
      entity.serverRevision,
    serverUpdatedAt: entity.updatedAt,
    deletedAt: entity.deletedAt,
    data: entity.data,
  });
}

async function requireFullReadRefresh(
  mutation: OfflineOutboxRecord,
) {
  const db = await openOfflineDatabase();
  const workspaceKey =
    createOfflineWorkspaceKey({
      ownerProfileId:
        mutation.ownerProfileId,
      workspaceType:
        mutation.workspaceType,
      workspaceId:
        mutation.workspaceId,
    });

  await db.meta.delete(
    `readFullSync:${workspaceKey}`,
  );
}

async function moveToReview(
  mutation: OfflineOutboxRecord,
  result:
    | Extract<
        OfflineSafeMutationResult,
        { status: "conflict" }
      >
    | Extract<
        OfflineSafeMutationResult,
        { status: "rejected" }
      >,
) {
  const serverEntity =
    "serverEntity" in result
      ? result.serverEntity
      : undefined;

  if (serverEntity) {
    await applyServerEntity(
      mutation,
      serverEntity,
    );
  } else if (
    mutation.operation === "create"
  ) {
    await removeOfflineEntity({
      ownerProfileId:
        mutation.ownerProfileId,
      workspaceType:
        mutation.workspaceType,
      workspaceId:
        mutation.workspaceId,
      entityType:
        mutation.entityType,
      entityId:
        mutation.entityId,
    });
  } else {
    await requireFullReadRefresh(
      mutation,
    );
  }

  await addOfflineConflict({
    ownerProfileId:
      mutation.ownerProfileId,
    workspaceType:
      mutation.workspaceType,
    workspaceId:
      mutation.workspaceId,
    entityType:
      mutation.entityType,
    entityId:
      mutation.entityId,
    clientMutationId:
      mutation.clientMutationId,
    operation: mutation.operation,
    localPayload:
      mutation.payload,
    serverPayload:
      serverEntity?.data ?? {},
    baseRevision:
      mutation.baseRevision,
    serverRevision:
      serverEntity?.serverRevision ?? 0,
    reasonCode: result.code,
    reasonMessage: result.message,
  });

  await removeOfflineMutation(
    mutation.clientMutationId,
  );
}

async function handleResult(
  mutation: OfflineOutboxRecord,
  result: OfflineSafeMutationResult,
) {
  switch (result.status) {
    case "applied":
    case "duplicate":
      await applyServerEntity(
        mutation,
        result.entity,
      );
      await removeOfflineMutation(
        mutation.clientMutationId,
      );
      return;

    case "conflict":
      await moveToReview(
        mutation,
        result,
      );
      return;

    case "rejected":
      if (
        ACCESS_REVOKED_CODES.has(
          result.code,
        )
      ) {
        await clearOfflineDatabase();
        return;
      }

      await moveToReview(
        mutation,
        result,
      );
      return;

    case "retry":
      await markOfflineMutationForRetry(
        mutation.clientMutationId,
        {
          errorCode: result.code,
          errorMessage: result.message,
          retryAt: getRetryAt(
            mutation.attemptCount,
          ),
        },
      );
  }
}

async function markBatchForRetry(
  mutations: OfflineOutboxRecord[],
  code: string,
  message: string,
) {
  await Promise.all(
    mutations.map((mutation) =>
      markOfflineMutationForRetry(
        mutation.clientMutationId,
        {
          errorCode: code,
          errorMessage: message,
          retryAt: getRetryAt(
            mutation.attemptCount,
          ),
        },
      ),
    ),
  );
}

export async function pushOfflineSafeMutations() {
  if (
    typeof navigator === "undefined" ||
    !navigator.onLine
  ) {
    return;
  }

  const ownerProfileId =
    await getOfflineOwnerProfileId();

  if (!ownerProfileId) {
    return;
  }

  await recoverInterruptedOfflineMutations(
    ownerProfileId,
  );

  const mutations =
    await listReadyOfflineMutations(
      ownerProfileId,
      MAX_SYNC_BATCH,
    );

  if (mutations.length === 0) {
    return;
  }

  await Promise.all(
    mutations.map((mutation) =>
      markOfflineMutationProcessing(
        mutation.clientMutationId,
      ),
    ),
  );

  let response: Response;

  try {
    response = await fetch(
      "/api/offline/push",
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          mutations: mutations.map(
            (mutation) => ({
              clientMutationId:
                mutation.clientMutationId,
              workspaceType:
                mutation.workspaceType,
              workspaceId:
                mutation.workspaceId,
              entityType:
                mutation.entityType,
              entityId:
                mutation.entityId,
              operation:
                mutation.operation,
              baseRevision:
                mutation.baseRevision,
              payload: mutation.payload,
            }),
          ),
        }),
      },
    );
  } catch {
    await markBatchForRetry(
      mutations,
      "OFFLINE_NETWORK_UNAVAILABLE",
      "The internet connection was interrupted.",
    );

    throw new Error(
      "Offline changes could not be synced.",
    );
  }

  if (!response.ok) {
    await markBatchForRetry(
      mutations,
      response.status === 401
        ? "OFFLINE_SESSION_EXPIRED"
        : "OFFLINE_SERVER_UNAVAILABLE",
      response.status === 401
        ? "Please sign in again to sync offline changes."
        : "The server is temporarily unavailable.",
    );

    throw new Error(
      "Offline changes could not be synced.",
    );
  }

  const responseBody: unknown =
    await response.json();

  if (!isBatchResponse(responseBody)) {
    await markBatchForRetry(
      mutations,
      "OFFLINE_INVALID_SERVER_RESPONSE",
      "The server returned an invalid response.",
    );

    throw new Error(
      "Offline changes could not be synced.",
    );
  }

  const resultByMutationId =
    new Map(
      responseBody.results.map(
        (result) => [
          result.clientMutationId,
          result,
        ],
      ),
    );

  for (const mutation of mutations) {
    const result =
      resultByMutationId.get(
        mutation.clientMutationId,
      );

    if (!result) {
      await markOfflineMutationForRetry(
        mutation.clientMutationId,
        {
          errorCode:
            "OFFLINE_RESULT_MISSING",
          errorMessage:
            "The server did not confirm this change.",
          retryAt: getRetryAt(
            mutation.attemptCount,
          ),
        },
      );
      continue;
    }

    await handleResult(
      mutation,
      result,
    );
  }
}
