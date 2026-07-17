import {
  performOfflineMaintenance,
} from "@/lib/offline/cleanup";
import {
  broadcastOfflineEvent,
} from "@/lib/offline/coordination";
import {
  refreshOfflineHealth,
} from "@/lib/offline/health-store";
import {
  getOfflineOwnerProfileId,
} from "@/lib/offline/meta.repository";
import {
  applyOfflineReadResponse,
  getOfflineReadSyncState,
} from "@/lib/offline/read-sync.repository";
import type {
  OfflineReadResponse,
} from "@/lib/offline/read-sync.types";
import {
  reconcileOfflineOwner,
} from "@/lib/offline/session";

const FULL_SYNC_INTERVAL_MS =
  24 * 60 * 60 * 1000;

function needsFullSync(
  lastFullSyncAt: string | null,
) {
  if (!lastFullSyncAt) {
    return true;
  }

  const lastFullTime =
    Date.parse(lastFullSyncAt);

  return (
    !Number.isFinite(lastFullTime) ||
    Date.now() - lastFullTime >
      FULL_SYNC_INTERVAL_MS
  );
}

async function requestOfflineReadSnapshot(
  input: {
    cursor: string | null;
    forceFull: boolean;
  },
) {
  const searchParams =
    new URLSearchParams();

  if (input.forceFull) {
    searchParams.set("full", "1");
  } else if (input.cursor) {
    searchParams.set(
      "cursor",
      input.cursor,
    );
  }

  const response = await fetch(
    `/api/offline/read?${searchParams.toString()}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      "Offline copy could not be refreshed.",
    );
  }

  return (
    await response.json()
  ) as OfflineReadResponse;
}

export async function syncOfflineReadData() {
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

  const localState =
    await getOfflineReadSyncState(
      ownerProfileId,
    );
  const forceFull = needsFullSync(
    localState.lastFullSyncAt,
  );

  let snapshot =
    await requestOfflineReadSnapshot({
      cursor:
        forceFull
          ? null
          : localState.cursor,
      forceFull,
    });

  if (!snapshot) {
    return;
  }

  const workspaceChanged =
    localState.workspace !== null &&
    (
      localState.workspace.workspaceType !==
        snapshot.workspaceType ||
      localState.workspace.workspaceId !==
        snapshot.workspaceId
    );

  if (
    workspaceChanged &&
    snapshot.mode !== "full"
  ) {
    snapshot =
      await requestOfflineReadSnapshot({
        cursor: null,
        forceFull: true,
      });
  }

  if (!snapshot) {
    return;
  }

  await reconcileOfflineOwner(
    snapshot.ownerProfileId,
  );
  await applyOfflineReadResponse(
    snapshot,
  );
  await performOfflineMaintenance({
    ownerProfileId:
      snapshot.ownerProfileId,
    currentWorkspaceId:
      snapshot.workspaceId,
  });
  await refreshOfflineHealth();

  broadcastOfflineEvent({
    type: "health_changed",
    at: new Date().toISOString(),
  });
}
