import type { Metadata } from "next";
import Link from "next/link";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogFooter } from "@/components/blog/blog-footer";
import { BlogHeader } from "@/components/blog/blog-header";
import { Badge } from "@/components/ui/badge";
import { getAllBlogPosts, getBlogCanonicalUrl } from "@/lib/blog";

export const metadata: Metadata = {
  title: "BOPA Blog — Rent Receipts, Tenancy & Landlord Guides Nigeria",

  description:
    "Practical guides for Nigerian landlords and tenants on rent receipts, tenancy agreements, payment proof, tenant rights, and property management.",

  keywords: [
    "rent receipt Nigeria",
    "tenancy agreement Nigeria",
    "tenant rights in Nigeria",
    "landlord rights in Nigeria",
    "property management app Nigeria",
    "landlord app Nigeria",
  ],

  alternates: {
    canonical: getBlogCanonicalUrl(),
  },

  openGraph: {
    title: "BOPA Blog — Rent Receipts, Tenancy & Landlord Guides Nigeria",
    description:
      "Practical guides for Nigerian landlords and tenants on rent receipts, tenancy agreements, and property management.",
    url: getBlogCanonicalUrl(),
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "BOPA Blog — Rent Receipts, Tenancy & Landlord Guides Nigeria",
    description:
      "Practical guides for Nigerian landlords and tenants on rent receipts, tenancy agreements, and property management.",
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
        <BlogHeader
          actionHref="/register?role=landlord"
          actionLabel="Create Landlord Account"
        />

        <div className="py-12 lg:py-16">
          <Badge tone="primary" size="md">
            BOPA Blog
          </Badge>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-text-strong md:text-4xl">
              Guides for Nigerian landlords and tenants
            </h1>

            <p className="mt-4 text-base leading-8 text-text-muted md:text-lg">
              Practical articles on rent receipts, tenancy agreements, payment
              proof, tenant and landlord rights, and keeping proper rental
              records in Nigeria.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/receipt-generator" className="text-primary hover:text-primary-hover">
              Free Rent Receipt Generator
            </Link>
            <Link
              href="/agreement-generator"
              className="text-primary hover:text-primary-hover"
            >
              Free Tenancy Agreement Generator
            </Link>
          </div>
        </div>

        <BlogFooter />
      </section>
    </main>
  );
}
