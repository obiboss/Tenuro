import {
  getOfflineEntityTable,
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  createOfflineEntityKey,
} from "@/lib/offline/keys";
import type {
  OfflineEntityPayload,
  OfflineEntityRecord,
  OfflineEntityType,
  OfflineWorkspaceType,
} from "@/lib/offline/types";

type OfflineEntityScope = {
  ownerProfileId: string;
  workspaceType: OfflineWorkspaceType;
  workspaceId: string;
};

export async function putOfflineEntity(
  input: OfflineEntityScope & {
    entityType: OfflineEntityType;
    entityId: string;
    serverRevision: number;
    serverUpdatedAt: string | null;
    deletedAt?: string | null;
    data: OfflineEntityPayload;
  },
) {
  const db = await openOfflineDatabase();
  const table = getOfflineEntityTable(
    db,
    input.entityType,
  );

  const record: OfflineEntityRecord = {
    localKey: createOfflineEntityKey(input),
    ownerProfileId: input.ownerProfileId,
    workspaceType: input.workspaceType,
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    serverRevision: input.serverRevision,
    serverUpdatedAt: input.serverUpdatedAt,
    localUpdatedAt: new Date().toISOString(),
    deletedAt: input.deletedAt ?? null,
    data: input.data,
  };

  await table.put(record);

  return record;
}

export async function putOfflineEntities(
  records: Array<
    OfflineEntityScope & {
      entityType: OfflineEntityType;
      entityId: string;
      serverRevision: number;
      serverUpdatedAt: string | null;
      deletedAt?: string | null;
      data: OfflineEntityPayload;
    }
  >,
) {
  if (records.length === 0) {
    return;
  }

  const db = await openOfflineDatabase();

  await db.transaction(
    "rw",
    db.tables,
    async () => {
      for (const record of records) {
        const table = getOfflineEntityTable(
          db,
          record.entityType,
        );

        await table.put({
          localKey:
            createOfflineEntityKey(record),
          ownerProfileId:
            record.ownerProfileId,
          workspaceType:
            record.workspaceType,
          workspaceId: record.workspaceId,
          entityType: record.entityType,
          entityId: record.entityId,
          serverRevision:
            record.serverRevision,
          serverUpdatedAt:
            record.serverUpdatedAt,
          localUpdatedAt:
            new Date().toISOString(),
          deletedAt: record.deletedAt ?? null,
          data: record.data,
        });
      }
    },
  );
}

export async function listOfflineEntities(
  input: OfflineEntityScope & {
    entityType: OfflineEntityType;
    includeDeleted?: boolean;
  },
) {
  const db = await openOfflineDatabase();
  const table = getOfflineEntityTable(
    db,
    input.entityType,
  );

  const records = await table
    .where("[ownerProfileId+workspaceId]")
    .equals([
      input.ownerProfileId,
      input.workspaceId,
    ])
    .toArray();

  return input.includeDeleted
    ? records
    : records.filter(
        (record) => !record.deletedAt,
      );
}

export async function removeOfflineEntity(
  input: OfflineEntityScope & {
    entityType: OfflineEntityType;
    entityId: string;
  },
) {
  const db = await openOfflineDatabase();
  const table = getOfflineEntityTable(
    db,
    input.entityType,
  );

  await table.delete(
    createOfflineEntityKey(input),
  );
}
