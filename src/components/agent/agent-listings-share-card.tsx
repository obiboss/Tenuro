import Link from "next/link";
import { ExternalLink, Send } from "lucide-react";

function buildWhatsAppShareUrl(params: {
  listingUrl: string;
  agentName: string | null;
}) {
  const agentIntro = params.agentName
    ? `Hello, here are the available apartments from ${params.agentName}.`
    : "Hello, here are the available apartments.";

  const message = [
    agentIntro,
    "",
    "Please open this link to view the available listings, pictures, videos, rent details, and apply for the apartment you are interested in:",
    params.listingUrl,
    "",
    "Note: Filling the KYC form and paying a processing/verification fee does not guarantee approval. Final approval depends on landlord review, property availability, and verification outcome.",
    "",
    "BOPA - Property records made simple.",
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function AgentListingsShareCard({
  listingUrl,
  agentName,
}: {
  listingUrl: string;
  agentName: string | null;
}) {
  const whatsappUrl = buildWhatsAppShareUrl({
    listingUrl,
    agentName,
  });

  return (
    <div className="mb-6 rounded-card border border-primary/10 bg-primary-soft p-5 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white">
              <Send aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>

            <div>
              <h2 className="font-black text-text-strong">
                Share listings with prospective tenants
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Send this link so tenants can view available listings, pictures,
                videos, and apply for the apartment they want.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-button bg-white px-4 py-3 text-sm font-semibold leading-6 text-text-muted">
            {listingUrl}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-button bg-success px-5 py-3 text-sm font-black text-white shadow-card transition hover:opacity-95"
          >
            <Send aria-hidden="true" size={18} strokeWidth={2.6} />
            Send on WhatsApp
          </a>

          <Link
            href={listingUrl}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 rounded-button bg-white px-5 py-3 text-sm font-black text-primary shadow-card transition hover:opacity-95"
          >
            <ExternalLink aria-hidden="true" size={18} strokeWidth={2.6} />
            Preview page
          </Link>
        </div>
      </div>
    </div>
  );
}
