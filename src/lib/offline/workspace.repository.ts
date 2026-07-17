import {
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  createOfflineWorkspaceKey,
} from "@/lib/offline/keys";
import type {
  OfflineWorkspaceRecord,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

export async function registerOfflineWorkspace(
  input: {
    ownerProfileId: string;
    workspaceType: OfflineWorkspaceType;
    workspaceId: string;
    workspaceName: string;
  },
) {
  const db = await openOfflineDatabase();
  const now = new Date().toISOString();
  const localKey = createOfflineWorkspaceKey(
    input,
  );
  const current = await db.workspaces.get(
    localKey,
  );

  const record: OfflineWorkspaceRecord = {
    localKey,
    ownerProfileId: input.ownerProfileId,
    workspaceType: input.workspaceType,
    workspaceId: input.workspaceId,
    workspaceName:
      input.workspaceName.trim() ||
      "BOPA workspace",
    registeredAt:
      current?.registeredAt ?? now,
    lastOpenedAt: now,
  };

  await db.workspaces.put(record);

  return record;
}

export async function listOfflineWorkspaces(
  ownerProfileId: string,
) {
  const db = await openOfflineDatabase();

  return db.workspaces
    .where("ownerProfileId")
    .equals(ownerProfileId)
    .reverse()
    .sortBy("lastOpenedAt");
}
