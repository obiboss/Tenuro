import type {
  SupabaseClient,
} from "@supabase/supabase-js";
import {
  performOfflineMaintenance,
} from "@/lib/offline/cleanup";
import {
  openOfflineDatabase,
} from "@/lib/offline/database";
import {
  refreshOfflineHealth,
} from "@/lib/offline/health-store";
import {
  reconcileOfflineOwner,
} from "@/lib/offline/session";
import {
  requestOfflineStoragePersistence,
} from "@/lib/offline/storage-persistence";

export async function initializeOfflineRuntime(
  supabase: SupabaseClient,
) {
  await openOfflineDatabase();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const ownerProfileId =
    session?.user.id ?? null;

  await reconcileOfflineOwner(
    ownerProfileId,
  );
  await requestOfflineStoragePersistence();

  if (ownerProfileId) {
    await performOfflineMaintenance({
      ownerProfileId,
    });
  }

  await refreshOfflineHealth();
}
