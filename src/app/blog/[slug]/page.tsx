import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { BlogCtaCard } from "@/components/blog/blog-cta-card";
import { BlogFooter } from "@/components/blog/blog-footer";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogPostContent } from "@/components/blog/blog-post-content";
import { RelatedPosts } from "@/components/blog/related-posts";
import { Badge } from "@/components/ui/badge";
import {
  buildBlogArticleJsonLd,
  getBlogCanonicalUrl,
  getBlogPostBySlug,
  getBlogPostSlugs,
  getRelatedBlogPosts,
} from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog | BOPA",
    };
  }

  const canonical = getBlogCanonicalUrl(post.slug);

  return {
    title: post.title,

    description: post.description,

    keywords: post.keywords,

    alternates: {
      canonical,
    },

    openGraph: {
      title: `${post.title} | BOPA`,
      description: post.description,
      url: canonical,
      type: "article",
      publishedTime: post.date,
    },

    twitter: {
      card: "summary_large_image",
      title: `${post.title} | BOPA`,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedBlogPosts(post.slug);
  const articleJsonLd = buildBlogArticleJsonLd(post);
  const formattedDate = new Date(post.date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
        <BlogHeader
          actionHref={post.cta.href}
          actionLabel={post.cta.label}
        />

        <div className="py-10 lg:py-14">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.6} />
            Back to blog
          </Link>

          <article className="mx-auto mt-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="primary">{post.category}</Badge>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted">
                <Clock3 aria-hidden="true" size={15} strokeWidth={2.4} />
                {post.readingTime}
              </span>
              <span className="text-sm font-semibold text-text-muted">
                {formattedDate}
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-text-strong md:text-4xl md:leading-tight">
              {post.title}
            </h1>

            <p className="mt-4 text-lg leading-8 text-text-muted">
              {post.description}
            </p>

            <div className="mt-10">
              <BlogPostContent sections={post.sections} />
            </div>

            <BlogCtaCard cta={post.cta} />

            <RelatedPosts posts={relatedPosts} />
          </article>
        </div>

        <BlogFooter />
      </section>
    </main>
  );
}
