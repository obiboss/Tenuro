import type { MetadataRoute } from "next";
import {
  agreementGeneratorLocations,
  agreementGeneratorTemplates,
} from "@/lib/agreement-generator-seo";
import { getAllBlogPosts, getBlogCanonicalUrl } from "@/lib/blog";
import { receiptGeneratorLocations } from "@/lib/receipt-generator-locations";

const appUrl = "https://boldverseproperty.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/receipt-generator`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${appUrl}/agreement-generator`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: getBlogCanonicalUrl(),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: getBlogCanonicalUrl(post.slug),
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const receiptLocationPages: MetadataRoute.Sitemap =
    receiptGeneratorLocations.map((location) => ({
      url: `${appUrl}/receipt-generator/${location.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

  const agreementLocationPages: MetadataRoute.Sitemap =
    agreementGeneratorLocations.map((location) => ({
      url: `${appUrl}/agreement-generator/${location.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

  const agreementTemplatePages: MetadataRoute.Sitemap =
    agreementGeneratorTemplates.map((template) => ({
      url: `${appUrl}/agreement-generator/templates/${template.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [
    ...staticPages,
    ...blogPages,
    ...receiptLocationPages,
    ...agreementLocationPages,
    ...agreementTemplatePages,
  ];
}
