export type ReceiptGeneratorLocation = {
  slug: string;
  label: string;
  state: string;
  title: string;
  description: string;
  seoKeyword: string;
  intro: string;
  useCases: string[];
};

export const receiptGeneratorLocations = [
  {
    slug: "lagos",
    label: "Lagos",
    state: "Lagos",
    title: "Free Rent Receipt Generator Lagos",
    description:
      "Generate a clean rent receipt for Lagos landlords managing flats, apartments, shops, and annual tenant payments.",
    seoKeyword: "rent receipt generator Lagos",
    intro:
      "Use BOPA to create a rent receipt for Lagos tenants after rent is paid by bank transfer, cash, or online payment.",
    useCases: [
      "Annual rent receipt for Lagos apartments",
      "Receipt for Lekki, Ikeja, Yaba, Surulere, Ajah, and mainland rentals",
      "Tenant payment proof for flats, shops, and self-contained units",
    ],
  },
  {
    slug: "abuja",
    label: "Abuja",
    state: "FCT",
    title: "Free Rent Receipt Generator Abuja",
    description:
      "Create a professional rent receipt for Abuja landlords and tenants without signing up first.",
    seoKeyword: "rent receipt generator Abuja",
    intro:
      "Prepare clear rent receipts for Abuja properties, tenant records, and yearly rent payments.",
    useCases: [
      "Annual rent receipt for Abuja tenants",
      "Receipt for Wuse, Gwarinpa, Maitama, Kubwa, Lugbe, and Jabi rentals",
      "Landlord payment record for residential and commercial units",
    ],
  },
  {
    slug: "port-harcourt",
    label: "Port Harcourt",
    state: "Rivers",
    title: "Free Rent Receipt Generator Port Harcourt",
    description:
      "Prepare a clear rent payment receipt for Port Harcourt landlords, tenants, and property managers.",
    seoKeyword: "rent receipt generator Port Harcourt",
    intro:
      "Generate a clean receipt for Port Harcourt rent payments with landlord, tenant, property, and rent-period details.",
    useCases: [
      "Rent receipt for Port Harcourt apartments and shops",
      "Receipt for GRA, Woji, Rumuola, Trans-Amadi, and Ada George rentals",
      "Tenant rent payment record for yearly or six-month rent",
    ],
  },
  {
    slug: "ibadan",
    label: "Ibadan",
    state: "Oyo",
    title: "Free Rent Receipt Generator Ibadan",
    description:
      "Generate rent receipts for Ibadan landlords, tenants, shops, flats, and annual rent payments.",
    seoKeyword: "rent receipt generator Ibadan",
    intro:
      "Create a professional Ibadan rent receipt before saving property and tenant records inside BOPA.",
    useCases: [
      "Receipt for Bodija, Ring Road, Challenge, Akobo, and Dugbe rentals",
      "Annual rent payment receipt for Ibadan landlords",
      "Tenant receipt for rooms, flats, shops, and offices",
    ],
  },
  {
    slug: "enugu",
    label: "Enugu",
    state: "Enugu",
    title: "Free Rent Receipt Generator Enugu",
    description:
      "Create rent receipts for Enugu landlords and tenants with automatic rent-period calculation.",
    seoKeyword: "rent receipt generator Enugu",
    intro:
      "Use BOPA to prepare a clear rent payment receipt for Enugu properties and tenant records.",
    useCases: [
      "Receipt for Independence Layout, New Haven, Trans-Ekulu, and GRA rentals",
      "Landlord receipt for annual rent payment",
      "Tenant rent proof for homes, shops, and offices",
    ],
  },
  {
    slug: "owerri",
    label: "Owerri",
    state: "Imo",
    title: "Free Rent Receipt Generator Owerri",
    description:
      "Generate clean rent receipts for Owerri landlords, tenants, and property managers.",
    seoKeyword: "rent receipt generator Owerri",
    intro:
      "Prepare an Owerri rent receipt with payment amount, landlord details, tenant details, and rent period.",
    useCases: [
      "Receipt for Owerri apartments, rooms, and shops",
      "Annual rent receipt for tenant payment confirmation",
      "Landlord record for bank transfer or cash rent payment",
    ],
  },
  {
    slug: "aba",
    label: "Aba",
    state: "Abia",
    title: "Free Rent Receipt Generator Aba",
    description:
      "Create rent receipts for Aba landlords managing shops, flats, rooms, and commercial spaces.",
    seoKeyword: "rent receipt generator Aba",
    intro:
      "Use BOPA to generate rent receipts for Aba residential and commercial tenants before creating an account.",
    useCases: [
      "Shop rent receipt for Aba commercial tenants",
      "Receipt for flats, rooms, and self-contained apartments",
      "Annual or six-month rent payment receipt",
    ],
  },
  {
    slug: "onitsha",
    label: "Onitsha",
    state: "Anambra",
    title: "Free Rent Receipt Generator Onitsha",
    description:
      "Generate rent receipts for Onitsha shops, flats, warehouses, and tenant payments.",
    seoKeyword: "rent receipt generator Onitsha",
    intro:
      "Prepare a clear receipt for Onitsha rent payments, including landlord, tenant, property, and payment details.",
    useCases: [
      "Shop and warehouse rent receipt for Onitsha traders",
      "Receipt for residential flats and rooms",
      "Tenant payment proof for yearly rent",
    ],
  },
  {
    slug: "benin-city",
    label: "Benin City",
    state: "Edo",
    title: "Free Rent Receipt Generator Benin City",
    description:
      "Create professional rent receipts for Benin City landlords and tenants in minutes.",
    seoKeyword: "rent receipt generator Benin City",
    intro:
      "Use BOPA to create a Benin City rent receipt for annual rent, six-month rent, and tenant payment records.",
    useCases: [
      "Receipt for GRA, Ugbowo, Sapele Road, and Airport Road rentals",
      "Annual rent receipt for landlords and tenants",
      "Payment record for flats, shops, and offices",
    ],
  },
  {
    slug: "uyo",
    label: "Uyo",
    state: "Akwa Ibom",
    title: "Free Rent Receipt Generator Uyo",
    description:
      "Generate rent receipts for Uyo landlords, tenants, flats, shops, and annual rent payments.",
    seoKeyword: "rent receipt generator Uyo",
    intro:
      "Prepare a clean Uyo rent receipt with tenant details, property address, payment method, and rent period.",
    useCases: [
      "Receipt for Uyo apartments, shops, and rooms",
      "Tenant rent payment confirmation",
      "Annual rent record for landlords",
    ],
  },
] as const satisfies readonly ReceiptGeneratorLocation[];

export function getReceiptGeneratorLocation(slug: string) {
  return receiptGeneratorLocations.find((location) => location.slug === slug);
}

export function getFeaturedReceiptGeneratorLocations() {
  return receiptGeneratorLocations.slice(0, 6);
}
