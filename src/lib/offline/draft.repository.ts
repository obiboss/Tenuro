import {
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  createOfflineDraftKey,
} from "@/lib/offline/keys";
import type {
  OfflineEntityPayload,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

export async function saveOfflineDraft(
  input: {
    ownerProfileId: string;
    workspaceType: OfflineWorkspaceType;
    workspaceId: string;
    draftType: string;
    draftId: string;
    data: OfflineEntityPayload;
  },
) {
  const db = await openOfflineDatabase();
  const localKey = createOfflineDraftKey(
    input,
  );
  const current = await db.drafts.get(
    localKey,
  );
  const now = new Date().toISOString();

  await db.drafts.put({
    localKey,
    ownerProfileId: input.ownerProfileId,
    workspaceType: input.workspaceType,
    workspaceId: input.workspaceId,
    draftType: input.draftType,
    draftId: input.draftId,
    data: input.data,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  });
}

export async function getOfflineDraft(
  input: {
    ownerProfileId: string;
    workspaceType: OfflineWorkspaceType;
    workspaceId: string;
    draftType: string;
    draftId: string;
  },
) {
  const db = await openOfflineDatabase();

  return db.drafts.get(
    createOfflineDraftKey(input),
  );
}

export async function removeOfflineDraft(
  input: {
    ownerProfileId: string;
    workspaceType: OfflineWorkspaceType;
    workspaceId: string;
    draftType: string;
    draftId: string;
  },
) {
  const db = await openOfflineDatabase();

  await db.drafts.delete(
    createOfflineDraftKey(input),
  );
}
