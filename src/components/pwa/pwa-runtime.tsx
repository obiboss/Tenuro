"use client";

import {
  AlertTriangle,
  Cloud,
  Download,
  HardDrive,
  RefreshCw,
  Share2,
  WifiOff,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  usePathname,
} from "next/navigation";
import {
  getOfflineHealthServerSnapshot,
  getOfflineHealthSnapshot,
  subscribeOfflineHealth,
} from "@/lib/offline/health-store";
import {
  initializeOfflineRuntime,
} from "@/lib/offline/initialize";
import {
  pushOfflineSafeMutations,
} from "@/lib/offline/push-sync.client";
import {
  syncOfflineReadData,
} from "@/lib/offline/read-sync.client";
import {
  isBopaSyncMessage,
} from "@/lib/offline/service-worker-sync";
import {
  reconcileOfflineOwner,
} from "@/lib/offline/session";
import {
  registerOfflineSyncHandler,
  runRegisteredOfflineSync,
} from "@/lib/offline/sync-orchestrator";
import {
  getOfflineRuntimeServerSnapshot,
  getOfflineRuntimeSnapshot,
  subscribeOfflineRuntime,
} from "@/lib/offline/sync-status-store";
import {
  createSupabaseBrowserClient,
} from "@/server/supabase/browser";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

const INSTALL_DISMISSED_KEY =
  "bopa:pwa-install-dismissed";
const ONLINE_MESSAGE_DURATION_MS = 4_000;

function isRunningStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)")
      .matches ||
    Boolean(
      (window.navigator as StandaloneNavigator)
        .standalone,
    )
  );
}

function isIosDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(
    window.navigator.userAgent,
  );
}

function hasDismissedInstallPrompt() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.sessionStorage.getItem(
      INSTALL_DISMISSED_KEY,
    ) === "true"
  );
}

function formatWaitingChanges(count: number) {
  return `${count} ${
    count === 1 ? "change" : "changes"
  } waiting`;
}

function subscribeOnlineStatus(
  onStoreChange: () => void,
) {
  window.addEventListener(
    "online",
    onStoreChange,
  );
  window.addEventListener(
    "offline",
    onStoreChange,
  );

  return () => {
    window.removeEventListener(
      "online",
      onStoreChange,
    );
    window.removeEventListener(
      "offline",
      onStoreChange,
    );
  };
}

function getOnlineStatus() {
  return typeof window === "undefined"
    ? true
    : window.navigator.onLine;
}

function getOnlineServerStatus() {
  return true;
}

function subscribeStandaloneStatus(
  onStoreChange: () => void,
) {
  const displayMode = window.matchMedia(
    "(display-mode: standalone)",
  );

  displayMode.addEventListener(
    "change",
    onStoreChange,
  );
  window.addEventListener(
    "appinstalled",
    onStoreChange,
  );

  return () => {
    displayMode.removeEventListener(
      "change",
      onStoreChange,
    );
    window.removeEventListener(
      "appinstalled",
      onStoreChange,
    );
  };
}

function getStandaloneStatus() {
  return isRunningStandalone();
}

function getStandaloneServerStatus() {
  return false;
}

