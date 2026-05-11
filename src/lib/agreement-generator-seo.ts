export type AgreementGeneratorLocation = {
  slug: string;
  label: string;
  state: string;
  title: string;
  description: string;
  seoKeyword: string;
  intro: string;
  useCases: string[];
};

export type AgreementGeneratorTemplate = {
  slug: string;
  label: string;
  title: string;
  description: string;
  seoKeyword: string;
  intro: string;
  useCases: string[];
};

export const agreementGeneratorLocations = [
  {
    slug: "lagos",
    label: "Lagos",
    state: "Lagos",
    title: "Free Tenancy Agreement Generator Lagos",
    description:
      "Generate a tenancy agreement preview for Lagos landlords managing flats, apartments, shops, and annual rent tenancies.",
    seoKeyword: "tenancy agreement Lagos",
    intro:
      "Use BOPA to prepare a structured tenancy agreement for Lagos properties before downloading, sharing, or saving it to your landlord dashboard.",
    useCases: [
      "Agreement for flats and apartments in Lekki, Ikeja, Yaba, Ajah, Surulere, and mainland Lagos",
      "Residential tenancy agreement for annual rent arrangements",
      "Shop, office, and mixed-use tenancy agreement preview for Lagos landlords",
    ],
  },
  {
    slug: "abuja",
    label: "Abuja",
    state: "FCT",
    title: "Free Tenancy Agreement Generator Abuja",
    description:
      "Create a structured tenancy agreement preview for Abuja landlords and tenants without signing up first.",
    seoKeyword: "tenancy agreement Abuja",
    intro:
      "Prepare an Abuja tenancy agreement with landlord details, tenant details, premises, rent, tenancy period, and key clauses.",
    useCases: [
      "Agreement for Wuse, Gwarinpa, Maitama, Kubwa, Jabi, and Lugbe rentals",
      "Annual rent agreement for Abuja residential tenants",
      "Landlord agreement preview before saving and managing records in BOPA",
    ],
  },
  {
    slug: "port-harcourt",
    label: "Port Harcourt",
    state: "Rivers",
    title: "Free Tenancy Agreement Generator Port Harcourt",
    description:
      "Generate a tenancy agreement preview for Port Harcourt properties, tenants, shops, flats, and offices.",
    seoKeyword: "tenancy agreement Port Harcourt",
    intro:
      "Use BOPA to create a clean tenancy agreement preview for Port Harcourt rent arrangements and property records.",
    useCases: [
      "Agreement for GRA, Woji, Rumuola, Trans-Amadi, and Ada George rentals",
      "Residential tenancy agreement for annual rent payments",
      "Commercial and mixed-use tenancy preview for landlords and agents",
    ],
  },
  {
    slug: "ibadan",
    label: "Ibadan",
    state: "Oyo",
    title: "Free Tenancy Agreement Generator Ibadan",
    description:
      "Prepare tenancy agreement previews for Ibadan landlords managing rooms, flats, shops, and annual rent tenancies.",
    seoKeyword: "tenancy agreement Ibadan",
    intro:
      "Generate an Ibadan tenancy agreement preview with rent, tenant, landlord, premises, and special terms captured clearly.",
    useCases: [
      "Agreement for Bodija, Akobo, Challenge, Ring Road, and Dugbe rentals",
      "Tenant agreement preview for flats, rooms, shops, and offices",
      "Annual rent agreement for Nigerian landlords in Ibadan",
    ],
  },
  {
    slug: "enugu",
    label: "Enugu",
    state: "Enugu",
    title: "Free Tenancy Agreement Generator Enugu",
    description:
      "Create tenancy agreement previews for Enugu landlords and tenants with Nigerian rent clauses and agreement structure.",
    seoKeyword: "tenancy agreement Enugu",
    intro:
      "Use BOPA to prepare a clear tenancy agreement preview for Enugu properties before downloading or saving it.",
    useCases: [
      "Agreement for New Haven, Independence Layout, Trans-Ekulu, and GRA rentals",
      "Annual rent agreement for residential property",
      "Tenant agreement preview for homes, offices, and shops",
    ],
  },
  {
    slug: "owerri",
    label: "Owerri",
    state: "Imo",
    title: "Free Tenancy Agreement Generator Owerri",
    description:
      "Generate tenancy agreement previews for Owerri landlords, tenants, flats, rooms, shops, and offices.",
    seoKeyword: "tenancy agreement Owerri",
    intro:
      "Prepare an Owerri tenancy agreement preview with landlord, tenant, property, rent, tenancy period, and special terms.",
    useCases: [
      "Agreement for Owerri apartments, rooms, and shops",
      "Annual tenancy agreement for Nigerian rent arrangements",
      "Agreement preview before creating a BOPA landlord account",
    ],
  },
] as const satisfies readonly AgreementGeneratorLocation[];

