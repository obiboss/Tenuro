import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ManagerTenantOnboardingReviewDetail } from "@/components/manager/manager-tenant-onboarding-review-list";
import {
  getManagerOrganizationForCurrentUser,
} from "@/server/repositories/manager.repository";
import { getManagerTenantOnboardingRequestById } from "@/server/repositories/manager-tenant-onboarding.repository";
import { requireManager } from "@/server/services/auth.service";
import { createTenantKycDocumentLinks } from "@/server/services/storage.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

type ManagerTenantReviewPageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

function getMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export default async function ManagerTenantReviewPage({
  params,
}: ManagerTenantReviewPageProps) {
  const { requestId } = await params;
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();
  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const request = await getManagerTenantOnboardingRequestById(supabase, {
    organizationId: organization.id,
    requestId,
  });

  if (!request) {
    notFound();
  }

  const kycDocuments = await createTenantKycDocumentLinks({
    tenantIdDocumentPath:
      getMetadataText(request.metadata, "tenant_id_document_path") ??
      getMetadataText(request.metadata, "idDocumentPath"),
    tenantPassportPhotoPath:
      getMetadataText(request.metadata, "tenant_passport_photo_path") ??
      getMetadataText(request.metadata, "passportPhotoPath"),
    guarantorIdDocumentPath:
      getMetadataText(request.metadata, "guarantor_id_document_path") ??
      getMetadataText(request.metadata, "guarantorIdDocumentPath"),
  });
  const kycDocumentList = Object.values(kycDocuments);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/manager/attention"
            prefetch={false}
            className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
          >
            Back to attention
          </Link>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-text-strong">
            Tenant details review
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Review the submitted tenant details and approve or reject the
            request.
          </p>
        </div>

        <Link
          href={`/manager/properties/${request.property_id}`}
          prefetch={false}
          className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
        >
          Open property
        </Link>
      </div>

      <ManagerTenantOnboardingReviewDetail
        request={request}
        kycDocuments={kycDocumentList}
      />
    </div>
  );
}
