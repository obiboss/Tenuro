import "server-only";

import crypto from "node:crypto";
import type {
  SupabaseClient,
} from "@supabase/supabase-js";
import {
  managerRoleHasPermission,
} from "@/lib/manager-staff-permission";
import { isAppError } from "@/server/errors/app-error";
import type {
  OfflineSafeMutationEntity,
  OfflineSafeMutationResult,
} from "@/lib/offline/safe-mutation.types";
import {
  getDeveloperAccountByOwnerProfileId,
  getDeveloperAccountByProfileId,
} from "@/server/repositories/developer.repository";
import {
  getManagerOrganizationAccessForCurrentUser,
} from "@/server/repositories/manager.repository";
import {
  getSessionUser,
} from "@/server/services/auth.service";
import {
  assertBusinessSubscriptionAccessForProfile,
} from "@/server/services/business-subscription.service";
import {
  applyOfflineOperationalMutation,
  isOperationalMutation,
} from "@/server/offline/operational-mutation.service";
import {
  createSupabaseAdminClient,
} from "@/server/supabase/admin";
import {
  createSupabaseServerClient,
} from "@/server/supabase/server";
import {
  normalisePhoneNumber,
} from "@/server/utils/phone";
import type {
  OfflineSafeMutationInput,
} from "@/server/validators/offline-safe-mutation.schema";

type AuthorizedWorkspace = {
  profileId: string;
  workspaceType: "manager" | "developer" | "landlord";
  workspaceId: string;
  managerRole:
    | "owner"
    | "manager"
    | "accountant"
    | "property_officer"
    | "maintenance_officer"
    | null;
  developerOwner: boolean;
  developerBuyerEditAllowed: boolean;
};

