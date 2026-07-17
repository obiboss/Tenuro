export const AGREEMENT_TEMPLATE_PLACEHOLDERS = {
  landlordName: "{{landlord_name}}",
  landlordPhone: "{{landlord_phone}}",
  landlordEmail: "{{landlord_email}}",
  tenantName: "{{tenant_name}}",
  tenantPhone: "{{tenant_phone}}",
  tenantEmail: "{{tenant_email}}",
  propertyName: "{{property_name}}",
  propertyAddress: "{{property_address}}",
  unitIdentifier: "{{unit_identifier}}",
  rentAmount: "{{rent_amount}}",
  rentFrequency: "{{rent_frequency}}",
  startDate: "{{start_date}}",
  endDate: "{{end_date}}",
  propertyRequirements: "{{property_requirements}}",
  specialTerms: "{{special_terms}}",
} as const;

export const DEFAULT_LANDLORD_AGREEMENT_TEMPLATE = `TENANCY AGREEMENT

THIS TENANCY AGREEMENT is made on the date this document is finalized by the Landlord.

BETWEEN:

LANDLORD:
{{landlord_name}}
Phone Number: {{landlord_phone}}
Email: {{landlord_email}}

AND

TENANT:
{{tenant_name}}
Phone Number: {{tenant_phone}}
Email: {{tenant_email}}

1. PREMISES

The Landlord lets to the Tenant the premises known as:

Property: {{property_name}}
Unit: {{unit_identifier}}
Address: {{property_address}}

2. TERM

The tenancy shall commence on {{start_date}}
and shall end on {{end_date}} unless renewed or terminated in accordance with this Agreement and applicable law.

3. RENT

The Tenant shall pay rent in the sum of {{rent_amount}} per {{rent_frequency}}.

Payment shall be due in accordance with the agreed payment frequency and the tenancy record maintained on BOPA (Boldverse Property).

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

{{property_requirements}}

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
d. Maintain records of rent payments and tenancy documents through BOPA (Boldverse Property) where applicable

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

Where this Agreement is reviewed or accepted through BOPA (Boldverse Property), the digital acceptance record, timestamp, and stored document copy shall serve as evidence that the Tenant reviewed and accepted the terms. The parties may also print and sign a hard copy for physical record purposes.

16. SPECIAL TERMS

{{special_terms}}

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

export type AgreementTemplateRenderContext = {
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyName: string;
  propertyAddress: string;
  unitIdentifier: string;
  rentAmount: string;
  rentFrequency: string;
  startDate: string;
  endDate: string;
  propertyRequirements: string;
  specialTerms: string;
};

export function renderAgreementTemplate(
  templateBody: string,
  context: AgreementTemplateRenderContext,
) {
  return templateBody
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.landlordName, context.landlordName)
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.landlordPhone,
      context.landlordPhone,
    )
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.landlordEmail,
      context.landlordEmail,
    )
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.tenantName, context.tenantName)
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.tenantPhone, context.tenantPhone)
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.tenantEmail, context.tenantEmail)
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.propertyName,
      context.propertyName,
    )
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.propertyAddress,
      context.propertyAddress,
    )
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.unitIdentifier,
      context.unitIdentifier,
    )
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.rentAmount, context.rentAmount)
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.rentFrequency,
      context.rentFrequency,
    )
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.startDate, context.startDate)
    .replaceAll(AGREEMENT_TEMPLATE_PLACEHOLDERS.endDate, context.endDate)
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.propertyRequirements,
      context.propertyRequirements,
    )
    .replaceAll(
      AGREEMENT_TEMPLATE_PLACEHOLDERS.specialTerms,
      context.specialTerms,
    );
}
