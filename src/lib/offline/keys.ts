import type {
  OfflineEntityType,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

const KEY_SEPARATOR = "::";

function assertKeyPart(
  value: string,
  fieldName: string,
) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(
      `${fieldName} is required for offline storage.`,
    );
  }

  if (trimmed.includes(KEY_SEPARATOR)) {
    throw new Error(
      `${fieldName} contains an unsupported value.`,
    );
  }

  return trimmed;
}

export function createOfflineWorkspaceKey(params: {
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
}) {
  return [
    assertKeyPart(
      params.ownerProfileId,
      "Owner profile",
    ),
    params.workspaceType,
    assertKeyPart(
      params.workspaceId,
      "Workspace",
    ),
  ].join(KEY_SEPARATOR);
}

export function createOfflineEntityKey(params: {
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  entityType: OfflineEntityType;
  entityId: string;
}) {
  return [
    createOfflineWorkspaceKey(params),
    params.entityType,
    assertKeyPart(params.entityId, "Entity"),
  ].join(KEY_SEPARATOR);
}

export function createOfflineCursorKey(params: {
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
}) {
  return createOfflineWorkspaceKey(params);
}

export function createOfflineDraftKey(params: {
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
  draftType: string;
  draftId: string;
}) {
  return [
    createOfflineWorkspaceKey(params),
    assertKeyPart(params.draftType, "Draft type"),
    assertKeyPart(params.draftId, "Draft"),
  ].join(KEY_SEPARATOR);
}
