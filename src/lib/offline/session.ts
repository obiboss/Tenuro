import {
  clearOfflineDatabase,
  isOfflineDatabaseSupported,
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  broadcastOfflineEvent,
} from "@/lib/offline/coordination";
import {
  getOfflineOwnerProfileId,
  getOrCreateOfflineDeviceId,
  setOfflineOwnerProfileId,
} from "@/lib/offline/meta.repository";

function broadcastOwnerChange(
  ownerProfileId: string | null,
) {
  broadcastOfflineEvent({
    type: "owner_changed",
    at: new Date().toISOString(),
    ownerProfileId,
  });
}

export async function reconcileOfflineOwner(
  profileId: string | null,
) {
  if (!isOfflineDatabaseSupported()) {
    return;
  }

  await openOfflineDatabase();

  const currentOwner =
    await getOfflineOwnerProfileId();

  if (!profileId) {
    if (currentOwner) {
      await clearOfflineDatabase();

      broadcastOfflineEvent({
        type: "data_cleared",
        at: new Date().toISOString(),
      });
    }

    broadcastOwnerChange(null);
    return;
  }

  if (
    currentOwner &&
    currentOwner !== profileId
  ) {
    await clearOfflineDatabase();

    broadcastOfflineEvent({
      type: "data_cleared",
      at: new Date().toISOString(),
    });
  }

  await setOfflineOwnerProfileId(profileId);
  await getOrCreateOfflineDeviceId();

  if (currentOwner !== profileId) {
    broadcastOwnerChange(profileId);
  }
}
