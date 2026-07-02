export type BlogInlinePart =
  | string
  | {
      text: string;
      href: string;
    };

export type BlogContentBlock =
  | { type: "paragraph"; parts: BlogInlinePart[] }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "checklist"; items: string[] }
  | { type: "disclaimer" };

export type BlogCta = {
  title: string;
  label: string;
  href: string;
  description?: string;
};

export type BlogPostSlug =
  | "how-to-write-rent-receipt-in-nigeria"
  | "free-rent-receipt-generator-nigeria"
  | "rent-receipt-requirements-in-nigeria"
  | "tenancy-agreement-in-nigeria"
  | "tenancy-agreement-checklist"
  | "proof-of-rent-payment-in-nigeria"
  | "how-to-prove-tenant-paid-rent"
  | "tenant-rights-in-nigeria"
  | "landlord-rights-in-nigeria"
  | "landlord-evict-tenant-without-notice-nigeria"
  | "how-to-avoid-rent-disputes-with-tenants"
  | "best-app-for-landlords-in-nigeria";

export type BlogPost = {
  slug: BlogPostSlug;
  title: string;
  description: string;
  primaryKeyword: string;
  keywords: string[];
  date: string;
  readingTime: string;
  category: string;
  cta: BlogCta;
  relatedSlugs: BlogPostSlug[];
  sections: BlogContentBlock[];
};

const receiptCta: BlogCta = {
  title: "Generate a proper rent receipt in under a minute",
  label: "Generate Rent Receipt",
  href: "/receipt-generator",
  description:
    "Use BOPA's free rent receipt generator to create a clean receipt, download it, or send it to your tenant on WhatsApp.",
};

const agreementCta: BlogCta = {
  title: "Create a tenancy agreement draft for review and signing",
  label: "Create Tenancy Agreement",
  href: "/agreement-generator",
  description:
    "BOPA helps you generate a clean agreement draft based on your arrangement. Review it with your tenant before signing.",
};

