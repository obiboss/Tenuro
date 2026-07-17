import {
  getOfflineEntityTable,
  openOfflineDatabase,
} from "@/lib/offline/database";
import type {
  OfflineEntityType,
  OfflineWorkspaceRecord,
} from "@/lib/offline/types";

const RESOLVED_CONFLICT_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000;
const DRAFT_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000;
const TOMBSTONE_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000;
const INACTIVE_WORKSPACE_RETENTION_MS =
  90 * 24 * 60 * 60 * 1000;

const ENTITY_TYPES_BY_WORKSPACE = {
  manager: [
    "manager_property",
    "manager_unit",
    "manager_tenant",
    "manager_maintenance_request",
  ],
  developer: [
    "developer_estate",
    "developer_plot",
    "developer_buyer",
    "developer_sale",
  ],
  landlord: [],
} as const satisfies Record<
  string,
  readonly OfflineEntityType[]
>;

function olderThan(
  value: string | null | undefined,
  ageMs: number,
) {
  if (!value) {
    return false;
  }

  const time = Date.parse(value);

  return (
    Number.isFinite(time) &&
    Date.now() - time > ageMs
  );
}

async function workspaceHasProtectedWork(
  workspace: OfflineWorkspaceRecord,
) {
  const db = await openOfflineDatabase();
  const [
    pendingCount,
    conflictCount,
  ] = await Promise.all([
    db.outbox
      .where(
        "[ownerProfileId+workspaceId]",
      )
      .equals([
        workspace.ownerProfileId,
        workspace.workspaceId,
      ])
      .count(),
    db.conflicts
      .where(
        "[ownerProfileId+workspaceId+status]",
      )
      .equals([
        workspace.ownerProfileId,
        workspace.workspaceId,
        "unresolved",
      ])
      .count(),
  ]);

  return (
    pendingCount > 0 ||
    conflictCount > 0
  );
}

async function removeWorkspaceData(
  workspace: OfflineWorkspaceRecord,
) {
  const db = await openOfflineDatabase();

  for (
    const entityType of
    ENTITY_TYPES_BY_WORKSPACE[
      workspace.workspaceType
    ]
  ) {
    const table = getOfflineEntityTable(
      db,
      entityType,
    );
    const keys = await table
      .where(
        "[ownerProfileId+workspaceId]",
      )
      .equals([
        workspace.ownerProfileId,
        workspace.workspaceId,
      ])
      .primaryKeys();

    if (keys.length > 0) {
      await table.bulkDelete(keys);
    }
  }

  const [
    cursorKeys,
    draftKeys,
  ] = await Promise.all([
    db.syncCursors
      .where(
        "[ownerProfileId+workspaceId]",
      )
      .equals([
        workspace.ownerProfileId,
        workspace.workspaceId,
      ])
      .primaryKeys(),
    db.drafts
      .where(
        "[ownerProfileId+workspaceId]",
      )
      .equals([
        workspace.ownerProfileId,
        workspace.workspaceId,
      ])
      .primaryKeys(),
  ]);

  await Promise.all([
    cursorKeys.length > 0
      ? db.syncCursors.bulkDelete(
          cursorKeys,
        )
      : Promise.resolve(),
    draftKeys.length > 0
      ? db.drafts.bulkDelete(draftKeys)
      : Promise.resolve(),
    db.workspaces.delete(
      workspace.localKey,
    ),
    db.meta.delete(
      `readFullSync:${workspace.localKey}`,
    ),
  ]);
}

export async function performOfflineMaintenance(
  input: {
    ownerProfileId: string;
    currentWorkspaceId?: string | null;
  },
) {
  const db = await openOfflineDatabase();
  const resolvedConflictCutoff =
    new Date(
      Date.now() -
        RESOLVED_CONFLICT_RETENTION_MS,
    ).toISOString();
  const draftCutoff =
    new Date(
      Date.now() - DRAFT_RETENTION_MS,
    ).toISOString();
  const tombstoneCutoff =
    new Date(
      Date.now() -
        TOMBSTONE_RETENTION_MS,
    ).toISOString();

  const [
    resolvedConflicts,
    staleDrafts,
  ] = await Promise.all([
    db.conflicts
      .where("status")
      .equals("resolved")
      .filter(
        (record) =>
          record.ownerProfileId ===
            input.ownerProfileId &&
          Boolean(record.resolvedAt) &&
          record.resolvedAt! <=
            resolvedConflictCutoff,
      )
      .primaryKeys(),
    db.drafts
      .where("ownerProfileId")
      .equals(input.ownerProfileId)
      .filter(
        (record) =>
          record.updatedAt <= draftCutoff,
      )
      .primaryKeys(),
  ]);

  await Promise.all([
    resolvedConflicts.length > 0
      ? db.conflicts.bulkDelete(
          resolvedConflicts,
        )
      : Promise.resolve(),
    staleDrafts.length > 0
      ? db.drafts.bulkDelete(
          staleDrafts,
        )
      : Promise.resolve(),
  ]);

  let tombstonesRemoved = 0;

  for (
    const entityType of [
      "manager_property",
      "manager_unit",
      "manager_tenant",
      "manager_maintenance_request",
      "developer_estate",
      "developer_plot",
      "developer_buyer",
      "developer_sale",
    ] as const
  ) {
    const table = getOfflineEntityTable(
      db,
      entityType,
    );
    const keys = await table
      .where("ownerProfileId")
      .equals(input.ownerProfileId)
      .filter(
        (record) =>
          Boolean(record.deletedAt) &&
          record.deletedAt! <=
            tombstoneCutoff,
      )
      .primaryKeys();

    if (keys.length > 0) {
      await table.bulkDelete(keys);
      tombstonesRemoved += keys.length;
    }
  }

  const workspaces = await db.workspaces
    .where("ownerProfileId")
    .equals(input.ownerProfileId)
    .toArray();

  let workspacesRemoved = 0;

  for (const workspace of workspaces) {
    if (
      workspace.workspaceId ===
        input.currentWorkspaceId ||
      !olderThan(
        workspace.lastOpenedAt,
        INACTIVE_WORKSPACE_RETENTION_MS,
      ) ||
      await workspaceHasProtectedWork(
        workspace,
      )
    ) {
      continue;
    }

    await removeWorkspaceData(workspace);
    workspacesRemoved += 1;
  }

  return {
    resolvedConflictsRemoved:
      resolvedConflicts.length,
    draftsRemoved: staleDrafts.length,
    tombstonesRemoved,
    workspacesRemoved,
  };
}
