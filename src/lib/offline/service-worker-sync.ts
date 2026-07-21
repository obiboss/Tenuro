const BOPA_SYNC_TAG = "bopa-offline-sync";

type ServiceWorkerRegistrationWithSync =
  ServiceWorkerRegistration & {
    sync?: {
      register: (tag: string) => Promise<void>;
    };
  };

export async function requestBopaBackgroundSync() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) as
        | ServiceWorkerRegistrationWithSync
        | undefined;

    if (!registration) {
      return;
    }

    if (registration.sync) {
      await registration.sync.register(
        BOPA_SYNC_TAG,
      );
    }
  } catch {
    // Foreground reconnect and visibility sync remain available.
  }
}

export function isBopaSyncMessage(
  value: unknown,
) {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  return (
    "type" in value &&
    value.type === "BOPA_SYNC_REQUESTED"
  );
}
