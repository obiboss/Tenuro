import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BOPA | Property Management for Modern Landlords",
  description:
    "BOPA — Boldverse Property App — helps Nigerian landlords manage tenants, track rent payments, generate receipts, and maintain tenancy agreements. Built for Lagos and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} bg-background font-sans text-text-normal antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
