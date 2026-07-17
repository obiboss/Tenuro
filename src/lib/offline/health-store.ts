import {
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  subscribeToOfflineEvents,
} from "@/lib/offline/coordination";
import type {
  OfflineHealthSnapshot,
  OfflineStoragePersistenceStatus,
} from "@/lib/offline/types";

const HEALTH_REFRESH_INTERVAL_MS =
  5 * 60 * 1000;
const STORAGE_WARNING_RATIO = 0.7;
const STORAGE_CRITICAL_RATIO = 0.85;
const STALE_AFTER_MS =
  24 * 60 * 60 * 1000;
const VERY_STALE_AFTER_MS =
  7 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

const serverSnapshot: OfflineHealthSnapshot = {
  ready: false,
  storageLevel: "unknown",
  staleLevel: "unknown",
  usageBytes: null,
  quotaBytes: null,
  usageRatio: null,
  persistenceStatus: "unknown",
  lastReadSyncAt: null,
};

let snapshot = serverSnapshot;
let refreshTimer:
  | ReturnType<typeof setInterval>
  | null = null;
let unsubscribeCoordination:
  | (() => void)
  | null = null;
let refreshPromise:
  | Promise<void>
  | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function getStorageLevel(
  ratio: number | null,
): OfflineHealthSnapshot["storageLevel"] {
  if (ratio === null) {
    return "unknown";
  }

  if (ratio >= STORAGE_CRITICAL_RATIO) {
    return "critical";
  }

  if (ratio >= STORAGE_WARNING_RATIO) {
    return "warning";
  }

  return "healthy";
}

function getStaleLevel(
  lastReadSyncAt: string | null,
): OfflineHealthSnapshot["staleLevel"] {
  if (!lastReadSyncAt) {
    return "unknown";
  }

  const time = Date.parse(lastReadSyncAt);

  if (!Number.isFinite(time)) {
    return "unknown";
  }

  const age = Date.now() - time;

  if (age >= VERY_STALE_AFTER_MS) {
    return "very_stale";
  }

  if (age >= STALE_AFTER_MS) {
    return "stale";
  }

  return "fresh";
}

function parsePersistenceStatus(
  value: string | null,
): OfflineStoragePersistenceStatus {
  if (
    value === "granted" ||
    value === "best_effort" ||
    value === "unsupported"
  ) {
    return value;
  }

  return "unknown";
}

async function readHealthSnapshot(): Promise<OfflineHealthSnapshot> {
  const db = await openOfflineDatabase();
  const [
    cursors,
    persistenceMeta,
  ] = await Promise.all([
    db.syncCursors.toArray(),
    db.meta.get(
      "storagePersistence",
    ),
  ]);

  const lastReadSyncAt =
    cursors
      .map((cursor) => cursor.updatedAt)
      .sort((first, second) =>
        second.localeCompare(first),
      )[0] ?? null;

  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  let usageRatio: number | null = null;

  if (
    typeof navigator !== "undefined" &&
    navigator.storage &&
    typeof navigator.storage.estimate ===
      "function"
  ) {
    try {
      const estimate =
        await navigator.storage.estimate();

      usageBytes =
        typeof estimate.usage === "number"
          ? estimate.usage
          : null;
      quotaBytes =
        typeof estimate.quota === "number"
          ? estimate.quota
          : null;

      if (
        usageBytes !== null &&
        quotaBytes !== null &&
        quotaBytes > 0
      ) {
        usageRatio =
          usageBytes / quotaBytes;
      }
    } catch {
      usageBytes = null;
      quotaBytes = null;
      usageRatio = null;
    }
  }

  return {
    ready: true,
    storageLevel:
      getStorageLevel(usageRatio),
    staleLevel:
      getStaleLevel(lastReadSyncAt),
    usageBytes,
    quotaBytes,
    usageRatio,
    persistenceStatus:
      parsePersistenceStatus(
        persistenceMeta?.value ?? null,
      ),
    lastReadSyncAt,
  };
}

export async function refreshOfflineHealth() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      snapshot =
        await readHealthSnapshot();
      emit();
    } catch {
      snapshot = {
        ...snapshot,
        ready: true,
      };
      emit();
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function startMonitoring() {
  if (refreshTimer) {
    return;
  }

  void refreshOfflineHealth();

  refreshTimer = setInterval(
    () => {
      void refreshOfflineHealth();
    },
    HEALTH_REFRESH_INTERVAL_MS,
  );

  unsubscribeCoordination =
    subscribeToOfflineEvents((event) => {
      if (
        event.type ===
          "sync_completed" ||
        event.type ===
          "data_cleared" ||
        event.type ===
          "owner_changed" ||
        event.type ===
          "health_changed"
      ) {
        void refreshOfflineHealth();
      }
    });
}

function stopMonitoring() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  unsubscribeCoordination?.();
  unsubscribeCoordination = null;
}

export function subscribeOfflineHealth(
  listener: () => void,
) {
  listeners.add(listener);
  startMonitoring();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopMonitoring();
    }
  };
}

export function getOfflineHealthSnapshot() {
  return snapshot;
}

export function getOfflineHealthServerSnapshot() {
  return serverSnapshot;
}
