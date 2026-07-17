export const DEVELOPER_DOCUMENT_TYPES = [
  "sales_agreement",
  "payment_receipts",
  "allocation_letter",
  "cofo_copy_reference",
  "deed_of_assignment_copy_reference",
  "survey_plan_copy_reference",
] as const;

export type DeveloperDocumentType = (typeof DEVELOPER_DOCUMENT_TYPES)[number];

export type DeveloperEditableTemplateType =
  | "sales_agreement"
  | "allocation_letter";

export type DeveloperDocumentDefinition = {
  type: DeveloperDocumentType;
  label: string;
  description: string;
  isEditableTemplate: boolean;
  defaultPortalStatus: string;
};

export const DEVELOPER_DOCUMENT_DEFINITIONS: DeveloperDocumentDefinition[] = [
  {
    type: "sales_agreement",
    label: "Sales Agreement",
    description:
      "Auto-filled sale agreement copy for buyer review, printing, signing, and hard-copy processing.",
    isEditableTemplate: true,
    defaultPortalStatus: "Copy available when generated",
  },
  {
    type: "payment_receipts",
    label: "Payment Receipt(s)",
    description:
      "Receipts generated automatically after confirmed Paystack payments.",
    isEditableTemplate: false,
    defaultPortalStatus: "Available after each confirmed payment",
  },
  {
    type: "allocation_letter",
    label: "Allocation Letter",
    description:
      "Auto-filled allocation letter copy for buyer review, printing, signing, and developer acknowledgement.",
    isEditableTemplate: true,
    defaultPortalStatus: "Copy available when generated",
  },
  {
    type: "cofo_copy_reference",
    label: "CofO copy/reference",
    description:
      "Certificate of Occupancy copy or reference record. Physical original remains developer-issued.",
    isEditableTemplate: false,
    defaultPortalStatus: "Locked until full payment or developer release",
  },
  {
    type: "deed_of_assignment_copy_reference",
    label: "Deed of Assignment copy/reference",
    description:
      "Deed copy or reference record. Physical original remains developer-issued.",
    isEditableTemplate: false,
    defaultPortalStatus: "Locked until full payment or developer release",
  },
  {
    type: "survey_plan_copy_reference",
    label: "Survey Plan copy/reference",
    description:
      "Survey plan copy or reference record. Physical original remains developer-issued.",
    isEditableTemplate: false,
    defaultPortalStatus: "Locked until full payment or developer release",
  },
];

export const DEVELOPER_TEMPLATE_PLACEHOLDERS = [
  "{{developer_company_name}}",
  "{{developer_office_address}}",
  "{{developer_company_phone}}",
  "{{developer_company_email}}",
  "{{authorized_representative_name}}",
  "{{authorized_representative_designation}}",
  "{{buyer_full_name}}",
  "{{buyer_phone_number}}",
  "{{buyer_email}}",
  "{{buyer_address}}",
  "{{estate_name}}",
  "{{estate_location}}",
  "{{estate_city}}",
  "{{estate_lga}}",
  "{{estate_state}}",
  "{{plot_number}}",
  "{{plot_size}}",
  "{{plot_use}}",
  "{{title_description}}",
  "{{survey_plan_reference}}",
  "{{sale_reference}}",
  "{{total_price_locked}}",
  "{{total_price_locked_words}}",
  "{{initial_deposit_amount}}",
  "{{amount_paid}}",
  "{{outstanding_balance}}",
  "{{payment_plan_mode}}",
  "{{sale_date}}",
  "{{expected_completion_date}}",
  "{{agreement_date}}",
  "{{allocation_date}}",
] as const;

