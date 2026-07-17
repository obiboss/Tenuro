import {
  broadcastOfflineEvent,
} from "@/lib/offline/coordination";
import {
  refreshOfflineHealth,
} from "@/lib/offline/health-store";
import {
  runWithOfflineSyncLock,
} from "@/lib/offline/sync-lock";
import type {
  OfflineSyncRuntimeState,
} from "@/lib/offline/types";
import {
  setOfflineSyncRuntimeState,
} from "@/lib/offline/sync-status-store";

export type OfflineSyncHandler =
  () => Promise<void>;

const handlers = new Set<OfflineSyncHandler>();

let activeSync: Promise<void> | null = null;

export function registerOfflineSyncHandler(
  handler: OfflineSyncHandler,
) {
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
  };
}

function setState(
  state: OfflineSyncRuntimeState,
  error: string | null = null,
) {
  setOfflineSyncRuntimeState(
    state,
    error,
  );
}

export async function runRegisteredOfflineSync() {
  if (
    typeof navigator === "undefined" ||
    !navigator.onLine ||
    handlers.size === 0
  ) {
    return;
  }

  if (activeSync) {
    return activeSync;
  }

  activeSync = (async () => {
    try {
      const result =
        await runWithOfflineSyncLock(
          async () => {
            setState("syncing");

            broadcastOfflineEvent({
              type: "sync_started",
              at: new Date().toISOString(),
            });

            try {
              for (const handler of handlers) {
                await handler();
              }

              setState("idle");
            } catch (error) {
              setState(
                "error",
                error instanceof Error
                  ? error.message
                  : "Offline changes could not be synced.",
              );

              throw error;
            } finally {
              await refreshOfflineHealth();

              broadcastOfflineEvent({
                type: "sync_completed",
                at: new Date().toISOString(),
              });
            }
          },
        );

      if (!result.acquired) {
        setState("idle");
      }
    } finally {
      activeSync = null;
    }
  })();

  return activeSync;
}
