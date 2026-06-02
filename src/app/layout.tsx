import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://boldverseproperty.com"),

  title: {
    default: "BOPA | Property Management for Modern Landlords",
    template: "%s | BOPA",
  },

  description:
    "BOPA — Boldverse Property App — helps Nigerian landlords manage tenants, track rent payments, generate receipts, maintain tenancy agreements, and organize rental operations across Nigeria.",

  keywords: [
    "property management Nigeria",
    "rent receipt generator Nigeria",
    "tenancy agreement generator Nigeria",
    "landlord software Nigeria",
    "rent tracking Lagos",
    "property app Nigeria",
    "tenant management Nigeria",
    "receipt generator Lagos",
  ],

  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://boldverseproperty.com",
    siteName: "BOPA",
    title: "BOPA | Property Management for Modern Landlords",
    description:
      "Property management platform for Nigerian landlords including receipts, agreements, rent tracking, and tenant workflows.",
  },

  twitter: {
    card: "summary_large_image",
    title: "BOPA | Property Management for Modern Landlords",
    description:
      "Generate rent receipts, tenancy agreements, and manage Nigerian rental properties with BOPA.",
  },

  alternates: {
    canonical: "https://boldverseproperty.com",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} bg-background font-sans text-text-normal antialiased`}
      >
        {children}
      </body>

      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
