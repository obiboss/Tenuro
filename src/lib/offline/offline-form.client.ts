"use client";

import type { ZodError } from "zod";
import { putOfflineEntity } from "@/lib/offline/entity.repository";
import { getOfflineOwnerProfileId } from "@/lib/offline/meta.repository";
import { enqueueOfflineMutation } from "@/lib/offline/outbox.repository";
import type {
  OfflineEntityPayload,
  OfflineEntityType,
  OfflineWorkspaceType,
} from "@/lib/offline/types";
import { listOfflineWorkspaces } from "@/lib/offline/workspace.repository";

export const OFFLINE_SAVED_MESSAGE =
  "Saved on this device. BOPA will sync it automatically when your internet returns.";

export type OfflineFormResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  offlineSaved?: boolean;
  submissionId?: string;
};

type OfflineMutationDraft = {
  entityType: OfflineEntityType;
  entityId: string;
  payload: OfflineEntityPayload;
  optimisticData: OfflineEntityPayload;
};

export class OfflineFormValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>;

  constructor(error: ZodError) {
    const flattened = error.flatten();

    super(flattened.formErrors[0] ?? "Check the form and try again.");
    this.name = "OfflineFormValidationError";
    this.fieldErrors = flattened.fieldErrors as Record<string, string[]>;
  }
}

export function toOfflineFormError(error: unknown): OfflineFormResult {
  if (error instanceof OfflineFormValidationError) {
    return {
      ok: false,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  return {
    ok: false,
    message:
      error instanceof Error
        ? error.message
        : "This form could not be saved on this device.",
  };
}

async function getOfflineFormWorkspace(workspaceType: OfflineWorkspaceType) {
  const ownerProfileId = await getOfflineOwnerProfileId();

  if (!ownerProfileId) {
    throw new Error(
      "Open BOPA once while signed in and online before using forms without internet.",
    );
  }

  const workspaces = await listOfflineWorkspaces(ownerProfileId);
  const workspace = workspaces.find(
    (candidate) => candidate.workspaceType === workspaceType,
  );

  if (workspace) {
    return {
      ownerProfileId,
      workspaceId: workspace.workspaceId,
    };
  }

  if (workspaceType === "landlord") {
    return {
      ownerProfileId,
      workspaceId: ownerProfileId,
    };
  }

  throw new Error(
    "Refresh this workspace once while online before using its forms without internet.",
  );
}

export async function queueOfflineFormMutation(input: {
  workspaceType: OfflineWorkspaceType;
  draft: OfflineMutationDraft;
}) {
  const context = await getOfflineFormWorkspace(input.workspaceType);
  const queued = await enqueueOfflineMutation({
    ownerProfileId: context.ownerProfileId,
    workspaceType: input.workspaceType,
    workspaceId: context.workspaceId,
    entityType: input.draft.entityType,
    entityId: input.draft.entityId,
    operation: "create",
    baseRevision: null,
    payload: input.draft.payload,
  });

  await putOfflineEntity({
    ownerProfileId: context.ownerProfileId,
    workspaceType: input.workspaceType,
    workspaceId: context.workspaceId,
    entityType: input.draft.entityType,
    entityId: input.draft.entityId,
    serverRevision: 0,
    serverUpdatedAt: null,
    data: {
      ...input.draft.optimisticData,
      offline_sync_status: "waiting",
      offline_client_mutation_id: queued.clientMutationId,
    },
  });

  return queued;
}

export async function runOfflineCapableFormAction<TState extends OfflineFormResult>(
  input: {
    previousState: TState;
    formData: FormData;
    onlineAction: (
      previousState: TState,
      formData: FormData,
    ) => Promise<TState>;
    saveOffline: (formData: FormData) => Promise<Partial<TState>>;
  },
): Promise<TState> {
  if (navigator.onLine) {
    try {
      return await input.onlineAction(input.previousState, input.formData);
    } catch (error) {
      if (navigator.onLine) {
        throw error;
      }
    }
  }

  try {
    const offlineResult = await input.saveOffline(input.formData);

    return {
      ...input.previousState,
      ...offlineResult,
      ok: true,
      message: OFFLINE_SAVED_MESSAGE,
      fieldErrors: undefined,
      offlineSaved: true,
      submissionId: crypto.randomUUID(),
    } as TState;
  } catch (error) {
    return {
      ...input.previousState,
      ...toOfflineFormError(error),
      offlineSaved: false,
    } as TState;
  }
}