const landlordCta: BlogCta = {
  title: "Keep every tenant and payment in one place",
  label: "Create Landlord Account",
  href: "/register?role=landlord",
  description:
    "Set up your first property in a few minutes and track agreements, receipts, and rent records digitally.",
};

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-write-rent-receipt-in-nigeria",
    title: "How to Write a Rent Receipt in Nigeria (+ Free Template)",
    description:
      "Learn how to write a rent receipt in Nigeria with the right fields, format, and sample details landlords and tenants can trust.",
    primaryKeyword: "how to write a rent receipt in Nigeria",
    keywords: [
      "how to write a rent receipt in Nigeria",
      "rent receipt Nigeria",
      "rent receipt format Nigeria",
      "rent receipt sample in Nigeria",
      "online rent receipt generator",
    ],
    date: "2026-01-08",
    readingTime: "4 min read",
    category: "Rent Receipts",
    cta: receiptCta,
    relatedSlugs: [
      "free-rent-receipt-generator-nigeria",
      "rent-receipt-requirements-in-nigeria",
      "proof-of-rent-payment-in-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "If you've ever paid rent in Nigeria and the landlord just scribbled \"Received 500k\" on a torn paper, you already know the problem. Learning how to write a rent receipt in Nigeria properly saves both landlord and tenant from confusion later.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "That paper can get lost, and if anything goes wrong later — a misunderstanding about how much was paid, or when — you have nothing solid to fall back on.",
        ],
      },
      {
        type: "heading",
        text: "What a proper rent receipt should include",
      },
      {
        type: "paragraph",
        parts: [
          "A proper rent receipt should have the right rent receipt format in Nigeria so anyone can understand it later:",
        ],
      },
      {
        type: "list",
        items: [
          "Full name of the landlord (or agent)",
          "Full name of the tenant",
          "The property address",
          "Amount paid, in figures and words",
          "The rent period it covers (e.g. \"January 2026 to December 2026\")",
          "Date the payment was received",
          "Signature of the person collecting the money",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "That's it. It doesn't need fancy language. What matters is that anyone who looks at it later — a new agent, a court, a family member helping settle a dispute — can understand exactly what was paid and for what period.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "The stress of writing this by hand every year, or trying to remember the format, is exactly why many landlords now skip it — until they need it. You can also use a ",
          {
            text: "free rent receipt generator in Nigeria",
            href: "/blog/free-rent-receipt-generator-nigeria",
          },
          " to ",
          {
            text: "generate rent receipt online",
            href: "/receipt-generator",
          },
          ", store it, and send it straight to your tenant on WhatsApp.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "For a full breakdown of every field, see our guide on ",
          {
            text: "rent receipt requirements in Nigeria",
            href: "/blog/rent-receipt-requirements-in-nigeria",
          },
          ".",
        ],
      },
    ],
  },
  {
    slug: "free-rent-receipt-generator-nigeria",
    title: "Free Rent Receipt Generator in Nigeria",
    description:
      "Use a free rent receipt generator in Nigeria for offline payments or get automatic receipts after confirmed in-app tenant payments.",
    primaryKeyword: "free rent receipt generator Nigeria",
    keywords: [
      "free rent receipt generator Nigeria",
      "online rent receipt generator",
      "generate rent receipt online",
      "rent receipt Nigeria",
      "rent receipt format Nigeria",
    ],
    date: "2026-01-15",
    readingTime: "4 min read",
    category: "Rent Receipts",
    cta: {
      ...receiptCta,
      label: "Generate Rent Receipt — free, takes less than a minute",
    },
    relatedSlugs: [
      "how-to-write-rent-receipt-in-nigeria",
      "rent-receipt-requirements-in-nigeria",
      "proof-of-rent-payment-in-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "Typing out a rent receipt from scratch every time a tenant pays is stress you don't need. A free rent receipt generator Nigeria landlords can rely on saves time and keeps records consistent.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Most landlords either forget a detail, use a different format each time, or simply don't bother — and that's how records get messy.",
        ],
      },
      {
        type: "heading",
        text: "Manual or offline payments",
      },
      {
        type: "paragraph",
        parts: [
          "With BOPA's free rent receipt generator, you can create a receipt manually when a tenant pays you offline through cash, bank transfer, or any method outside the app. You fill in a short form — tenant's name, amount, property, period covered, and payment date — and BOPA creates a clean, properly formatted receipt instantly. You can download it, print it, or send it directly to your tenant's WhatsApp so there's no back and forth.",
        ],
      },
      {
        type: "heading",
        text: "In-app tenant payments",
      },
      {
        type: "paragraph",
        parts: [
          "For landlords using BOPA to receive tenant payments through the app, the process is even easier. Once a tenant pays successfully through BOPA, the receipt is generated automatically after the payment is confirmed. That means you don't have to manually prepare a receipt every time money comes in.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "This isn't just about looking organized. A consistent set of receipts means that if a tenant ever disputes what they've paid, or a new caretaker takes over the property, everything is in one place and easy to verify. Pair receipts with our guide on ",
          {
            text: "proof of rent payment in Nigeria",
            href: "/blog/proof-of-rent-payment-in-nigeria",
          },
          " for stronger records.",
        ],
      },
    ],
  },
  {
    slug: "rent-receipt-requirements-in-nigeria",
    title: "What Should Be Inside a Rent Receipt in Nigeria?",
    description:
      "See the rent receipt requirements in Nigeria every landlord and tenant should know, with a practical checklist of required fields.",
    primaryKeyword: "rent receipt requirements in Nigeria",
    keywords: [
      "rent receipt requirements in Nigeria",
      "rent receipt format Nigeria",
      "rent receipt sample in Nigeria",
      "rent receipt Nigeria",
      "tenant payment proof",
    ],
    date: "2026-01-22",
    readingTime: "4 min read",
    category: "Rent Receipts",
    cta: {
      ...receiptCta,
      title: "Generate a receipt with all the right fields built in",
      label: "Use BOPA Receipt Generator",
    },
    relatedSlugs: [
      "how-to-write-rent-receipt-in-nigeria",
      "free-rent-receipt-generator-nigeria",
      "proof-of-rent-payment-in-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "A lot of rent receipts in Nigeria are missing information that actually matters. Understanding the rent receipt requirements in Nigeria helps both landlord and tenant avoid \"he said, she said\" arguments later.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "\"Collected rent — thank you\" written on an exercise book page isn't going to help anybody if there's ever a disagreement.",
        ],
      },
      {
        type: "heading",
        text: "Required fields for a rent receipt in Nigeria",
      },
      {
        type: "paragraph",
        parts: [
          "A rent receipt that actually protects both landlord and tenant should always include:",
        ],
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Landlord's full name — not just \"Oga\" or \"the landlord\"",
          "Tenant's full name",
          "Property address, including house number if there's more than one unit",
          "Amount received, written in figures and words so there's no confusion",
          "Rent period covered — start date and end date",
          "Date payment was made",
          "Signature or acknowledgment from whoever collected the money",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Some landlords also add the payment method (cash, transfer, POS) — useful if a bank statement needs to back it up later. This is especially important when comparing ",
          {
            text: "rent receipt vs bank alert",
            href: "/blog/proof-of-rent-payment-in-nigeria",
          },
          " as proof.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "None of this needs to be complicated. The goal is simple: if you or your tenant ever need to prove what was paid, when, and for what, the receipt should answer that on its own without anyone needing to \"remember.\"",
        ],
      },
    ],
  },
  {
    slug: "tenancy-agreement-in-nigeria",
    title: "Tenancy Agreement in Nigeria: Meaning, Format & Free Sample",
    description:
      "Understand tenancy agreement in Nigeria — meaning, format, sample clauses, and how to prepare a draft for review and signing.",
    primaryKeyword: "tenancy agreement in Nigeria",
    keywords: [
      "tenancy agreement in Nigeria",
      "tenancy agreement format in Nigeria",
      "tenancy agreement sample",
      "rental agreement Nigeria",
      "landlord tenant agreement",
    ],
    date: "2026-02-05",
    readingTime: "5 min read",
    category: "Tenancy Agreements",
    cta: agreementCta,
    relatedSlugs: [
      "tenancy-agreement-checklist",
      "how-to-avoid-rent-disputes-with-tenants",
      "landlord-evict-tenant-without-notice-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "A tenancy agreement in Nigeria is simply a written record of what landlord and tenant agreed to before the tenant moved in — how much rent, for how long, who fixes what, and what happens if either side wants out early.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Many Nigerian landlords still rent out property on a handshake and a verbal promise. It works fine — until it doesn't. The moment there's a disagreement about a repair, a rent increase, or when the tenancy should end, whoever has nothing in writing is the one who struggles to prove their side.",
        ],
      },
      {
        type: "heading",
        text: "Tenancy agreement format in Nigeria",
      },
      {
        type: "paragraph",
        parts: [
          "A basic tenancy agreement usually includes:",
        ],
      },
      {
        type: "list",
        items: [
          "Names and addresses of landlord and tenant",
          "Description of the property",
          "Rent amount and how often it's paid",
          "Duration of the tenancy",
          "Notice period required before either party ends it",
          "Who is responsible for repairs",
          "Any special conditions (subletting, use of the property, etc.)",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "For a simple residential tenancy, BOPA can help you generate a clean agreement draft based on your specific arrangement, ready for both parties to review and sign. If the matter is complex, high-value, disputed, or unusual, it is still wise to speak with a lawyer before signing.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Before signing, run through our ",
          {
            text: "tenancy agreement checklist",
            href: "/blog/tenancy-agreement-checklist",
          },
          " to make sure nothing important is missing.",
        ],
      },
    ],
  },
  {
    slug: "tenancy-agreement-checklist",
    title: "What Should Be Included in a Tenancy Agreement? (Checklist)",
    description:
      "Use this tenancy agreement checklist before signing any rental agreement in Nigeria — for landlords and tenants.",
    primaryKeyword: "tenancy agreement checklist",
    keywords: [
      "tenancy agreement checklist",
      "tenancy agreement format in Nigeria",
      "tenancy agreement sample",
      "rental agreement Nigeria",
      "landlord tenant agreement",
    ],
    date: "2026-02-12",
    readingTime: "4 min read",
    category: "Tenancy Agreements",
    cta: {
      ...agreementCta,
      title: "Every field on this checklist, covered",
      description:
        "Create your tenancy agreement with BOPA — generate a draft, review it, and sign when both parties are ready.",
    },
    relatedSlugs: [
      "tenancy-agreement-in-nigeria",
      "how-to-avoid-rent-disputes-with-tenants",
      "landlord-evict-tenant-without-notice-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "Before you sign anything — as landlord or tenant — run through this tenancy agreement checklist. If any of these are missing from your agreement, that's a gap that could cause problems later.",
        ],
      },
      {
        type: "checklist",
        items: [
          "Full names and contact details of both parties",
          "Exact address and description of the property",
          "Rent amount and payment schedule (monthly, quarterly, yearly)",
          "Length of the tenancy",
          "Notice period before ending the tenancy",
          "Who handles repairs — landlord or tenant, and for what kind of issue",
          "Conditions for renewal",
          "Rules around subletting or having additional occupants",
          "What happens to the deposit (if any) at the end of the tenancy",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "A lot of disputes in Nigeria aren't really about rent — they're about assumptions nobody wrote down. \"I thought the landlord was supposed to fix the roof.\" \"I thought I could renew automatically.\" Writing it down settles the assumption before it becomes an argument.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "For context on what a full agreement should cover, see our guide to ",
          {
            text: "tenancy agreement in Nigeria",
            href: "/blog/tenancy-agreement-in-nigeria",
          },
          ".",
        ],
      },
    ],
  },
  {
    slug: "proof-of-rent-payment-in-nigeria",
    title: "Is Bank Transfer Enough Proof of Rent Payment in Nigeria?",
    description:
      "Is bank transfer enough proof of rent payment in Nigeria? Learn why receipts matter alongside transfer alerts.",
    primaryKeyword: "proof of rent payment in Nigeria",
    keywords: [
      "proof of rent payment in Nigeria",
      "bank transfer proof of rent",
      "rent receipt vs bank alert",
      "tenant payment proof",
      "rent payment records",
    ],
    date: "2026-02-19",
    readingTime: "3 min read",
    category: "Payment Proof",
    cta: {
      ...receiptCta,
      title: "Generate a rent receipt to go with your next transfer",
      label: "Generate Rent Receipt",
      description: "Takes a minute — and gives you clear proof of what the payment was for.",
    },
    relatedSlugs: [
      "how-to-prove-tenant-paid-rent",
      "how-to-write-rent-receipt-in-nigeria",
      "how-to-avoid-rent-disputes-with-tenants",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "Many tenants ask whether proof of rent payment in Nigeria from a bank transfer alone is enough. The short answer: a bank transfer alert shows money left your account — it doesn't always show what the money was for.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "If a landlord later says the payment was for something else, or a different period than you thought, an alert alone can leave room for disagreement.",
        ],
      },
      {
        type: "heading",
        text: "Rent receipt vs bank alert",
      },
      {
        type: "paragraph",
        parts: [
          "A transfer alert is good evidence, but it works best alongside a proper receipt that states clearly: this amount, for this property, for this rent period. Without that, you're relying on the bank narration field, which is often just \"Transfer\" or a name — not enough detail if a dispute ever comes up months later.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "The safest approach: always transfer, then request (or generate) a receipt that references the transfer. That way, you have both — proof the money moved, and proof of exactly what it was for. Landlords should also read ",
          {
            text: "how to prove a tenant paid rent",
            href: "/blog/how-to-prove-tenant-paid-rent",
          },
          " for a fuller record-keeping approach.",
        ],
      },
    ],
  },
  {
    slug: "how-to-prove-tenant-paid-rent",
    title: "How to Prove a Tenant Paid Rent (A Landlord's Guide)",
    description:
      "Learn how to prove tenant paid rent with receipts, bank records, and consistent rent payment records every landlord should keep.",
    primaryKeyword: "how to prove tenant paid rent",
    keywords: [
      "how to prove tenant paid rent",
      "tenant payment proof",
      "rent payment records",
      "landlord rent records",
      "tenant payment history",
    ],
    date: "2026-03-05",
    readingTime: "4 min read",
    category: "Payment Proof",
    cta: landlordCta,
    relatedSlugs: [
      "proof-of-rent-payment-in-nigeria",
      "how-to-avoid-rent-disputes-with-tenants",
      "rent-receipt-requirements-in-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "As a landlord, knowing how to prove tenant paid rent saves you from arguments that go nowhere. If a tenant claims they paid rent and you have no record, or you claim they didn't pay and they say they did — that argument goes nowhere fast without documentation.",
        ],
      },
      {
        type: "heading",
        text: "Strongest proof of rent payment",
      },
      {
        type: "paragraph",
        parts: [
          "The strongest proof of payment includes:",
        ],
      },
      {
        type: "list",
        items: [
          "A signed or generated receipt for every payment, no exceptions",
          "A consistent record — not receipts for some months and nothing for others",
          "Bank statements or transfer alerts as backup, matched to receipts",
          "Dates that line up with the agreed rent period in the tenancy agreement",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Many Nigerian landlords manage several properties and multiple tenants with nothing more than memory and a notebook that sometimes gets missing. The moment you have more than one property, this becomes unsustainable — and it's usually the reason rent disputes turn messy, because nobody can say for certain what was paid when.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Keeping digital landlord rent records for every tenant, every payment, means you're never caught without proof — and neither is your tenant. See also ",
          {
            text: "proof of rent payment in Nigeria",
            href: "/blog/proof-of-rent-payment-in-nigeria",
          },
          " for why bank alerts alone may not be enough.",
        ],
      },
    ],
  },
  {
    slug: "tenant-rights-in-nigeria",
    title: "Tenant Rights in Nigeria: What Every Renter Should Know",
    description:
      "Know your tenant rights in Nigeria — receipts, notice before eviction, privacy, repairs, and fair rent increases.",
    primaryKeyword: "tenant rights in Nigeria",
    keywords: [
      "tenant rights in Nigeria",
      "rights of tenants in Nigeria",
      "quit notice Nigeria",
      "eviction notice Nigeria",
      "landlord tenant dispute Nigeria",
    ],
    date: "2026-03-12",
    readingTime: "5 min read",
    category: "Tenant Rights",
    cta: {
      ...receiptCta,
      title: "Make sure every payment you make is documented",
      label: "Generate Rent Receipt",
    },
    relatedSlugs: [
      "landlord-rights-in-nigeria",
      "landlord-evict-tenant-without-notice-nigeria",
      "tenancy-agreement-in-nigeria",
    ],
    sections: [
      {
        type: "disclaimer",
      },
      {
        type: "paragraph",
        parts: [
          "Renting a house in Nigeria, many tenants don't realize they actually have tenant rights in Nigeria — they just accept whatever the landlord says. Here's what generally applies in most states:",
        ],
      },
      {
        type: "list",
        items: [
          "You're entitled to a receipt for every rent payment. If a landlord refuses to give you one, that's a red flag.",
          "You can't be evicted without proper notice. The required notice period depends on your tenancy type (monthly, yearly) and your state, but landlords generally cannot just lock you out overnight.",
          "Your privacy matters. A landlord entering your apartment without your permission, outside of agreed circumstances, is generally not acceptable.",
          "Repairs: structural issues (roof, plumbing, electrical wiring) are usually the landlord's responsibility, while day-to-day maintenance often falls on the tenant — but this should be written into your agreement, not assumed.",
          "Rent increases should follow proper notice, not just a sudden demand for more money at renewal time.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "If any of this sounds unfamiliar to how your current tenancy works, it's worth having a proper written agreement so both sides know exactly where they stand. Read about ",
          {
            text: "landlord rights in Nigeria",
            href: "/blog/landlord-rights-in-nigeria",
          },
          " too — knowing both sides helps prevent disputes.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "For notice and recovery questions, see ",
          {
            text: "can a landlord evict a tenant without notice in Nigeria",
            href: "/blog/landlord-evict-tenant-without-notice-nigeria",
          },
          ".",
        ],
      },
    ],
  },
  {
    slug: "landlord-rights-in-nigeria",
    title: "Landlord Rights in Nigeria: What Every Landlord Should Know",
    description:
      "Understand landlord rights in Nigeria — timely rent, lawful recovery, inspections, and why good records matter.",
    primaryKeyword: "landlord rights in Nigeria",
    keywords: [
      "landlord rights in Nigeria",
      "rights of landlords in Nigeria",
      "quit notice Nigeria",
      "eviction notice Nigeria",
      "landlord rent records",
    ],
    date: "2026-03-19",
    readingTime: "5 min read",
    category: "Landlord Rights",
    cta: {
      ...landlordCta,
      title: "Keep your tenancy agreements and rent records properly documented",
    },
    relatedSlugs: [
      "tenant-rights-in-nigeria",
      "how-to-prove-tenant-paid-rent",
      "landlord-evict-tenant-without-notice-nigeria",
    ],
    sections: [
      {
        type: "disclaimer",
      },
      {
        type: "paragraph",
        parts: [
          "Landlords in Nigeria often feel like tenants have all the protection and they have none — that's not quite true, but a lot of landlords don't exercise their landlord rights in Nigeria properly because they don't have things documented.",
        ],
      },
      {
        type: "heading",
        text: "Rights of landlords in Nigeria",
      },
      {
        type: "paragraph",
        parts: [
          "Generally, as a landlord you're entitled to:",
        ],
      },
      {
        type: "list",
        items: [
          "Receive rent on time, as agreed in the tenancy agreement",
          "Recover your property if a tenant defaults, following the correct legal notice process (this varies by state and tenancy type — skipping it is what gets landlords in trouble, not the eviction itself)",
          "Set reasonable conditions for tenancy renewal, communicated in advance",
          "Expect the property to be maintained reasonably by the tenant, as agreed",
          "Enter the property with reasonable notice for inspection or emergency repairs — not without any notice, but not never either",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "The landlords who run into the most trouble are usually the ones without a written agreement or documented rent history. When there's a dispute, \"he said, she said\" almost always favors whoever kept better records.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Tenants have protections too — see ",
          {
            text: "tenant rights in Nigeria",
            href: "/blog/tenant-rights-in-nigeria",
          },
          ". For recovery and notice, read ",
          {
            text: "can a landlord evict a tenant without notice in Nigeria",
            href: "/blog/landlord-evict-tenant-without-notice-nigeria",
          },
          ".",
        ],
      },
    ],
  },
  {
    slug: "landlord-evict-tenant-without-notice-nigeria",
    title: "Can a Landlord Evict a Tenant Without Notice in Nigeria?",
    description:
      "Can a landlord evict a tenant without notice in Nigeria? Learn why proper quit notice and recovery steps usually apply.",
    primaryKeyword: "can a landlord evict a tenant without notice in Nigeria",
    keywords: [
      "can a landlord evict a tenant without notice in Nigeria",
      "quit notice Nigeria",
      "eviction notice Nigeria",
      "landlord tenant dispute Nigeria",
      "tenancy agreement in Nigeria",
    ],
    date: "2026-04-02",
    readingTime: "5 min read",
    category: "Landlord Rights",
    cta: {
      ...agreementCta,
      title: "Create a proper tenancy agreement upfront so notice terms are clear from day one",
    },
    relatedSlugs: [
      "tenant-rights-in-nigeria",
      "landlord-rights-in-nigeria",
      "tenancy-agreement-in-nigeria",
    ],
    sections: [
      {
        type: "disclaimer",
      },
      {
        type: "paragraph",
        parts: [
          "A common question is: can a landlord evict a tenant without notice in Nigeria? Generally, no — a landlord should not just wake up one day and lock a tenant out.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Nigerian tenancy practice varies by state, but landlords are usually expected to follow a proper written notice and recovery process before removing a tenant.",
        ],
      },
      {
        type: "heading",
        text: "Notice periods and tenancy type",
      },
      {
        type: "paragraph",
        parts: [
          "The required notice period depends on the type of tenancy, the tenancy agreement, and the law that applies in that state. For example:",
        ],
      },
      {
        type: "list",
        items: [
          "Monthly tenancy — often requires about one month's notice",
          "Yearly tenancy — often requires about six months' notice",
          "Fixed-term tenancy — may depend on the agreement and whether the tenancy has expired",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "If the tenant still refuses to leave after the proper notice expires, the landlord should not use force, remove belongings, change locks, or cut off utilities to push the tenant out. The safer path is to follow the formal recovery process and go to court where required.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Skipping the process can put the landlord in trouble, even where the tenant is owing rent.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "If a tenant genuinely isn't paying, the better path is: keep proper records, issue the right written notice, follow the recovery process, and get legal guidance where necessary — not self-help methods that can backfire. Clear notice terms in a ",
          {
            text: "tenancy agreement in Nigeria",
            href: "/blog/tenancy-agreement-in-nigeria",
          },
          " help from day one.",
        ],
      },
    ],
  },
  {
    slug: "how-to-avoid-rent-disputes-with-tenants",
    title: "How to Avoid Rent Disputes With Tenants",
    description:
      "Practical tips on how to avoid rent disputes with tenants — written agreements, receipts, clear periods, and digital records.",
    primaryKeyword: "how to avoid rent disputes with tenants",
    keywords: [
      "how to avoid rent disputes with tenants",
      "landlord tenant dispute Nigeria",
      "rent payment records",
      "landlord rent records",
      "tenancy agreement checklist",
    ],
    date: "2026-04-16",
    readingTime: "4 min read",
    category: "Property Management",
    cta: {
      ...landlordCta,
      title: "Use BOPA to keep every agreement and every payment properly recorded",
    },
    relatedSlugs: [
      "tenancy-agreement-in-nigeria",
      "how-to-write-rent-receipt-in-nigeria",
      "how-to-prove-tenant-paid-rent",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "Most rent disputes in Nigeria don't come from bad people — they come from unclear arrangements. Here's how to avoid rent disputes with tenants before problems start:",
        ],
      },
      {
        type: "list",
        items: [
          "Always put it in writing. A verbal agreement means two people can remember two different things.",
          "Give a receipt for every single payment, without exception, even for tenants you trust.",
          "Be specific about the rent period the payment covers — \"paid for the year\" is vague; \"January 2026 – December 2026\" is not.",
          "Agree on repair responsibilities upfront, in the tenancy agreement, not in the middle of an argument.",
          "Communicate rent increases and renewal terms early, not as a surprise at the door.",
          "Keep records digitally, not scattered across notebooks, WhatsApp chats, and memory. If you manage more than one tenant, this becomes essential.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "The pattern across almost every serious landlord-tenant dispute is the same: something wasn't written down, or something wasn't documented at the time it happened. Fixing that one habit prevents most of the arguments before they start.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "Start with a ",
          {
            text: "tenancy agreement in Nigeria",
            href: "/blog/tenancy-agreement-in-nigeria",
          },
          ", issue receipts using our guide on ",
          {
            text: "how to write a rent receipt in Nigeria",
            href: "/blog/how-to-write-rent-receipt-in-nigeria",
          },
          ", and keep proof with ",
          {
            text: "how to prove tenant paid rent",
            href: "/blog/how-to-prove-tenant-paid-rent",
          },
          ".",
        ],
      },
    ],
  },
  {
    slug: "best-app-for-landlords-in-nigeria",
    title: "Best App for Landlords in Nigeria",
    description:
      "Looking for the best app for landlords in Nigeria? See how BOPA handles receipts, agreements, rent tracking, and records.",
    primaryKeyword: "best app for landlords in Nigeria",
    keywords: [
      "best app for landlords in Nigeria",
      "landlord app Nigeria",
      "property management app Nigeria",
      "rent tracking app Nigeria",
      "landlord rent records",
    ],
    date: "2026-05-01",
    readingTime: "4 min read",
    category: "Property Management",
    cta: {
      ...landlordCta,
      title: "Set up your first property in a few minutes",
    },
    relatedSlugs: [
      "how-to-avoid-rent-disputes-with-tenants",
      "free-rent-receipt-generator-nigeria",
      "tenancy-agreement-in-nigeria",
    ],
    sections: [
      {
        type: "paragraph",
        parts: [
          "If you're managing rental property in Nigeria — whether it's one apartment or a full compound of tenants — you already know the usual tools: a notebook, a spreadsheet if you're organized, and a lot of WhatsApp messages trying to remember who paid what and when. Many landlords search for the best app for landlords in Nigeria to replace that chaos.",
        ],
      },
      {
        type: "heading",
        text: "Why landlords use BOPA",
      },
      {
        type: "paragraph",
        parts: [
          "BOPA was built specifically for this. As a property management app Nigeria landlords can use daily, it lets you:",
        ],
      },
      {
        type: "list",
        items: [
          "Generate proper rent receipts in seconds and send them straight to a tenant's WhatsApp",
          "Create tenancy agreements without needing a lawyer for every standard case — BOPA helps generate a clean draft for review and signing",
          "Track which tenants have paid, who's due, and when — a practical rent tracking app Nigeria landlords actually need",
          "Keep a full digital record of every property, every tenant, and every payment — accessible anytime, not buried in an old notebook",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "It's built around how Nigerian landlords actually manage property day to day — including sending documents over WhatsApp, which is how most communication with tenants and caretakers already happens.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          "New to proper record keeping? Read ",
          {
            text: "how to avoid rent disputes with tenants",
            href: "/blog/how-to-avoid-rent-disputes-with-tenants",
          },
          ", try the ",
          {
            text: "free rent receipt generator in Nigeria",
            href: "/blog/free-rent-receipt-generator-nigeria",
          },
          ", or start with a ",
          {
            text: "tenancy agreement in Nigeria",
            href: "/blog/tenancy-agreement-in-nigeria",
          },
          " draft.",
        ],
      },
    ],
  },
];
