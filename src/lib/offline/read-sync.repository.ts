import {
  getOfflineEntityTable,
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  createOfflineCursorKey,
  createOfflineEntityKey,
  createOfflineWorkspaceKey,
} from "@/lib/offline/keys";
import type {
  OfflineReadResponse,
} from "@/lib/offline/read-sync.types";
import type {
  OfflineEntityRecord,
  OfflineEntityType,
} from "@/lib/offline/types";

const ENTITY_TYPES_BY_WORKSPACE = {
  manager: [
    "manager_landlord_client",
    "manager_property",
    "manager_unit",
    "manager_tenant",
    "manager_rent_payment",
    "manager_maintenance_request",
  ],
  developer: [
    "developer_estate",
    "developer_plot",
    "developer_buyer",
    "developer_sale",
  ],
  landlord: [
    "landlord_property",
    "landlord_unit",
    "landlord_tenancy",
    "landlord_rent_payment",
  ],
} as const satisfies Record<
  string,
  readonly OfflineEntityType[]
>;

function getFullSyncMetaKey(
  response: OfflineReadResponse,
) {
  return `readFullSync:${createOfflineWorkspaceKey(
    response,
  )}`;
}

function toLocalEntity(
  response: OfflineReadResponse,
  entity: OfflineReadResponse["entities"][number],
): OfflineEntityRecord {
  return {
    localKey: createOfflineEntityKey({
      ownerProfileId:
        response.ownerProfileId,
      workspaceType:
        response.workspaceType,
      workspaceId: response.workspaceId,
      entityType: entity.entityType,
      entityId: entity.entityId,
    }),
    ownerProfileId:
      response.ownerProfileId,
    workspaceType:
      response.workspaceType,
    workspaceId: response.workspaceId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    serverRevision:
      entity.serverRevision,
    serverUpdatedAt: entity.updatedAt,
    localUpdatedAt:
      response.generatedAt,
    deletedAt: entity.deletedAt,
    data: entity.data,
  };
}

async function getProtectedLocalEntityKeys(
  db: Awaited<ReturnType<typeof openOfflineDatabase>>,
  response: OfflineReadResponse,
) {
  const protectedKeys = new Set<string>();
  const [outbox, conflicts] = await Promise.all([
    db.outbox
      .where("[ownerProfileId+workspaceId]")
      .equals([response.ownerProfileId, response.workspaceId])
      .toArray(),
    db.conflicts
      .where("[ownerProfileId+workspaceId]")
      .equals([response.ownerProfileId, response.workspaceId])
      .filter((conflict) => conflict.status === "unresolved")
      .toArray(),
  ]);

  for (const item of [...outbox, ...conflicts]) {
    protectedKeys.add(
      createOfflineEntityKey({
        ownerProfileId: response.ownerProfileId,
        workspaceType: response.workspaceType,
        workspaceId: response.workspaceId,
        entityType: item.entityType,
        entityId: item.entityId,
      }),
    );
  }

  for (const entityType of ENTITY_TYPES_BY_WORKSPACE[response.workspaceType]) {
    const table = getOfflineEntityTable(db, entityType);
    const records = await table
      .where("[ownerProfileId+workspaceId]")
      .equals([response.ownerProfileId, response.workspaceId])
      .toArray();

    for (const record of records) {
      const status = record.data.offline_sync_status;

      if (status === "waiting" || status === "review") {
        protectedKeys.add(record.localKey);
      }
    }
  }

  return protectedKeys;
}

async function clearWorkspaceEntities(
  db: Awaited<ReturnType<typeof openOfflineDatabase>>,
  response: OfflineReadResponse,
  protectedKeys: Set<string>,
) {
  const entityTypes = ENTITY_TYPES_BY_WORKSPACE[response.workspaceType];

  for (const entityType of entityTypes) {
    const table = getOfflineEntityTable(db, entityType);
    const keys = await table
      .where("[ownerProfileId+workspaceId]")
      .equals([response.ownerProfileId, response.workspaceId])
      .primaryKeys();
    const removableKeys = keys.filter((key) => !protectedKeys.has(String(key)));

    if (removableKeys.length > 0) {
      await table.bulkDelete(removableKeys);
    }
  }
}

export async function applyOfflineReadResponse(
  response: OfflineReadResponse,
) {
  const db = await openOfflineDatabase();
  const now = new Date().toISOString();
  const workspaceLocalKey =
    createOfflineWorkspaceKey(response);
  const cursorLocalKey =
    createOfflineCursorKey(response);

  await db.transaction(
    "rw",
    db.tables,
    async () => {
      const protectedKeys = await getProtectedLocalEntityKeys(db, response);

      if (response.mode === "full") {
        await clearWorkspaceEntities(db, response, protectedKeys);
      }

      const recordsByType = new Map<
        OfflineEntityType,
        OfflineEntityRecord[]
      >();

      for (const entity of response.entities) {
        const localKey = createOfflineEntityKey({
          ownerProfileId: response.ownerProfileId,
          workspaceType: response.workspaceType,
          workspaceId: response.workspaceId,
          entityType: entity.entityType,
          entityId: entity.entityId,
        });

        if (protectedKeys.has(localKey)) {
          continue;
        }

        const current =
          recordsByType.get(
            entity.entityType,
          ) ?? [];

        current.push(
          toLocalEntity(response, entity),
        );
        recordsByType.set(
          entity.entityType,
          current,
        );
      }

      for (const [
        entityType,
        records,
      ] of recordsByType) {
        const table = getOfflineEntityTable(
          db,
          entityType,
        );

        await table.bulkPut(records);
      }

      const currentWorkspace =
        await db.workspaces.get(
          workspaceLocalKey,
        );

      await db.workspaces.put({
        localKey: workspaceLocalKey,
        ownerProfileId:
          response.ownerProfileId,
        workspaceType:
          response.workspaceType,
        workspaceId:
          response.workspaceId,
        workspaceName:
          response.workspaceName,
        registeredAt:
          currentWorkspace?.registeredAt ??
          now,
        lastOpenedAt: now,
      });

      await db.syncCursors.put({
        localKey: cursorLocalKey,
        ownerProfileId:
          response.ownerProfileId,
        workspaceType:
          response.workspaceType,
        workspaceId:
          response.workspaceId,
        cursor: response.cursor,
        updatedAt:
          response.generatedAt,
      });

      if (response.mode === "full") {
        await db.meta.put({
          key: getFullSyncMetaKey(
            response,
          ),
          value:
            response.generatedAt,
          updatedAt:
            response.generatedAt,
        });
      }
    },
  );
}

export async function getOfflineReadSyncState(
  ownerProfileId: string,
) {
  const db = await openOfflineDatabase();
  const workspaces = await db.workspaces
    .where("ownerProfileId")
    .equals(ownerProfileId)
    .reverse()
    .sortBy("lastOpenedAt");
  const workspace = workspaces[0] ?? null;

  if (!workspace) {
    return {
      workspace: null,
      cursor: null,
      lastFullSyncAt: null,
    };
  }

  const cursorLocalKey =
    createOfflineCursorKey(workspace);
  const cursor =
    await db.syncCursors.get(
      cursorLocalKey,
    );
  const fullSyncMeta =
    await db.meta.get(
      `readFullSync:${createOfflineWorkspaceKey(
        workspace,
      )}`,
    );

  return {
    workspace,
    cursor: cursor?.cursor ?? null,
    lastFullSyncAt:
      fullSyncMeta?.value ?? null,
  };
}
