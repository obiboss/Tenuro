import type { PropertyRuleDetailRow } from "@/server/repositories/property-rules.repository";
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

function getRuleCode(rule: PropertyRuleDetailRow) {
  return rule.metadata?.rule_code ?? null;
}

function getRuleNumber(rule: PropertyRuleDetailRow, key: string) {
  const value = rule.metadata?.config?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function buildPropertyRequirementClauses(rules: PropertyRuleDetailRow[]) {
  const clauses: string[] = [];

  for (const rule of rules) {
    const ruleCode = getRuleCode(rule);

    if (rule.status !== "active" || !ruleCode) {
      continue;
    }

    if (ruleCode === "pets_not_allowed") {
      clauses.push("The Tenant shall not keep pets in the premises.");
    }

    if (ruleCode === "maximum_occupants") {
      const maximumOccupants = getRuleNumber(rule, "maximumOccupants");

      if (maximumOccupants) {
        clauses.push(
          `The premises shall not be occupied by more than ${maximumOccupants} person${
            maximumOccupants === 1 ? "" : "s"
          } without the Landlord’s written consent.`,
        );
      }
    }

    if (ruleCode === "residential_only") {
      clauses.push(
        "The premises shall be used strictly for residential purposes only and shall not be used for business or commercial activity without the Landlord’s written consent.",
      );
    }

    if (ruleCode === "children_under_5_not_allowed") {
      clauses.push(
        "The Tenant confirms that no child under the age of five shall reside in the premises during the tenancy without the Landlord’s written consent.",
      );
    }

    if (ruleCode === "minimum_monthly_income") {
      const minimumMonthlyIncome = getRuleNumber(rule, "minimumMonthlyIncome");

      if (minimumMonthlyIncome) {
        clauses.push(
          `The Tenant confirms that their monthly income or regular cashflow is sufficient to support the rent obligation, with the minimum affordability requirement recorded as ${formatMoney(
            minimumMonthlyIncome,
            "NGN",
          )}.`,
        );
      }
    }

    if (ruleCode === "guarantor_required") {
      clauses.push(
        "The Tenant shall provide complete guarantor details after accepting this Agreement and before the first rent payment link is made available.",
      );
    }

    if (ruleCode === "shortlet_not_allowed") {
      clauses.push(
        "The Tenant shall not use the premises for short-let, Airbnb, daily rental, serviced apartment use, or similar temporary accommodation business.",
      );
    }

    if (ruleCode === "subletting_not_allowed") {
      clauses.push(
        "The Tenant shall not sublet, assign, share possession, or rent out any part of the premises to another person without the Landlord’s written consent.",
      );
    }

    if (ruleCode === "customer_facing_business_not_allowed") {
      clauses.push(
        "The Tenant shall not operate any customer-facing business from the premises that brings regular customers, staff, clients, or unusual visitor traffic to the property.",
      );
    }

    if (ruleCode === "heavy_generator_or_equipment_not_allowed") {
      clauses.push(
        "The Tenant shall not install or use heavy generators, machinery, commercial equipment, or equipment that may cause nuisance, damage, vibration, smoke, or excessive noise.",
      );
    }

    if (ruleCode === "large_gatherings_not_allowed") {
      clauses.push(
        "The Tenant shall not host regular parties, events, meetings, or large gatherings that may disturb other occupants, neighbours, or the property environment.",
      );
    }
  }

  if (clauses.length === 0) {
    return "No additional property requirements were selected.";
  }

  return clauses.map((clause, index) => `${index + 1}. ${clause}`).join("\n");
}

export function buildTenancyAgreementTemplate(params: {
  landlord: {
    fullName: string;
    phoneNumber: string;
    email: string | null;
  };
  tenancy: TenancyDetailRow;
  propertyRules?: PropertyRuleDetailRow[];
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
  const propertyRequirementClauses = buildPropertyRequirementClauses(
    params.propertyRules ?? [],
  );

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

6. PROPERTY REQUIREMENTS

The Tenant agrees to comply with the following property requirements selected for this premises:

${propertyRequirementClauses}

7. TENANT’S OBLIGATIONS

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

8. LANDLORD’S OBLIGATIONS

The Landlord agrees to:
a. Ensure peaceful possession of the premises by the Tenant
b. Carry out structural repairs where necessary and where such repair is not caused by the Tenant
c. Not interfere unreasonably with the Tenant’s quiet enjoyment
d. Maintain records of rent payments and tenancy documents through Tenuro where applicable

9. UTILITIES / SERVICE CHARGES

Unless otherwise agreed in writing, the Tenant shall be responsible for electricity bills, water bills, waste disposal charges, estate dues, service charges, and other utilities consumed or assigned to the premises during the tenancy.

10. REPAIRS / DAMAGES

Any damage caused by the Tenant, the Tenant’s family, visitors, agents, or occupants beyond normal wear and tear shall be repaired at the Tenant’s cost.

The Landlord shall be responsible for structural repairs not caused by the Tenant.

11. INSPECTION

The Landlord or authorized agent may inspect the premises upon giving reasonable notice to the Tenant, except in emergencies.

12. TERMINATION / NOTICE TO QUIT

Either party may terminate this tenancy by giving the legally required notice in writing, subject to applicable Nigerian tenancy laws and any state-specific tenancy regulations.

13. BREACH / DEFAULT

Failure to pay rent when due, misuse of premises, unauthorized subletting, property damage, illegal activity, or breach of material terms may result in termination in accordance with applicable law.

14. GOVERNING LAW

This Agreement shall be governed by the laws of the Federal Republic of Nigeria and applicable state tenancy laws.

15. DIGITAL RECORD AND ACCEPTANCE

Where this Agreement is reviewed or accepted through Tenuro, the digital acceptance record, timestamp, and stored document copy shall serve as evidence that the Tenant reviewed and accepted the terms. The parties may also print and sign a hard copy for physical record purposes.

16. SPECIAL TERMS

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
