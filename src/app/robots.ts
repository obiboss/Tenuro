import type { MetadataRoute } from "next";

const appUrl = "https://boldverseproperty.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/receipt-generator", "/agreement-generator"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/tenant/",
          "/agent/",
          "/admin/",
          "/private/",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