export const DEFAULT_DEVELOPER_SALES_AGREEMENT_TEMPLATE = `SALES AGREEMENT FOR PURCHASE OF PLOT / PROPERTY

This Sales Agreement is made on {{agreement_date}}

BETWEEN:

{{developer_company_name}}, with office address at {{developer_office_address}}, represented by {{authorized_representative_name}}, hereinafter referred to as "the Developer/Seller".

AND

{{buyer_full_name}}, Phone Number: {{buyer_phone_number}}, Email: {{buyer_email}}, Address: {{buyer_address}}, hereinafter referred to as "the Buyer".

The Developer/Seller and the Buyer shall collectively be referred to as "the Parties".

1. PROPERTY DESCRIPTION

The Developer/Seller agrees to sell, and the Buyer agrees to purchase, the plot/property described below:

Estate Name: {{estate_name}}
Estate Location: {{estate_location}}
City/LGA/State: {{estate_city}} / {{estate_lga}} / {{estate_state}}
Plot Number: {{plot_number}}
Plot Size: {{plot_size}}
Land Use / Purpose: {{plot_use}}
Title Description: {{title_description}}
Survey Plan Reference: {{survey_plan_reference}}

2. PURCHASE PRICE

The total purchase price for the plot/property is {{total_price_locked_words}} ({{total_price_locked}}).

This price is locked for this sale upon creation of the sale record, subject only to the payment terms agreed by the Parties.

3. PAYMENT TERMS

Payment Plan Type: {{payment_plan_mode}}
Initial Deposit: {{initial_deposit_amount}}
Amount Paid to Date: {{amount_paid}}
Outstanding Balance: {{outstanding_balance}}
Sale Reference: {{sale_reference}}
Sale Date: {{sale_date}}
Expected Completion Date: {{expected_completion_date}}

The detailed payment schedule generated for this sale shall form part of this Agreement.

4. PAYMENT METHOD

All payments shall be made through the approved payment channels provided by the Developer/Seller or through the official Boldverse Property payment portal linked to this sale.

5. PAYMENT DEFAULT

Where the Buyer fails to pay according to the agreed schedule, the Developer/Seller may issue a payment reminder, default notice, suspend allocation processing, review the payment arrangement, or commence an exit/refund process subject to applicable deductions, administrative charges, legal charges, estate policy, and applicable law.

6. ALLOCATION

Upon receipt of the required deposit or agreed qualifying payment, the Developer/Seller may allocate the plot/property to the Buyer by issuing an Allocation Letter.

Final ownership documentation and physical original documents shall be issued only after full payment and completion of all handover requirements.

7. DOCUMENTS

The default documents connected to this sale may include:

a. Sales Agreement
b. Payment Receipt(s)
c. Allocation Letter
d. Certificate of Occupancy copy/reference, where applicable
e. Deed of Assignment copy/reference, where applicable
f. Survey Plan copy/reference, where applicable

Digital copies shown on any online portal are for reference, record, and convenience only. They do not replace original documents physically issued by the Developer/Seller.

8. PHYSICAL ORIGINAL DOCUMENT HANDOVER

The Buyer acknowledges that original documents, where applicable, shall be physically issued by the Developer/Seller after:

a. Full payment of the purchase price;
b. Settlement of all applicable charges;
c. Completion of identity and buyer verification;
d. Execution of all required legal documentation;
e. Completion of the Developer/Seller's handover process.

The Buyer may be required to sign a document handover acknowledgement upon receipt of originals.

9. ESTATE RULES AND DEVELOPMENT CONTROL

The Buyer agrees to comply with all estate rules, development guidelines, building control requirements, service charge obligations, architectural approval requirements, and other policies issued by the Developer/Seller or estate management.

10. TRANSFER OR RESALE

The Buyer shall not transfer, resell, assign, or otherwise dispose of the plot/property without notifying and obtaining any required consent from the Developer/Seller or estate management, where such consent is required by estate policy or applicable documentation.

11. REPRESENTATIONS

The Developer/Seller represents that it has authority to sell or allocate the plot/property described in this Agreement, subject to the title status disclosed to the Buyer.

The Buyer confirms that they have reviewed the plot/property details, price, payment plan, estate rules, and relevant title/document information before entering into this Agreement.

12. TERMINATION AND REFUND

Where this Agreement is terminated due to default, withdrawal, failed verification, breach of estate rules, or any other valid reason, any refund shall be treated according to the Developer/Seller's refund policy, subject to deductions for administrative charges, legal fees, agency fees, allocation costs, payment processing fees, damages, or other lawful deductions.

13. DISPUTE RESOLUTION

The Parties shall first attempt to resolve any dispute through negotiation. Where negotiation fails, the Parties may refer the matter to mediation, arbitration, or a court of competent jurisdiction.

14. GOVERNING LAW

This Agreement shall be governed by the laws of the Federal Republic of Nigeria and the applicable laws of the state where the property is located.

15. SIGNATURES

SIGNED BY THE DEVELOPER/SELLER

Name: {{authorized_representative_name}}
Designation: {{authorized_representative_designation}}
Company: {{developer_company_name}}
Signature: ___________________________
Date: _______________________________

SIGNED BY THE BUYER

Name: {{buyer_full_name}}
Signature: ___________________________
Date: _______________________________

WITNESS 1

Name: ______________________________
Address: ____________________________
Phone: ______________________________
Signature: ___________________________
Date: _______________________________

WITNESS 2

Name: ______________________________
Address: ____________________________
Phone: ______________________________
Signature: ___________________________
Date: _______________________________

Important Notice: This template is provided for operational convenience and should be reviewed by the Developer/Seller's legal adviser before use.`;

