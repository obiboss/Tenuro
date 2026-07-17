import {
  liveQuery,
  type Subscription,
} from "dexie";
import {
  subscribeToOfflineEvents,
} from "@/lib/offline/coordination";
import {
  isOfflineDatabaseSupported,
  openOfflineDatabase,
} from "@/lib/offline/database";
import type {
  OfflineRuntimeSnapshot,
  OfflineSyncRuntimeState,
} from "@/lib/offline/types";

const listeners = new Set<() => void>();

const serverSnapshot: OfflineRuntimeSnapshot = {
  ready: false,
  pendingCount: 0,
  conflictCount: 0,
  syncState: "idle",
  lastSyncError: null,
};

let snapshot = serverSnapshot;
let databaseSubscription: Subscription | null =
  null;
let unsubscribeCoordination:
  | (() => void)
  | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(
  update: Partial<OfflineRuntimeSnapshot>,
) {
  snapshot = {
    ...snapshot,
    ...update,
  };

  emit();
}

async function readCounts() {
  if (!isOfflineDatabaseSupported()) {
    return {
      pendingCount: 0,
      conflictCount: 0,
    };
  }

  const db = await openOfflineDatabase();
  const [
    pendingCount,
    conflictCount,
  ] = await Promise.all([
    db.outbox.count(),
    db.conflicts
      .where("status")
      .equals("unresolved")
      .count(),
  ]);

  return {
    pendingCount,
    conflictCount,
  };
}

function ensureSubscriptions() {
  if (
    !databaseSubscription &&
    isOfflineDatabaseSupported()
  ) {
    databaseSubscription = liveQuery(
      readCounts,
    ).subscribe({
      next: (counts) => {
        updateSnapshot({
          ready: true,
          ...counts,
        });
      },
      error: () => {
        updateSnapshot({
          ready: true,
        });
      },
    });
  }

  if (!unsubscribeCoordination) {
    unsubscribeCoordination =
      subscribeToOfflineEvents((event) => {
        if (event.type === "sync_started") {
          updateSnapshot({
            syncState: "syncing",
            lastSyncError: null,
          });
        }

        if (event.type === "sync_completed") {
          updateSnapshot({
            syncState: "idle",
          });
        }
      });
  }
}

function stopSubscriptions() {
  databaseSubscription?.unsubscribe();
  databaseSubscription = null;

  unsubscribeCoordination?.();
  unsubscribeCoordination = null;
}

export function subscribeOfflineRuntime(
  listener: () => void,
) {
  listeners.add(listener);
  ensureSubscriptions();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopSubscriptions();
    }
  };
}

export function getOfflineRuntimeSnapshot() {
  return snapshot;
}

export function getOfflineRuntimeServerSnapshot() {
  return serverSnapshot;
}

export function setOfflineSyncRuntimeState(
  syncState: OfflineSyncRuntimeState,
  lastSyncError: string | null = null,
) {
  updateSnapshot({
    syncState,
    lastSyncError,
  });
}
