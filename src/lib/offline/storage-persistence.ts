import type {
  OfflineStoragePersistenceStatus,
} from "@/lib/offline/types";
import {
  setOfflineStoragePersistence,
} from "@/lib/offline/meta.repository";

type NavigatorWithStorage = Navigator & {
  storage?: StorageManager;
};

export async function requestOfflineStoragePersistence(): Promise<OfflineStoragePersistenceStatus> {
  if (typeof navigator === "undefined") {
    return "unsupported";
  }

  const storage = (
    navigator as NavigatorWithStorage
  ).storage;

  if (
    !storage ||
    typeof storage.persist !== "function"
  ) {
    await setOfflineStoragePersistence(
      "unsupported",
    );

    return "unsupported";
  }

  try {
    const alreadyPersistent =
      typeof storage.persisted === "function"
        ? await storage.persisted()
        : false;

    if (alreadyPersistent) {
      await setOfflineStoragePersistence(
        "granted",
      );

      return "granted";
    }

    const granted = await storage.persist();
    const result: OfflineStoragePersistenceStatus =
      granted ? "granted" : "best_effort";

    await setOfflineStoragePersistence(result);

    return result;
  } catch {
    await setOfflineStoragePersistence(
      "best_effort",
    );

    return "best_effort";
  }
}