export const DEFAULT_DEVELOPER_ALLOCATION_LETTER_TEMPLATE = `ALLOCATION LETTER

{{developer_company_name}}
{{developer_office_address}}
{{developer_company_phone}}
{{developer_company_email}}

Date: {{allocation_date}}

To:

{{buyer_full_name}}
{{buyer_address}}
{{buyer_phone_number}}
{{buyer_email}}

Dear {{buyer_full_name}},

RE: ALLOCATION OF PLOT / PROPERTY AT {{estate_name}}

We are pleased to confirm the allocation of the plot/property described below to you, subject to the terms of your purchase, payment schedule, estate rules, and the Developer/Seller's documentation and handover process.

1. BUYER DETAILS

Buyer Name: {{buyer_full_name}}
Phone Number: {{buyer_phone_number}}
Email Address: {{buyer_email}}
Buyer Address: {{buyer_address}}

2. PROPERTY DETAILS

Estate Name: {{estate_name}}
Estate Location: {{estate_location}}
City/LGA/State: {{estate_city}} / {{estate_lga}} / {{estate_state}}
Plot Number: {{plot_number}}
Plot Size: {{plot_size}}
Land Use / Purpose: {{plot_use}}
Sale Reference: {{sale_reference}}

3. PAYMENT DETAILS

Total Purchase Price: {{total_price_locked}}
Amount Paid to Date: {{amount_paid}}
Outstanding Balance: {{outstanding_balance}}
Payment Plan: {{payment_plan_mode}}
Expected Completion Date: {{expected_completion_date}}

4. BASIS OF ALLOCATION

This allocation is made based on the Buyer's purchase record, agreed payment plan, and compliance with the Developer/Seller's requirements.

Where the purchase is not yet fully paid, this allocation remains subject to the Buyer's continued compliance with the payment schedule and all applicable terms.

5. DOCUMENT STATUS

The following documents may be connected to this allocation:

a. Sales Agreement
b. Payment Receipt(s)
c. Allocation Letter
d. Certificate of Occupancy copy/reference, where applicable
e. Deed of Assignment copy/reference, where applicable
f. Survey Plan copy/reference, where applicable

Digital copies made available through any online portal are for reference and record purposes only. Original documents, where applicable, shall be physically issued after full payment and completion of all handover requirements.

6. FULL PAYMENT AND ORIGINAL DOCUMENT HANDOVER

Final original documents shall only be physically issued after:

a. Full payment of the purchase price;
b. Settlement of all applicable charges;
c. Completion of buyer verification;
d. Execution of all required documents;
e. Completion of the Developer/Seller's handover process.

The Buyer may be required to sign an acknowledgement confirming receipt of physical original documents.

7. ESTATE RULES

The Buyer is required to comply with all estate rules, building/development guidelines, service charge obligations, architectural approval requirements, and any other policies issued by the Developer/Seller or estate management.

No construction or physical development shall commence without the required approvals.

8. DEFAULT OR NON-COMPLIANCE

Where the Buyer defaults on the agreed payment schedule or breaches the applicable terms, the Developer/Seller may issue a notice, suspend further processing, review the allocation, or commence any applicable recovery or exit process in accordance with the Developer/Seller's policy and applicable law.

9. CONFIRMATION

This Allocation Letter confirms the administrative allocation of the plot/property described above. It does not replace the final legal documentation, title documentation, or physical original document handover required to complete the transaction.

For: {{developer_company_name}}

Authorized Signatory: ___________________________
Name: {{authorized_representative_name}}
Designation: {{authorized_representative_designation}}
Date: ___________________________
Company Stamp/Seal: ___________________________

Buyer Acknowledgement

I, {{buyer_full_name}}, acknowledge receipt of this Allocation Letter and confirm that I understand the terms stated above.

Buyer Signature: ___________________________
Date: ___________________________

Important Notice: This template is provided for operational convenience and should be reviewed by the Developer/Seller's legal adviser before use.`;

export function getDefaultDeveloperTemplateBody(
  templateType: DeveloperEditableTemplateType,
) {
  if (templateType === "sales_agreement") {
    return DEFAULT_DEVELOPER_SALES_AGREEMENT_TEMPLATE;
  }

  return DEFAULT_DEVELOPER_ALLOCATION_LETTER_TEMPLATE;
}

export function getDefaultDeveloperTemplateName(
  templateType: DeveloperEditableTemplateType,
) {
  if (templateType === "sales_agreement") {
    return "Default Sales Agreement";
  }

  return "Default Allocation Letter";
}

export function isDeveloperEditableTemplateType(
  value: string,
): value is DeveloperEditableTemplateType {
  return value === "sales_agreement" || value === "allocation_letter";
}
