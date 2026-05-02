import { Download, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustNotice } from "@/components/ui/trust-notice";

type TenantReceiptDownloadCardProps = {
  receiptDownloadUrl: string | null;
};

export function TenantReceiptDownloadCard({
  receiptDownloadUrl,
}: TenantReceiptDownloadCardProps) {
  if (!receiptDownloadUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
        </CardHeader>

        <CardContent>
          <TrustNotice
            title="Receipt is being prepared"
            description="Your payment has been confirmed. The receipt may take a moment to become available. This page will update automatically."
            icon={
              <ReceiptText aria-hidden="true" size={22} strokeWidth={2.6} />
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt</CardTitle>
      </CardHeader>

      <CardContent>
        <TrustNotice
          title="Receipt ready"
          description="Download your rent receipt for your records."
          icon={<ReceiptText aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        <a
          href={receiptDownloadUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
        >
          <Download aria-hidden="true" size={18} strokeWidth={2.6} />
          Download Receipt
        </a>
      </CardContent>
    </Card>
  );
}
