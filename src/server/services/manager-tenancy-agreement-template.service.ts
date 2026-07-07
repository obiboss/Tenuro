import "server-only";

import type { ManagerOnboardingPaymentFrequency } from "@/server/validators/manager-tenant-onboarding.schema";

type ManagerAgreementTemplateParams = {
  organization: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  landlord: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  tenant: {
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
  };
  property: {
    propertyName: string;
    propertyAddress: string;
    unitLabel: string;
  };
  tenancy: {
    rentAmount: number;
    currencyCode: "NGN";
    moveInDate: string;
    nextRentDueDate: string;
    paymentFrequency: ManagerOnboardingPaymentFrequency;
    agreementNotes: string | null;
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "____________________";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function paymentFrequencyLabel(value: ManagerOnboardingPaymentFrequency) {
  const labels: Record<ManagerOnboardingPaymentFrequency, string> = {
    annual: "year",
    monthly: "month",
    quarterly: "quarter",
    biannual: "six months",
  };

  return labels[value];
}

function getDefaultPropertyRequirementClauses() {
  return [
    "1. The Tenant shall use the premises only for lawful and approved purposes.",
    "2. The Tenant shall not sublet, assign, share possession, or rent out any part of the premises without the Landlord’s written consent.",
    "3. The Tenant shall not carry out structural alterations without the Landlord’s written consent.",
    "4. The Tenant shall observe all estate, compound, community, and building rules applicable to the premises.",
  ].join("\n");
}

export function buildManagerTenancyAgreementTemplate(
  params: ManagerAgreementTemplateParams,
) {
  const landlordName = params.landlord.name || "____________________";
  const landlordPhone = params.landlord.phone || "____________________";
  const landlordEmail = params.landlord.email || "____________________";
  const landlordAddress = params.landlord.address || "____________________";
  const tenantName = params.tenant.fullName || "____________________";
  const tenantPhone = params.tenant.phoneNumber || "____________________";
  const tenantEmail = params.tenant.email || "____________________";
  const propertyName = params.property.propertyName || "____________________";
  const propertyAddress =
    params.property.propertyAddress || "____________________";
  const unitLabel = params.property.unitLabel || "____________________";
  const rentAmount = formatMoney(
    params.tenancy.rentAmount,
    params.tenancy.currencyCode,
  );
  const rentFrequency = paymentFrequencyLabel(params.tenancy.paymentFrequency);

  return `TENANCY AGREEMENT

THIS TENANCY AGREEMENT is made on the date this document is finalized by the Property Manager.

BETWEEN:

LANDLORD:
${landlordName}
Address: ${landlordAddress}
Phone Number: ${landlordPhone}
Email: ${landlordEmail}

AND

TENANT:
${tenantName}
Phone Number: ${tenantPhone}
Email: ${tenantEmail}

1. PREMISES

The Landlord lets to the Tenant the premises known as:

Property: ${propertyName}
Unit: ${unitLabel}
Address: ${propertyAddress}

2. TERM

The tenancy shall commence on ${formatDate(params.tenancy.moveInDate)}
and shall end on ${formatDate(params.tenancy.nextRentDueDate)} unless renewed or terminated in accordance with this Agreement and applicable law.

3. RENT

The Tenant shall pay rent in the sum of ${rentAmount} per ${rentFrequency}.

Payment shall be due on or before ${formatDate(params.tenancy.nextRentDueDate)}.

4. CAUTION / SECURITY DEPOSIT

The Tenant shall pay a refundable caution/security deposit where applicable.

The deposit shall be refunded at the end of tenancy subject to:
- No damage beyond normal wear and tear
- No outstanding bills, rent, service charge, or other liabilities
- Compliance with all tenancy obligations
- Return of the premises in acceptable condition

5. USE OF PREMISES

The premises shall be used strictly for lawful residential or approved purposes only.

The Tenant shall not use the premises for illegal, dangerous, nuisance-causing, or unauthorized commercial activities.

6. PROPERTY REQUIREMENTS

The Tenant agrees to comply with the following property requirements for this premises:

${getDefaultPropertyRequirementClauses()}

7. TENANT’S OBLIGATIONS

The Tenant agrees to:
a. Pay rent promptly when due
b. Maintain the premises in good and tenantable condition
c. Keep the premises clean and safe
d. Not make structural alterations without the Landlord’s written consent
e. Not sublet, assign, or transfer possession without the Landlord’s written consent
f. Observe all estate, compound, community, and building rules
g. Pay utility bills and service charges assigned to the Tenant
h. Notify the Landlord or Property Manager promptly of major repairs or damage
i. Avoid causing nuisance, disturbance, or damage to other occupants or neighbours

8. LANDLORD’S OBLIGATIONS

The Landlord agrees to:
a. Ensure peaceful possession of the premises by the Tenant
b. Carry out structural repairs where necessary and where such repair is not caused by the Tenant
c. Not interfere unreasonably with the Tenant’s quiet enjoyment
d. Maintain proper rent and tenancy records through the appointed Property Manager where applicable

9. UTILITIES / SERVICE CHARGES

Unless otherwise agreed in writing, the Tenant shall be responsible for electricity bills, water bills, waste disposal charges, estate dues, service charges, and other utilities consumed or assigned to the premises during the tenancy.

10. REPAIRS / DAMAGES

Any damage caused by the Tenant, the Tenant’s family, visitors, agents, or occupants beyond normal wear and tear shall be repaired at the Tenant’s cost.

The Landlord shall be responsible for structural repairs not caused by the Tenant.

11. INSPECTION

The Landlord, Property Manager, or authorized agent may inspect the premises upon giving reasonable notice to the Tenant, except in emergencies.

12. TERMINATION / NOTICE TO QUIT

Either party may terminate this tenancy by giving the legally required notice in writing, subject to applicable Nigerian tenancy laws and any state-specific tenancy regulations.

13. BREACH / DEFAULT

Failure to pay rent when due, misuse of premises, unauthorized subletting, property damage, illegal activity, or breach of material terms may result in termination in accordance with applicable law.

14. GOVERNING LAW

This Agreement shall be governed by the laws of the Federal Republic of Nigeria and applicable state tenancy laws.

15. DIGITAL RECORD AND ACCEPTANCE

Where this Agreement is reviewed or accepted through BOPA (Boldverse Property), the digital acceptance record, timestamp, and stored document copy shall serve as evidence that the Tenant reviewed and accepted the terms. The parties may also print and sign a hard copy for physical record purposes.

16. PROPERTY MANAGER

The parties acknowledge that ${params.organization.name} acts as Property Manager for the tenancy records, rent process, notices, and related property management communication where applicable.

Property Manager Phone: ${params.organization.phone || "____________________"}
Property Manager Email: ${params.organization.email || "____________________"}

17. SPECIAL TERMS

${params.tenancy.agreementNotes || "No special terms added."}

SIGNED:

_____________________________
LANDLORD / AGENT

Date: _______________________


_____________________________
TENANT

Date: _______________________


WITNESSES:

1. Name: ____________________
Signature: _________________

2. Name: ____________________
Signature: _________________
`;
}