export const agreementGeneratorTemplates = [
  {
    slug: "residential-tenancy-agreement",
    label: "Residential Tenancy Agreement",
    title: "Free Residential Tenancy Agreement Generator Nigeria",
    description:
      "Generate a residential tenancy agreement preview for Nigerian landlords renting flats, rooms, self-contained units, and apartments.",
    seoKeyword: "residential tenancy agreement Nigeria",
    intro:
      "Use BOPA to prepare a residential tenancy agreement preview with parties, premises, rent, tenancy term, obligations, property rules, and signature sections.",
    useCases: [
      "Agreement for flats, rooms, self-contained units, and apartments",
      "Annual rent tenancy agreement preview",
      "Landlord and tenant agreement before account saving or PDF sharing",
    ],
  },
  {
    slug: "shop-rent-agreement",
    label: "Shop Rent Agreement",
    title: "Free Shop Rent Agreement Generator Nigeria",
    description:
      "Create a shop rent agreement preview for Nigerian landlords and small business tenants.",
    seoKeyword: "shop rent agreement Nigeria",
    intro:
      "Prepare a shop rent agreement preview for traders, small business tenants, and commercial property owners.",
    useCases: [
      "Agreement for shops, stalls, kiosks, and market spaces",
      "Commercial rent clause preview",
      "Property rules and special terms for shop tenants",
    ],
  },
  {
    slug: "office-lease-agreement",
    label: "Office Lease Agreement",
    title: "Free Office Lease Agreement Generator Nigeria",
    description:
      "Generate an office lease agreement preview for Nigerian landlords renting office spaces and commercial units.",
    seoKeyword: "office lease agreement Nigeria",
    intro:
      "Use BOPA to create an office lease agreement preview with rent, premises, permitted use, utility responsibility, and special terms.",
    useCases: [
      "Agreement for offices and professional service spaces",
      "Commercial tenancy agreement preview",
      "Rent agreement for business premises",
    ],
  },
  {
    slug: "flat-tenancy-agreement",
    label: "Flat Tenancy Agreement",
    title: "Free Flat Tenancy Agreement Generator Nigeria",
    description:
      "Generate a flat tenancy agreement preview for Nigerian landlords renting apartments and multi-unit properties.",
    seoKeyword: "flat tenancy agreement Nigeria",
    intro:
      "Prepare a flat tenancy agreement preview that captures unit details, rent period, tenant obligations, and landlord obligations.",
    useCases: [
      "Agreement for flats and apartments",
      "Multi-unit property tenancy preview",
      "Annual rent agreement for Nigerian apartment tenants",
    ],
  },
  {
    slug: "annual-rent-agreement",
    label: "Annual Rent Agreement",
    title: "Free Annual Rent Agreement Generator Nigeria",
    description:
      "Create an annual rent agreement preview for Nigerian landlords using yearly rent cycles.",
    seoKeyword: "annual rent agreement Nigeria",
    intro:
      "Use BOPA to prepare an annual rent agreement preview with automatic tenancy end-date calculation and Nigerian landlord-focused clauses.",
    useCases: [
      "One-year tenancy agreement preview",
      "Annual rent clause and tenancy period",
      "Agreement preview before downloading PDF or creating a landlord account",
    ],
  },
] as const satisfies readonly AgreementGeneratorTemplate[];

export function getAgreementGeneratorLocation(slug: string) {
  return agreementGeneratorLocations.find((location) => location.slug === slug);
}

export function getFeaturedAgreementGeneratorLocations() {
  return agreementGeneratorLocations.slice(0, 6);
}

export function getAgreementGeneratorTemplate(slug: string) {
  return agreementGeneratorTemplates.find((template) => template.slug === slug);
}

export function getFeaturedAgreementGeneratorTemplates() {
  return agreementGeneratorTemplates.slice(0, 5);
}
