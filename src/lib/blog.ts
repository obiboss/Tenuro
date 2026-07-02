import {
  blogPosts,
  type BlogPost,
  type BlogPostSlug,
} from "@/content/blog-posts";

export const BLOG_BASE_URL = "https://boldverseproperty.com";

export function getAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getBlogPostSlugs(): BlogPostSlug[] {
  return blogPosts.map((post) => post.slug);
}

export function getRelatedBlogPosts(
  slug: BlogPostSlug,
  limit = 3,
): BlogPost[] {
  const current = getBlogPostBySlug(slug);

  if (!current) {
    return [];
  }

  const related = current.relatedSlugs
    .map((relatedSlug) => getBlogPostBySlug(relatedSlug))
    .filter((post): post is BlogPost => Boolean(post));

  if (related.length >= limit) {
    return related.slice(0, limit);
  }

  const fallback = getAllBlogPosts().filter(
    (post) =>
      post.slug !== slug &&
      !related.some((item) => item.slug === post.slug) &&
      post.category === current.category,
  );

  return [...related, ...fallback].slice(0, limit);
}

export function getBlogCanonicalUrl(slug?: string): string {
  if (!slug) {
    return `${BLOG_BASE_URL}/blog`;
  }

  return `${BLOG_BASE_URL}/blog/${slug}`;
}

export function buildBlogArticleJsonLd(post: BlogPost) {
  const url = getBlogCanonicalUrl(post.slug);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "BOPA",
      url: BLOG_BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "BOPA",
      url: BLOG_BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: post.keywords.join(", "),
    url,
  };
}
