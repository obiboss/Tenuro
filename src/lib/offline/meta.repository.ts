import {
  openOfflineDatabase,
} from "@/lib/offline/database";

const OWNER_PROFILE_META_KEY =
  "ownerProfileId";
const DEVICE_ID_META_KEY = "deviceId";
const STORAGE_PERSISTENCE_META_KEY =
  "storagePersistence";

function createMetaValue(value: string) {
  return {
    value,
    updatedAt: new Date().toISOString(),
  };
}

export async function getOfflineMetaValue(
  key: string,
) {
  const db = await openOfflineDatabase();
  const row = await db.meta.get(key);

  return row?.value ?? null;
}

export async function setOfflineMetaValue(
  key: string,
  value: string,
) {
  const db = await openOfflineDatabase();

  await db.meta.put({
    key,
    ...createMetaValue(value),
  });
}

export async function getOfflineOwnerProfileId() {
  return getOfflineMetaValue(
    OWNER_PROFILE_META_KEY,
  );
}

export async function setOfflineOwnerProfileId(
  profileId: string,
) {
  await setOfflineMetaValue(
    OWNER_PROFILE_META_KEY,
    profileId,
  );
}

export async function getOrCreateOfflineDeviceId() {
  const current = await getOfflineMetaValue(
    DEVICE_ID_META_KEY,
  );

  if (current) {
    return current;
  }

  const created = crypto.randomUUID();

  await setOfflineMetaValue(
    DEVICE_ID_META_KEY,
    created,
  );

  return created;
}

export async function setOfflineStoragePersistence(
  value: string,
) {
  await setOfflineMetaValue(
    STORAGE_PERSISTENCE_META_KEY,
    value,
  );
}