export function PwaRuntime() {
  const pathname = usePathname();
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineStatus,
    getOnlineServerStatus,
  );
  const isRunningAsInstalledApp =
    useSyncExternalStore(
      subscribeStandaloneStatus,
      getStandaloneStatus,
      getStandaloneServerStatus,
    );
  const [installedInSession, setInstalledInSession] =
    useState(false);
  const [showBackOnline, setShowBackOnline] =
    useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] =
    useState(false);
  const [showInstallAction, setShowInstallAction] =
    useState(false);
  const [updateAvailable, setUpdateAvailable] =
    useState(false);
  const [waitingWorker, setWaitingWorker] =
    useState<ServiceWorker | null>(null);

  const offlineRuntime = useSyncExternalStore(
    subscribeOfflineRuntime,
    getOfflineRuntimeSnapshot,
    getOfflineRuntimeServerSnapshot,
  );
  const offlineHealth = useSyncExternalStore(
    subscribeOfflineHealth,
    getOfflineHealthSnapshot,
    getOfflineHealthServerSnapshot,
  );

  const wasOfflineRef = useRef(false);
  const backOnlineTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingUpdateRef = useRef(false);

  const dismissInstallAction = useCallback(() => {
    window.sessionStorage.setItem(
      INSTALL_DISMISSED_KEY,
      "true",
    );
    setShowInstallAction(false);
    setShowIosInstructions(false);
  }, []);

  useEffect(() => {
    function handleOffline() {
      wasOfflineRef.current = true;
      setShowBackOnline(false);
    }

    function handleOnline() {
      if (wasOfflineRef.current) {
        setShowBackOnline(true);

        if (backOnlineTimerRef.current) {
          clearTimeout(backOnlineTimerRef.current);
        }

        backOnlineTimerRef.current = setTimeout(
          () => setShowBackOnline(false),
          ONLINE_MESSAGE_DURATION_MS,
        );
      }

      wasOfflineRef.current = false;
      void runRegisteredOfflineSync();
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();

      if (
        isRunningStandalone() ||
        hasDismissedInstallPrompt()
      ) {
        return;
      }

      setInstallPrompt(
        event as BeforeInstallPromptEvent,
      );
      setShowInstallAction(true);
    }

    function handleInstalled() {
      setInstalledInSession(true);
      setInstallPrompt(null);
      setShowInstallAction(false);
      setShowIosInstructions(false);
    }

    function syncWhenVisible() {
      if (document.visibilityState === "visible") {
        void runRegisteredOfflineSync();
      }
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener(
      "beforeinstallprompt",
      handleInstallPrompt,
    );
    window.addEventListener(
      "appinstalled",
      handleInstalled,
    );
    document.addEventListener(
      "visibilitychange",
      syncWhenVisible,
    );

    const installActionTimer = window.setTimeout(
      () => {
        if (
          isIosDevice() &&
          !isRunningStandalone() &&
          !hasDismissedInstallPrompt()
        ) {
          setShowInstallAction(true);
        }
      },
      0,
    );

    return () => {
      window.removeEventListener(
        "offline",
        handleOffline,
      );
      window.removeEventListener(
        "online",
        handleOnline,
      );
      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallPrompt,
      );
      window.removeEventListener(
        "appinstalled",
        handleInstalled,
      );
      document.removeEventListener(
        "visibilitychange",
        syncWhenVisible,
      );

      window.clearTimeout(installActionTimer);

      if (backOnlineTimerRef.current) {
        clearTimeout(backOnlineTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unregisterSyncHandler =
      () => undefined;
    const supabase =
      createSupabaseBrowserClient();

    async function initialize() {
      await initializeOfflineRuntime(
        supabase,
      );

      if (disposed) {
        return;
      }

      const unregisterPushHandler =
        registerOfflineSyncHandler(
          pushOfflineSafeMutations,
        );
      const unregisterReadHandler =
        registerOfflineSyncHandler(
          syncOfflineReadData,
        );

      unregisterSyncHandler = () => {
        unregisterReadHandler();
        unregisterPushHandler();
      };

      await runRegisteredOfflineSync();
    }

    void initialize().catch(() => {
      // The online app remains available when device storage is unavailable.
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void (async () => {
          await reconcileOfflineOwner(
            session?.user.id ?? null,
          );

          if (session?.user.id) {
            await runRegisteredOfflineSync();
          }
        })().catch(() => {
          // Authentication remains authoritative if local storage is unavailable.
        });
      },
    );

    return () => {
      disposed = true;
      unregisterSyncHandler();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | null =
      null;

    function watchInstallingWorker(
      worker: ServiceWorker,
    ) {
      worker.addEventListener("statechange", () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setWaitingWorker(worker);
          setUpdateAvailable(true);
        }
      });
    }

    async function registerServiceWorker() {
      try {
        registration =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
              updateViaCache: "none",
            },
          );

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener(
          "updatefound",
          () => {
            if (registration?.installing) {
              watchInstallingWorker(
                registration.installing,
              );
            }
          },
        );
      } catch {
        // The web app remains usable if registration fails.
      }
    }

    function handleControllerChange() {
      if (applyingUpdateRef.current) {
        window.location.reload();
      }
    }

    function updateOnVisible() {
      if (
        document.visibilityState === "visible" &&
        registration
      ) {
        void registration.update();
      }
    }

    function handleServiceWorkerMessage(
      event: MessageEvent<unknown>,
    ) {
      if (isBopaSyncMessage(event.data)) {
        void runRegisteredOfflineSync();
      }
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );
    document.addEventListener(
      "visibilitychange",
      updateOnVisible,
    );

    void registerServiceWorker();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
      document.removeEventListener(
        "visibilitychange",
        updateOnVisible,
      );
    };
  }, []);

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setShowInstallAction(false);
      }

      setInstallPrompt(null);
      return;
    }

    if (isIosDevice()) {
      setShowIosInstructions(true);
    }
  }

  async function applyUpdate() {
    if (
      !isOnline ||
      offlineRuntime.syncState ===
        "syncing" ||
      offlineRuntime.pendingCount > 0
    ) {
      return;
    }

    await runRegisteredOfflineSync();

    const latestRuntime =
      getOfflineRuntimeSnapshot();

    if (
      latestRuntime.pendingCount > 0 ||
      latestRuntime.syncState ===
        "syncing"
    ) {
      return;
    }

    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    applyingUpdateRef.current = true;
    waitingWorker.postMessage({
      type: "SKIP_WAITING",
    });
  }

  const isInstalled =
    isRunningAsInstalledApp ||
    installedInSession;
  const showConflictStatus =
    offlineRuntime.conflictCount > 0;
  const showWaitingStatus =
    !showConflictStatus &&
    offlineRuntime.pendingCount > 0;
  const offlineWorkspaceHref =
    pathname.startsWith("/developer")
      ? "/offline-workspace.html?workspace=developer"
      : pathname.startsWith("/manager")
        ? "/offline-workspace.html?workspace=manager"
        : "/offline-workspace.html?workspace=landlord";
  const offlineReviewHref =
    `${offlineWorkspaceHref}&review=1`;
  const offlineStorageHref =
    `${offlineWorkspaceHref}&storage=1`;
  const updateBlocked =
    !isOnline ||
    offlineRuntime.syncState === "syncing" ||
    offlineRuntime.pendingCount > 0;

  return (
    <>
      {!isOnline ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-card border border-warning/20 bg-white px-4 py-3 shadow-card"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
            <WifiOff
              aria-hidden="true"
              size={19}
              strokeWidth={2.6}
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-text-strong">
              You are offline
            </p>
            <p className="text-xs font-semibold leading-5 text-text-muted">
              {offlineRuntime.pendingCount > 0
                ? `${formatWaitingChanges(
                    offlineRuntime.pendingCount,
                  )} to sync when you reconnect.`
                : offlineHealth.staleLevel ===
                    "very_stale"
                  ? "Your offline copy is over 7 days old."
                  : "Your last refreshed workspace remains available."}
            </p>
          </div>
        </div>
      ) : null}

      {showBackOnline ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-success px-4 py-2 text-sm font-black text-white shadow-card"
        >
          Back online
        </div>
      ) : null}

      {isOnline && showConflictStatus ? (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-[85] flex max-w-sm items-center gap-3 rounded-card border border-danger/20 bg-white px-4 py-3 shadow-card"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle
              aria-hidden="true"
              size={18}
              strokeWidth={2.6}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-text-strong">
              Attention needed
            </p>
            <p className="text-xs font-semibold leading-5 text-text-muted">
              {offlineRuntime.conflictCount}{" "}
              {offlineRuntime.conflictCount === 1
                ? "record needs"
                : "records need"}{" "}
              review.
            </p>
          </div>

          <a
            href={offlineReviewHref}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-button bg-danger-soft px-4 text-sm font-black text-danger transition hover:opacity-85"
          >
            Review
          </a>
        </div>
      ) : null}

      {isOnline && showWaitingStatus ? (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-[85] flex max-w-sm items-center gap-3 rounded-card border border-primary/20 bg-white px-4 py-3 shadow-card"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Cloud
              aria-hidden="true"
              size={18}
              strokeWidth={2.6}
            />
          </span>
          <div>
            <p className="text-sm font-black text-text-strong">
              {offlineRuntime.syncState === "syncing"
                ? "Saving changes"
                : "Changes waiting"}
            </p>
            <p className="text-xs font-semibold leading-5 text-text-muted">
              {formatWaitingChanges(
                offlineRuntime.pendingCount,
              )}.
            </p>
          </div>
        </div>
      ) : null}

      {offlineHealth.storageLevel ===
      "critical" ? (
        <div
          role="status"
          className="fixed bottom-20 right-4 z-[86] flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-card border border-warning/20 bg-white px-4 py-3 shadow-card"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
            <HardDrive
              aria-hidden="true"
              size={18}
              strokeWidth={2.6}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-text-strong">
              Offline storage almost full
            </p>
            <p className="text-xs font-semibold leading-5 text-text-muted">
              Review downloaded data on this device.
            </p>
          </div>

          <a
            href={offlineStorageHref}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-button bg-warning-soft px-4 text-sm font-black text-warning transition hover:opacity-85"
          >
            Manage
          </a>
        </div>
      ) : null}

      {updateAvailable ? (
        <div className="fixed left-1/2 top-4 z-[95] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-card border border-primary/20 bg-white px-4 py-3 shadow-card">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <RefreshCw
              aria-hidden="true"
              size={18}
              strokeWidth={2.6}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-text-strong">
              BOPA update ready
            </p>
            <p className="text-xs font-semibold leading-5 text-text-muted">
              Refresh to use the latest version.
            </p>
          </div>

          <button
            type="button"
            disabled={updateBlocked}
            onClick={() => void applyUpdate()}
            className="min-h-10 rounded-button bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isOnline
              ? "Connect first"
              : offlineRuntime.pendingCount > 0 ||
                  offlineRuntime.syncState ===
                    "syncing"
                ? "Saving first"
                : "Update"}
          </button>
        </div>
      ) : null}

      {showInstallAction && !isInstalled ? (
        <div className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-card border border-primary/20 bg-white p-2 shadow-card">
          <button
            type="button"
            onClick={() => void installApp()}
            className="inline-flex min-h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover"
          >
            <Download
              aria-hidden="true"
              size={18}
              strokeWidth={2.6}
            />
            Install BOPA
          </button>

          <button
            type="button"
            aria-label="Dismiss install option"
            onClick={dismissInstallAction}
            className="flex size-10 items-center justify-center rounded-button text-text-muted transition hover:bg-background hover:text-text-strong"
          >
            <X
              aria-hidden="true"
              size={18}
              strokeWidth={2.6}
            />
          </button>
        </div>
      ) : null}

      {showIosInstructions ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bopa-install-title"
          className="fixed inset-0 z-[100] grid place-items-center bg-text-strong/40 p-4"
        >
          <div className="w-full max-w-md rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Share2
                  aria-hidden="true"
                  size={22}
                  strokeWidth={2.6}
                />
              </div>

              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() =>
                  setShowIosInstructions(false)
                }
                className="flex size-10 items-center justify-center rounded-button text-text-muted transition hover:bg-background hover:text-text-strong"
              >
                <X
                  aria-hidden="true"
                  size={19}
                  strokeWidth={2.6}
                />
              </button>
            </div>

            <h2
              id="bopa-install-title"
              className="mt-4 text-xl font-black tracking-tight text-text-strong"
            >
              Install BOPA
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              In Safari, tap the Share button, then choose
              “Add to Home Screen”.
            </p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowIosInstructions(false)
                }
                className="min-h-11 rounded-button bg-primary px-5 text-sm font-black text-white transition hover:bg-primary-hover"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
