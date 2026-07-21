import type { MetadataRoute } from "next";

const APP_NAME = "BOPA - Boldverse Property App";
const APP_DESCRIPTION =
  "Professional property, tenancy, rent, estate, plot, buyer, and sales management for Nigerian real estate businesses.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: "BOPA",
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F8F7F4",
    theme_color: "#1B4FD8",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icons/bopa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/bopa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