function stableJson(
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableJson(item))
      .join(",")}]`;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const entries = Object.entries(
      value as Record<string, unknown>,
    ).sort(([first], [second]) =>
      first.localeCompare(second),
    );

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableJson(
            entryValue,
          )}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createRequestHash(
  mutation: OfflineSafeMutationInput,
) {
  return crypto
    .createHash("sha256")
    .update(stableJson(mutation))
    .digest("hex");
}

function normalizeNullableText(
  value: string | null,
) {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMutation(
  mutation: OfflineSafeMutationInput,
): OfflineSafeMutationInput {
  switch (mutation.entityType) {
    case "manager_maintenance_request":
      if (mutation.operation === "create") {
        return {
          ...mutation,
          payload: {
            ...mutation.payload,
            issueTitle:
              mutation.payload.issueTitle.trim(),
            issueDescription:
              normalizeNullableText(
                mutation.payload.issueDescription,
              ),
            vendorName:
              normalizeNullableText(
                mutation.payload.vendorName,
              ),
            notes:
              normalizeNullableText(
                mutation.payload.notes,
              ),
            estimatedCost:
              Math.round(
                (
                  mutation.payload
                    .estimatedCost +
                  Number.EPSILON
                ) * 100,
              ) / 100,
          },
        };
      }

      return {
        ...mutation,
        payload: {
          ...mutation.payload,
          issueTitle:
            mutation.payload.issueTitle.trim(),
          issueDescription:
            normalizeNullableText(
              mutation.payload.issueDescription,
            ),
          vendorName:
            normalizeNullableText(
              mutation.payload.vendorName,
            ),
          notes:
            normalizeNullableText(
              mutation.payload.notes,
            ),
          estimatedCost:
            Math.round(
              (
                mutation.payload
                  .estimatedCost +
                Number.EPSILON
              ) * 100,
            ) / 100,
        },
      };

    case "manager_property":
      if (mutation.operation === "create") {
        return {
          ...mutation,
          payload: {
            ...mutation.payload,
            propertyName: mutation.payload.propertyName.trim(),
            propertyAddress: mutation.payload.propertyAddress.trim(),
            city: normalizeNullableText(mutation.payload.city),
            state: normalizeNullableText(mutation.payload.state),
            lga: normalizeNullableText(mutation.payload.lga),
            notes: normalizeNullableText(mutation.payload.notes),
            newLandlord: mutation.payload.newLandlord
              ? {
                  ...mutation.payload.newLandlord,
                  landlordName:
                    mutation.payload.newLandlord.landlordName.trim(),
                  landlordPhone: normalizeNullableText(
                    mutation.payload.newLandlord.landlordPhone,
                  ),
                  landlordEmail:
                    mutation.payload.newLandlord.landlordEmail
                      ?.trim()
                      .toLowerCase() ?? null,
                  landlordAddress: normalizeNullableText(
                    mutation.payload.newLandlord.landlordAddress,
                  ),
                  notes: normalizeNullableText(
                    mutation.payload.newLandlord.notes,
                  ),
                }
              : null,
          },
        };
      }

      return {
        ...mutation,
        payload: {
          ...mutation.payload,
          propertyName:
            mutation.payload.propertyName.trim(),
          propertyAddress:
            mutation.payload.propertyAddress.trim(),
          city:
            normalizeNullableText(
              mutation.payload.city,
            ),
          notes:
            normalizeNullableText(
              mutation.payload.notes,
            ),
        },
      };

    case "manager_tenant": {
      const phone = normalisePhoneNumber(
        mutation.payload.phoneNumber,
      );

      if (mutation.operation === "create") {
        return {
          ...mutation,
          payload: {
            ...mutation.payload,
            fullName: mutation.payload.fullName.trim(),
            phoneNumber: phone.e164,
            email: mutation.payload.email?.trim().toLowerCase() ?? null,
            occupation: normalizeNullableText(mutation.payload.occupation),
            notes: normalizeNullableText(mutation.payload.notes),
          },
        };
      }

      return {
        ...mutation,
        payload: {
          ...mutation.payload,
          fullName:
            mutation.payload.fullName.trim(),
          phoneNumber: phone.e164,
          email:
            mutation.payload.email?.trim().toLowerCase() ??
            null,
          occupation:
            normalizeNullableText(
              mutation.payload.occupation,
            ),
          notes:
            normalizeNullableText(
              mutation.payload.notes,
            ),
        },
      };
    }

    case "developer_estate":
      return {
        ...mutation,
        payload: {
          ...mutation.payload,
          estateName:
            mutation.payload.estateName.trim(),
          location:
            mutation.payload.location.trim(),
          city:
            normalizeNullableText(
              mutation.payload.city,
            ),
          description:
            normalizeNullableText(
              mutation.payload.description,
            ),
        },
      };

    case "developer_buyer": {
      const phone = normalisePhoneNumber(
        mutation.payload.phoneNumber,
      );

      return {
        ...mutation,
        payload: {
          ...mutation.payload,
          fullName:
            mutation.payload.fullName.trim(),
          phoneNumber: phone.e164,
          email:
            mutation.payload.email?.trim().toLowerCase() ??
            null,
        },
      };
    }

    case "manager_unit":
    case "manager_rent_payment":
    case "landlord_property":
    case "landlord_unit":
    case "landlord_rent_payment":
      return mutation;
  }
}

async function getDeveloperBuyerEditPermission(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    developerProfileId: string;
  },
) {
  const { count, error } = await supabase
    .from("developer_staff_permissions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "developer_account_id",
      params.developerAccountId,
    )
    .eq(
      "developer_profile_id",
      params.developerProfileId,
    )
    .eq("permission_key", "buyer:create");

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

async function getAuthorizedWorkspace(): Promise<AuthorizedWorkspace | null> {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (user.role === "manager") {
    const supabase =
      await createSupabaseServerClient();
    const access =
      await getManagerOrganizationAccessForCurrentUser(
        supabase,
        user.id,
      );

    if (
      !access ||
      access.organization.status !== "active"
    ) {
      return null;
    }

    await assertBusinessSubscriptionAccessForProfile({
      profileId: user.id,
      workspaceType: "manager",
    });

    return {
      profileId: user.id,
      workspaceType: "manager",
      workspaceId:
        access.organization.id,
      managerRole: access.staffRole,
      developerOwner: false,
      developerBuyerEditAllowed: false,
    };
  }

  if (user.role === "developer") {
    const admin =
      createSupabaseAdminClient();
    const profileAccess =
      await getDeveloperAccountByProfileId(
        admin,
        user.id,
      );
    const ownerAccount =
      profileAccess?.account ??
      (await getDeveloperAccountByOwnerProfileId(
        admin,
        user.id,
      ));

    if (
      !ownerAccount ||
      ownerAccount.status !== "active"
    ) {
      return null;
    }

    await assertBusinessSubscriptionAccessForProfile({
      profileId: user.id,
      workspaceType: "developer",
    });

    const developerOwner =
      ownerAccount.owner_profile_id === user.id;
    const developerBuyerEditAllowed =
      developerOwner ||
      (
        profileAccess?.profile
          ? await getDeveloperBuyerEditPermission(
              admin,
              {
                developerAccountId:
                  ownerAccount.id,
                developerProfileId:
                  profileAccess.profile.id,
              },
            )
          : false
      );

    return {
      profileId: user.id,
      workspaceType: "developer",
      workspaceId:
        ownerAccount.id,
      managerRole: null,
      developerOwner,
      developerBuyerEditAllowed,
    };
  }

  if (user.role === "landlord") {
    return {
      profileId: user.id,
      workspaceType: "landlord",
      workspaceId: user.id,
      managerRole: null,
      developerOwner: false,
      developerBuyerEditAllowed: false,
    };
  }

  return null;
}

function getPermissionError(
  workspace: AuthorizedWorkspace,
  mutation: OfflineSafeMutationInput,
) {
  if (
    mutation.workspaceType !==
      workspace.workspaceType ||
    mutation.workspaceId !==
      workspace.workspaceId
  ) {
    return {
      code:
        "OFFLINE_WORKSPACE_MISMATCH",
      message:
        "This offline change belongs to a different workspace.",
    };
  }

  if (mutation.workspaceType === "manager") {
    if (!workspace.managerRole) {
      return {
        code:
          "OFFLINE_MANAGER_ACCESS_REQUIRED",
        message:
          "You no longer have access to this manager workspace.",
      };
    }

    const permission =
      mutation.entityType === "manager_maintenance_request"
        ? "maintenance.manage"
        : mutation.entityType === "manager_rent_payment"
          ? "payment.manage"
          : "property.manage";

    if (
      !managerRoleHasPermission(
        workspace.managerRole,
        permission,
      )
    ) {
      return {
        code:
          "OFFLINE_PERMISSION_DENIED",
        message:
          "You do not have permission to save this change.",
      };
    }

    return null;
  }

  if (mutation.workspaceType === "landlord") {
    const isLandlordEntity = [
      "landlord_property",
      "landlord_unit",
      "landlord_rent_payment",
    ].includes(mutation.entityType);

    if (
      workspace.workspaceType !== "landlord" ||
      workspace.workspaceId !== workspace.profileId ||
      !isLandlordEntity
    ) {
      return {
        code: "OFFLINE_PERMISSION_DENIED",
        message: "You do not have permission to save this change.",
      };
    }

    return null;
  }

  if (
    mutation.entityType ===
      "developer_estate" &&
    !workspace.developerOwner
  ) {
    return {
      code:
        "OFFLINE_PERMISSION_DENIED",
      message:
        "Only the company owner can edit estate details offline.",
    };
  }

  if (
    mutation.entityType ===
      "developer_buyer" &&
    !workspace.developerBuyerEditAllowed
  ) {
    return {
      code:
        "OFFLINE_PERMISSION_DENIED",
      message:
        "You do not have permission to edit buyer contact details.",
    };
  }

  return null;
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isOfflineEntityType(
  value: unknown,
): value is OfflineSafeMutationEntity["entityType"] {
  return (
    value === "manager_landlord_client" ||
    value === "manager_property" ||
    value === "manager_unit" ||
    value === "manager_tenant" ||
    value === "manager_rent_payment" ||
    value ===
      "manager_maintenance_request" ||
    value === "landlord_property" ||
    value === "landlord_unit" ||
    value === "landlord_tenancy" ||
    value === "landlord_rent_payment" ||
    value === "developer_estate" ||
    value === "developer_plot" ||
    value === "developer_buyer" ||
    value === "developer_sale"
  );
}

function parseServerEntity(
  value: unknown,
): OfflineSafeMutationEntity | null {
  if (!isObject(value)) {
    return null;
  }

  const entityType = value.entityType;
  const entityId = value.entityId;
  const serverRevision =
    value.serverRevision;
  const updatedAt = value.updatedAt;
  const deletedAt = value.deletedAt;
  const data = value.data;

  if (
    !isOfflineEntityType(entityType) ||
    typeof entityId !== "string" ||
    typeof serverRevision !== "number" ||
    !Number.isInteger(serverRevision) ||
    serverRevision < 0 ||
    typeof updatedAt !== "string" ||
    !(
      deletedAt === null ||
      typeof deletedAt === "string"
    ) ||
    !isObject(data)
  ) {
    return null;
  }

  return {
    entityType,
    entityId,
    serverRevision,
    updatedAt,
    deletedAt,
    data,
  };
}

function parseRpcResult(
  clientMutationId: string,
  value: unknown,
): OfflineSafeMutationResult {
  if (!isObject(value)) {
    return {
      clientMutationId,
      status: "retry",
      code:
        "OFFLINE_INVALID_SERVER_RESPONSE",
      message:
        "The server returned an invalid sync response.",
    };
  }

  const status = value.status;

  if (
    status === "applied" ||
    status === "duplicate"
  ) {
    const entity =
      parseServerEntity(value.entity);

    if (!entity) {
      return {
        clientMutationId,
        status: "retry",
        code:
          "OFFLINE_INVALID_SERVER_ENTITY",
        message:
          "The synced record could not be confirmed.",
      };
    }

    return {
      clientMutationId,
      status,
      entity,
    };
  }

  if (status === "conflict") {
    const serverEntity =
      parseServerEntity(
        value.serverEntity,
      );

    if (!serverEntity) {
      return {
        clientMutationId,
        status: "retry",
        code:
          "OFFLINE_INVALID_CONFLICT_RESPONSE",
        message:
          "The latest online record could not be loaded.",
      };
    }

    return {
      clientMutationId,
      status: "conflict",
      code: "OFFLINE_CONFLICT",
      message:
        typeof value.message === "string"
          ? value.message
          : "This record changed on another device.",
      serverEntity,
    };
  }

  if (status === "rejected") {
    const serverEntity =
      parseServerEntity(
        value.serverEntity,
      );

    return {
      clientMutationId,
      status: "rejected",
      code:
        typeof value.code === "string"
          ? value.code
          : "OFFLINE_CHANGE_REJECTED",
      message:
        typeof value.message === "string"
          ? value.message
          : "This offline change could not be saved.",
      ...(serverEntity
        ? { serverEntity }
        : {}),
    };
  }

  return {
    clientMutationId,
    status: "retry",
    code:
      "OFFLINE_UNKNOWN_SERVER_RESPONSE",
    message:
      "This change could not be synced yet.",
  };
}

function classifyRpcError(
  clientMutationId: string,
  error: {
    code?: string;
  },
): OfflineSafeMutationResult {
  const code = error.code ?? "";

  if (
    [
      "22P02",
      "22007",
      "23503",
      "23505",
      "23514",
    ].includes(code)
  ) {
    return {
      clientMutationId,
      status: "rejected",
      code:
        code === "23505"
          ? "OFFLINE_DUPLICATE_VALUE"
          : "OFFLINE_INVALID_CHANGE",
      message:
        code === "23505"
          ? "Another record already uses one of these details."
          : "This offline change contains information that is no longer valid.",
    };
  }

  return {
    clientMutationId,
    status: "retry",
    code:
      code ||
      "OFFLINE_SERVER_UNAVAILABLE",
    message:
      "This change could not be synced yet.",
  };
}

export async function applyOfflineSafeMutations(
  mutations: OfflineSafeMutationInput[],
) {
  const workspace =
    await getAuthorizedWorkspace();

  if (!workspace) {
    return {
      authorized: false as const,
      results: [],
    };
  }

  const admin =
    createSupabaseAdminClient();
  const results: OfflineSafeMutationResult[] =
    [];

  for (const mutationInput of mutations) {
    const permissionError =
      getPermissionError(
        workspace,
        mutationInput,
      );

    if (permissionError) {
      results.push({
        clientMutationId:
          mutationInput.clientMutationId,
        status: "rejected",
        ...permissionError,
      });
      continue;
    }

    let mutation: OfflineSafeMutationInput;

    try {
      mutation =
        normalizeMutation(mutationInput);
    } catch {
      results.push({
        clientMutationId:
          mutationInput.clientMutationId,
        status: "rejected",
        code: "OFFLINE_INVALID_PHONE",
        message:
          "Enter a valid Nigerian phone number.",
      });
      continue;
    }

    const requestHash =
      createRequestHash(mutation);

    if (isOperationalMutation(mutation)) {
      try {
        results.push(
          await applyOfflineOperationalMutation({
            supabase: admin,
            workspace: {
              profileId: workspace.profileId,
              workspaceType: mutation.workspaceType,
              workspaceId: workspace.workspaceId,
            },
            mutation,
          }),
        );
      } catch (error) {
        if (isAppError(error)) {
          results.push({
            clientMutationId: mutation.clientMutationId,
            status: "rejected",
            code: error.code,
            message: error.userMessage,
          });
          continue;
        }

        const code =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "OFFLINE_OPERATION_FAILED";
        const message =
          error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "This offline change could not be saved yet.";

        results.push(
          [
            "22023",
            "22P02",
            "23503",
            "23505",
            "23514",
            "42501",
            "P0001",
          ].includes(code)
            ? {
                clientMutationId: mutation.clientMutationId,
                status: "rejected",
                code: "OFFLINE_INVALID_CHANGE",
                message,
              }
            : {
                clientMutationId: mutation.clientMutationId,
                status: "retry",
                code,
                message: "This offline change could not be synced yet.",
              },
        );
      }

      continue;
    }

    const { data, error } = await admin.rpc(
      "apply_offline_safe_mutation",
      {
        p_profile_id:
          workspace.profileId,
        p_workspace_type:
          mutation.workspaceType,
        p_workspace_id:
          mutation.workspaceId,
        p_client_mutation_id:
          mutation.clientMutationId,
        p_entity_type:
          mutation.entityType,
        p_entity_id:
          mutation.entityId,
        p_operation:
          mutation.operation,
        p_base_revision:
          mutation.baseRevision,
        p_request_hash:
          requestHash,
        p_payload:
          mutation.payload,
      },
    );

    if (error) {
      results.push(
        classifyRpcError(
          mutation.clientMutationId,
          error,
        ),
      );
      continue;
    }

    results.push(
      parseRpcResult(
        mutation.clientMutationId,
        data,
      ),
    );
  }

  const {
    error: retentionError,
  } = await admin.rpc(
    "prune_offline_mutation_receipts",
    {
      p_batch_size: 250,
    },
  );

  void retentionError;

  return {
    authorized: true as const,
    results,
  };
}
