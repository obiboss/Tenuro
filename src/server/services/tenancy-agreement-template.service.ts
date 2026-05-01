import type { TenancyDetailRow } from "@/server/repositories/tenancies.repository";

function formatDate(value: string | null) {
  if (!value) {
    return "____________________";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentFrequencyLabel(value: string) {
  const labels: Record<string, string> = {
    annual: "year",
    monthly: "month",
    quarterly: "quarter",
    biannual: "six months",
  };

  return labels[value] ?? value;
}

export function buildTenancyAgreementTemplate(params: {
  landlord: {
    fullName: string;
    phoneNumber: string;
    email: string | null;
  };
  tenancy: TenancyDetailRow;
}) {
  const tenant = params.tenancy.tenants;
  const unit = params.tenancy.units;
  const property = unit?.properties;

  const landlordName = params.landlord.fullName;
  const landlordPhone = params.landlord.phoneNumber;
  const tenantName = tenant?.full_name ?? "____________________";
  const tenantPhone = tenant?.phone_number ?? "____________________";
  const propertyName = property?.property_name ?? "____________________";
  const propertyAddress = property?.address ?? "____________________";
  const unitIdentifier = unit?.unit_identifier ?? "____________________";
  const rentAmount = formatMoney(
    params.tenancy.rent_amount,
    params.tenancy.currency_code,
  );
  const rentFrequency = paymentFrequencyLabel(params.tenancy.payment_frequency);

  return `TENANCY AGREEMENT

THIS TENANCY AGREEMENT is made on the date this document is finalized by the Landlord.

BETWEEN:

LANDLORD:
${landlordName}
Phone Number: ${landlordPhone}
Email: ${params.landlord.email ?? "____________________"}

AND

TENANT:
${tenantName}
Phone Number: ${tenantPhone}
Email: ${tenant?.email ?? "____________________"}

1. PREMISES

The Landlord lets to the Tenant the premises known as:

Property: ${propertyName}
Unit: ${unitIdentifier}
Address: ${propertyAddress}

2. TERM

The tenancy shall commence on ${formatDate(params.tenancy.start_date)}
and shall end on ${formatDate(params.tenancy.end_date)} unless renewed or terminated in accordance with this Agreement and applicable law.

3. RENT

The Tenant shall pay rent in the sum of ${rentAmount} per ${rentFrequency}.

Payment shall be due in accordance with the agreed payment frequency and the tenancy record maintained on Tenuro.

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

6. TENANT’S OBLIGATIONS

The Tenant agrees to:
a. Pay rent promptly when due
b. Maintain the premises in good and tenantable condition
c. Keep the premises clean and safe
d. Not make structural alterations without the Landlord’s written consent
e. Not sublet, assign, or transfer possession without the Landlord’s written consent
f. Observe all estate, compound, community, and building rules
g. Pay utility bills and service charges assigned to the Tenant
h. Notify the Landlord promptly of major repairs or damage
i. Avoid causing nuisance, disturbance, or damage to other occupants or neighbours

7. LANDLORD’S OBLIGATIONS

The Landlord agrees to:
a. Ensure peaceful possession of the premises by the Tenant
b. Carry out structural repairs where necessary and where such repair is not caused by the Tenant
c. Not interfere unreasonably with the Tenant’s quiet enjoyment
d. Maintain records of rent payments and tenancy documents through Tenuro where applicable

8. UTILITIES / SERVICE CHARGES

Unless otherwise agreed in writing, the Tenant shall be responsible for electricity bills, water bills, waste disposal charges, estate dues, service charges, and other utilities consumed or assigned to the premises during the tenancy.

9. REPAIRS / DAMAGES

Any damage caused by the Tenant, the Tenant’s family, visitors, agents, or occupants beyond normal wear and tear shall be repaired at the Tenant’s cost.

The Landlord shall be responsible for structural repairs not caused by the Tenant.

10. INSPECTION

The Landlord or authorized agent may inspect the premises upon giving reasonable notice to the Tenant, except in emergencies.

11. TERMINATION / NOTICE TO QUIT

Either party may terminate this tenancy by giving the legally required notice in writing, subject to applicable Nigerian tenancy laws and any state-specific tenancy regulations.

12. BREACH / DEFAULT

Failure to pay rent when due, misuse of premises, unauthorized subletting, property damage, illegal activity, or breach of material terms may result in termination in accordance with applicable law.

13. GOVERNING LAW

This Agreement shall be governed by the laws of the Federal Republic of Nigeria and applicable state tenancy laws.

14. DIGITAL RECORD AND ACCEPTANCE

Where this Agreement is reviewed or accepted through Tenuro, the digital acceptance record, timestamp, and stored document copy shall serve as evidence that the Tenant reviewed and accepted the terms. The parties may also print and sign a hard copy for physical record purposes.

15. SPECIAL TERMS

${params.tenancy.agreement_notes || "No special terms added."}

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
