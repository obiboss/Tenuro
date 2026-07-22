"use client";

import { liveQuery, type Subscription } from "dexie";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listUnresolvedOfflineConflicts,
  resolveOfflineConflict,
} from "@/lib/offline/conflict.repository";
import {
  removeOfflineEntity,
  updateOfflineEntityData,
} from "@/lib/offline/entity.repository";
import { enqueueOfflineMutation } from "@/lib/offline/outbox.repository";
import { runRegisteredOfflineSync } from "@/lib/offline/sync-orchestrator";
import type { OfflineConflictRecord } from "@/lib/offline/types";

const ENTITY_LABELS: Record<OfflineConflictRecord["entityType"], string> = {
  manager_landlord_client: "landlord",
  manager_property: "property",
  manager_unit: "unit",
  manager_tenant: "tenant",
  manager_rent_payment: "rent payment",
  manager_maintenance_request: "maintenance record",
  landlord_property: "property",
  landlord_unit: "unit",
  landlord_tenancy: "tenancy",
  landlord_rent_payment: "rent payment",
  developer_estate: "estate",
  developer_plot: "plot",
  developer_buyer: "buyer",
  developer_sale: "sale",
};

function hasServerRecord(conflict: OfflineConflictRecord) {
  return Object.keys(conflict.serverPayload).length > 0;
}

function getConflictMessage(conflict: OfflineConflictRecord) {
  const reason = conflict.reasonMessage?.trim();

  if (!reason) {
    return "BOPA could not sync this record. It is still safely stored on this device.";
  }

  const isTechnicalDatabaseMessage =
    /invalid input value|sqlstate|enum |column .+ does not exist|relation .+ does not exist|violates .+ constraint/i.test(
      reason,
    );

  if (isTechnicalDatabaseMessage) {
    return `BOPA could not save this ${ENTITY_LABELS[conflict.entityType]} online. The details are still safely stored on this device.`;
  }

  return reason;
}

export function OfflineConflictDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [conflicts, setConflicts] = useState<OfflineConflictRecord[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let subscription: Subscription | null = null;

    try {
      subscription = liveQuery(listUnresolvedOfflineConflicts).subscribe({
        next: setConflicts,
        error: () => setMessage("Saved records could not be opened on this device."),
      });
    } catch {
      setMessage("Saved records could not be opened on this device.");
    }

    return () => subscription?.unsubscribe();
  }, [open]);

  async function retryConflict(conflict: OfflineConflictRecord) {
    setWorkingId(conflict.id);
    setMessage(null);

    try {
      const queued = await enqueueOfflineMutation({
        ownerProfileId: conflict.ownerProfileId,
        workspaceType: conflict.workspaceType,
        workspaceId: conflict.workspaceId,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        operation: conflict.operation ?? "create",
        baseRevision: conflict.baseRevision,
        payload: conflict.localPayload,
      });

      await updateOfflineEntityData({
        ownerProfileId: conflict.ownerProfileId,
        workspaceType: conflict.workspaceType,
        workspaceId: conflict.workspaceId,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        update: {
          offline_sync_status: "waiting",
          offline_sync_error: null,
          offline_client_mutation_id: queued.clientMutationId,
        },
      });
      await resolveOfflineConflict(conflict.id);
      await runRegisteredOfflineSync();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "This record could not be retried.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function keepOnlineRecord(conflict: OfflineConflictRecord) {
    setWorkingId(conflict.id);
    setMessage(null);

    try {
      await removeOfflineEntity({
        ownerProfileId: conflict.ownerProfileId,
        workspaceType: conflict.workspaceType,
        workspaceId: conflict.workspaceId,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
      });
      await resolveOfflineConflict(conflict.id);
      await runRegisteredOfflineSync();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "This saved record could not be cleared.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-review-title"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-3 sm:items-center"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-card bg-white shadow-card">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-border-soft bg-white p-4">
          <div>
            <h2 id="offline-review-title" className="text-lg font-black text-text-strong">
              Review saved records
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              These records remain on this device until you choose what BOPA should do.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-button text-text-muted transition hover:bg-surface"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {message ? (
            <div role="alert" className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {message}
            </div>
          ) : null}

          {conflicts.length === 0 ? (
            <div className="rounded-card bg-success-soft p-4">
              <p className="font-black text-success">No record needs review.</p>
            </div>
          ) : (
            conflicts.map((conflict) => {
              const serverRecordExists = hasServerRecord(conflict);
              const isWorking = workingId === conflict.id;

              return (
                <article
                  key={conflict.id}
                  className="rounded-card border border-border-soft bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                      <AlertTriangle className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-black capitalize text-text-strong">
                        {ENTITY_LABELS[conflict.entityType]}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                        {getConflictMessage(conflict)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      serverRecordExists
                        ? "mt-4"
                        : "mt-4 grid gap-2 sm:grid-cols-2"
                    }
                  >
                    {serverRecordExists ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => void keepOnlineRecord(conflict)}
                        className="min-h-11 w-full rounded-button bg-primary px-4 text-sm font-black text-white disabled:opacity-50"
                      >
                        Use online record
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => void retryConflict(conflict)}
                          className="min-h-11 rounded-button bg-primary px-4 text-sm font-black text-white disabled:opacity-50"
                        >
                          Try syncing again
                        </button>
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => void keepOnlineRecord(conflict)}
                          className="min-h-11 rounded-button border border-border-soft bg-white px-4 text-sm font-black text-text-strong disabled:opacity-50"
                        >
                          Remove saved record
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
