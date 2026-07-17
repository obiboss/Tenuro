const LOCK_NAME =
  "bopa-offline-sync";
const FALLBACK_LOCK_KEY =
  "bopa:offline-sync-lease";
const LEASE_DURATION_MS = 45_000;
const LEASE_HEARTBEAT_MS = 12_000;

type NavigatorWithLocks = Navigator & {
  locks?: {
    request: <T>(
      name: string,
      options: {
        mode: "exclusive";
        ifAvailable: true;
      },
      callback: (
        lock: unknown | null,
      ) => Promise<T> | T,
    ) => Promise<T>;
  };
};

type StoredLease = {
  ownerId: string;
  expiresAt: number;
};

function readStoredLease(): StoredLease | null {
  try {
    const value =
      window.localStorage.getItem(
        FALLBACK_LOCK_KEY,
      );

    if (!value) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("ownerId" in parsed) ||
      !("expiresAt" in parsed) ||
      typeof parsed.ownerId !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      ownerId: parsed.ownerId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function writeStoredLease(
  lease: StoredLease,
) {
  window.localStorage.setItem(
    FALLBACK_LOCK_KEY,
    JSON.stringify(lease),
  );
}

function removeStoredLease(
  ownerId: string,
) {
  const current = readStoredLease();

  if (current?.ownerId === ownerId) {
    window.localStorage.removeItem(
      FALLBACK_LOCK_KEY,
    );
  }
}

async function runWithFallbackLease<T>(
  task: () => Promise<T>,
): Promise<{
  acquired: boolean;
  value?: T;
}> {
  const ownerId =
    crypto.randomUUID();
  const now = Date.now();
  const current = readStoredLease();

  if (
    current &&
    current.expiresAt > now
  ) {
    return {
      acquired: false,
    };
  }

  writeStoredLease({
    ownerId,
    expiresAt:
      now + LEASE_DURATION_MS,
  });

  await new Promise((resolve) => {
    window.setTimeout(
      resolve,
      30 + Math.floor(Math.random() * 70),
    );
  });

  const confirmed =
    readStoredLease();

  if (confirmed?.ownerId !== ownerId) {
    return {
      acquired: false,
    };
  }

  const heartbeat = window.setInterval(
    () => {
      const active = readStoredLease();

      if (active?.ownerId !== ownerId) {
        return;
      }

      writeStoredLease({
        ownerId,
        expiresAt:
          Date.now() +
          LEASE_DURATION_MS,
      });
    },
    LEASE_HEARTBEAT_MS,
  );

  try {
    return {
      acquired: true,
      value: await task(),
    };
  } finally {
    window.clearInterval(heartbeat);
    removeStoredLease(ownerId);
  }
}

export async function runWithOfflineSyncLock<T>(
  task: () => Promise<T>,
): Promise<{
  acquired: boolean;
  value?: T;
}> {
  if (typeof navigator === "undefined") {
    return {
      acquired: false,
    };
  }

  const lockManager = (
    navigator as NavigatorWithLocks
  ).locks;

  if (lockManager) {
    try {
      return await lockManager.request(
        LOCK_NAME,
        {
          mode: "exclusive",
          ifAvailable: true,
        },
        async (lock) => {
          if (!lock) {
            return {
              acquired: false,
            };
          }

          return {
            acquired: true,
            value: await task(),
          };
        },
      );
    } catch {
      // Use the lease fallback when the browser exposes
      // Web Locks but cannot complete this request.
    }
  }

  if (typeof window === "undefined") {
    return {
      acquired: false,
    };
  }

  return runWithFallbackLease(task);
}
