import Dexie, {
  type EntityTable,
  type Table,
} from "dexie";
import type {
  OfflineConflictRecord,
  OfflineDraftRecord,
  OfflineEntityRecord,
  OfflineMetaRecord,
  OfflineOutboxRecord,
  OfflineSyncCursorRecord,
  OfflineWorkspaceRecord,
} from "@/lib/offline/types";

const DATABASE_NAME = "bopa-offline";

export class BopaOfflineDatabase extends Dexie {
  meta!: EntityTable<OfflineMetaRecord, "key">;
  workspaces!: EntityTable<
    OfflineWorkspaceRecord,
    "localKey"
  >;
  managerProperties!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  managerUnits!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  managerTenants!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  managerMaintenanceRequests!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  developerEstates!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  developerPlots!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  developerBuyers!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  developerSales!: EntityTable<
    OfflineEntityRecord,
    "localKey"
  >;
  outbox!: EntityTable<
    OfflineOutboxRecord,
    "clientMutationId"
  >;
  syncCursors!: EntityTable<
    OfflineSyncCursorRecord,
    "localKey"
  >;
  conflicts!: EntityTable<
    OfflineConflictRecord,
    "id"
  >;
  drafts!: EntityTable<
    OfflineDraftRecord,
    "localKey"
  >;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      meta: "&key, updatedAt",
      workspaces:
        "&localKey, ownerProfileId, [ownerProfileId+workspaceType], [ownerProfileId+workspaceType+workspaceId], lastOpenedAt",
      managerProperties:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      managerUnits:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      managerTenants:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      managerMaintenanceRequests:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      developerEstates:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      developerPlots:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      developerBuyers:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      developerSales:
        "&localKey, ownerProfileId, workspaceId, entityId, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+entityId], localUpdatedAt, deletedAt",
      outbox:
        "&clientMutationId, ownerProfileId, workspaceId, entityId, status, nextAttemptAt, createdAt, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+status]",
      syncCursors:
        "&localKey, ownerProfileId, workspaceId, updatedAt, [ownerProfileId+workspaceId]",
      conflicts:
        "&id, ownerProfileId, workspaceId, entityId, status, createdAt, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+status]",
      drafts:
        "&localKey, ownerProfileId, workspaceId, draftType, updatedAt, [ownerProfileId+workspaceId], [ownerProfileId+workspaceId+draftType]",
    });
  }
}

let database: BopaOfflineDatabase | null = null;

export function isOfflineDatabaseSupported() {
  return (
    typeof window !== "undefined" &&
    "indexedDB" in window
  );
}

export function getOfflineDatabase() {
  if (!isOfflineDatabaseSupported()) {
    throw new Error(
      "Offline storage is not supported in this browser.",
    );
  }

  if (!database) {
    database = new BopaOfflineDatabase();
  }

  return database;
}

export async function openOfflineDatabase() {
  const db = getOfflineDatabase();

  if (!db.isOpen()) {
    await db.open();
  }

  return db;
}

export function getOfflineEntityTable(
  db: BopaOfflineDatabase,
  entityType: OfflineEntityRecord["entityType"],
): Table<OfflineEntityRecord, string> {
  switch (entityType) {
    case "manager_property":
      return db.managerProperties;
    case "manager_unit":
      return db.managerUnits;
    case "manager_tenant":
      return db.managerTenants;
    case "manager_maintenance_request":
      return db.managerMaintenanceRequests;
    case "developer_estate":
      return db.developerEstates;
    case "developer_plot":
      return db.developerPlots;
    case "developer_buyer":
      return db.developerBuyers;
    case "developer_sale":
      return db.developerSales;
  }
}

export async function clearOfflineDatabase() {
  if (!isOfflineDatabaseSupported()) {
    return;
  }

  const db = await openOfflineDatabase();

  await db.transaction(
    "rw",
    db.tables,
    async () => {
      await Promise.all(
        db.tables.map((table) => table.clear()),
      );
    },
  );
}

export async function closeOfflineDatabase() {
  if (!database) {
    return;
  }

  database.close();
  database = null;
}


export async function destroyOfflineDatabase() {
  if (!isOfflineDatabaseSupported()) {
    return;
  }

  await closeOfflineDatabase();
  await Dexie.delete(DATABASE_NAME);
}
