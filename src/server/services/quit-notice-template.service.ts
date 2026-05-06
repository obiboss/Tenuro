import type { QuitNoticeDetailRow } from "@/server/repositories/quit-notices.repository";

function formatDate(value: string | null) {
  if (!value) {
    return "____________________";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

function getNoticeTypeTitle(value: QuitNoticeDetailRow["notice_type"]) {
  if (value === "tenant_intent_to_vacate") {
    return "TENANT NOTICE OF INTENTION TO VACATE";
  }

  return "NOTICE TO QUIT";
}

export function buildQuitNoticeTemplate(quitNotice: QuitNoticeDetailRow) {
  const tenantName = quitNotice.tenants?.full_name ?? "____________________";
  const tenantPhone =
    quitNotice.tenants?.phone_number ?? "____________________";
  const tenantAddress =
    quitNotice.tenants?.home_address ?? "____________________";
  const propertyName =
    quitNotice.units?.properties?.property_name ?? "____________________";
  const propertyAddress =
    quitNotice.units?.properties?.address ?? "____________________";
  const unitIdentifier =
    quitNotice.units?.unit_identifier ?? "____________________";
  const tenancyReference =
    quitNotice.tenancies?.tenancy_reference ?? "____________________";
  const noticeTitle = getNoticeTypeTitle(quitNotice.notice_type);

  if (quitNotice.notice_type === "tenant_intent_to_vacate") {
    return `${noticeTitle}

Date of Notice:
${formatDate(quitNotice.notice_date)}

TENANT:
${tenantName}
Phone Number: ${tenantPhone}
Address: ${tenantAddress}

LANDLORD / PROPERTY RECORD:
Property: ${propertyName}
Unit: ${unitIdentifier}
Address: ${propertyAddress}
Tenancy Reference: ${tenancyReference}

1. NOTICE OF INTENTION TO VACATE

The Tenant gives notice of intention to vacate the premises stated above.

2. INTENDED VACATE DATE

The Tenant states that possession of the premises is intended to be given up on or before:

${formatDate(quitNotice.vacate_by_date)}

3. REASON / NOTE

${quitNotice.reason}

4. IMPORTANT RECORD NOTE

This notice records the Tenant's stated intention to leave. The unit does not become vacant automatically from this notice alone.

Vacancy, tenancy closure, inspection, and final account handling must be confirmed through the proper move-out process on Tenuro.

5. DIGITAL RECORD

This notice is stored on Tenuro as part of the tenancy record. Where this document is delivered or acknowledged digitally, the stored timestamp and audit trail may be used as supporting evidence of the notice record.

SIGNED:

_____________________________
TENANT

Date: _______________________


ACKNOWLEDGED BY:

_____________________________
LANDLORD / AUTHORIZED REPRESENTATIVE

Date: _______________________
`;
  }

  return `${noticeTitle}

Date of Notice:
${formatDate(quitNotice.notice_date)}

TO:
${tenantName}
Phone Number: ${tenantPhone}
Address: ${tenantAddress}

PREMISES:
Property: ${propertyName}
Unit: ${unitIdentifier}
Address: ${propertyAddress}
Tenancy Reference: ${tenancyReference}

1. NOTICE

You are hereby given notice in respect of the premises stated above.

2. VACATE-BY DATE

You are required to vacate and deliver up possession of the premises on or before:

${formatDate(quitNotice.vacate_by_date)}

3. REASON

${quitNotice.reason}

4. TENANCY AND LEGAL NOTE

This notice is issued in relation to the tenancy record maintained on Tenuro and is subject to applicable Nigerian tenancy laws and any state-specific tenancy regulations.

This notice does not by itself mark the unit as vacant on Tenuro. The unit remains occupied until actual move-out, inspection, and landlord confirmation are completed.

5. LANDLORD NOTE

${quitNotice.landlord_notes || "No additional landlord note."}

6. DIGITAL RECORD

This notice is stored on Tenuro as part of the tenancy record. Where this document is delivered or acknowledged digitally, the stored timestamp and audit trail may be used as supporting evidence of the notice record.

SIGNED:

_____________________________
LANDLORD / AUTHORIZED REPRESENTATIVE

Date: _______________________


ACKNOWLEDGED BY:

_____________________________
TENANT

Date: _______________________
`;
}
