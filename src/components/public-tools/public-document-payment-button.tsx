"use client";

import { useState } from "react";

type PublicDocumentPaymentButtonProps = {
  product: "receipt" | "tenancy_agreement";
  formId: string;
};

type PaystackWindow = Window & {
  PaystackPop?: {
    setup(config: {
      key: string;
      accessCode: string;
      onSuccess: (transaction: { reference: string }) => void;
    }): { openIframe(): void };
  };
};

export function PublicDocumentPaymentButton(
  props: PublicDocumentPaymentButtonProps,
) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isReceipt = props.product === "receipt";

  async function startPayment() {
    setPending(true);
    setMessage("");

    try {
      const form = document.getElementById(props.formId);
      if (!(form instanceof HTMLFormElement)) {
        throw new Error("Payment form is unavailable.");
      }

      const formData = new FormData(form);
      const response = await fetch("/api/public-tools/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: props.product,
          email: formData.get("landlordEmail"),
          landlordFullName: formData.get("landlordFullName"),
          landlordPhoneNumber: formData.get("landlordPhoneNumber"),
          propertyAddress: formData.get("propertyAddress"),
        }),
      });
      const initialized = (await response.json()) as {
        authorization_url?: string;
        access_code?: string;
        message?: string;
      };

      if (!response.ok || !initialized.access_code) {
        throw new Error(initialized.message ?? "Payment could not be started.");
      }

      const paystack = window as PaystackWindow;
      const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (!publicKey || !paystack.PaystackPop) {
        window.location.assign(initialized.authorization_url ?? "#");
        return;
      }

      paystack.PaystackPop.setup({
        key: publicKey,
        accessCode: initialized.access_code,
        onSuccess: async ({ reference }) => {
          const verifyResponse = await fetch(
            `/api/public-tools/payment/verify?product=${encodeURIComponent(props.product)}&reference=${encodeURIComponent(reference)}`,
          );
          if (!verifyResponse.ok) {
            setMessage(
              "Your payment may already have gone through. Please check back shortly before trying again.",
            );
            return;
          }
          setMessage("Payment verified. Your document credits are ready.");
        },
      }).openIframe();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be started.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setIsOpen(true);
        }}
        className="min-h-11 w-full rounded-button bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
      >
        {isReceipt ? "Get 24 more receipts" : "Get 3 more agreements"}
      </button>

      {message ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-warning">
          {message}
        </p>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-document-payment-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary">BOPA public tool</p>
                <h2
                  id="public-document-payment-title"
                  className="mt-1 text-2xl font-black tracking-tight text-text-strong"
                >
                  {isReceipt ? "Get 24 more receipts" : "Get 3 more tenancy agreements"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close payment details"
                onClick={() => setIsOpen(false)}
                disabled={pending}
                className="text-2xl font-bold leading-none text-text-muted hover:text-text-strong"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-button bg-primary-soft p-4">
              <p className="text-sm font-bold text-primary">Package includes</p>
              <p className="mt-2 text-base font-black text-text-strong">
                {isReceipt
                  ? "24 additional successful receipt generations"
                  : "3 additional successful tenancy agreement generations"}
              </p>
              <p className="mt-3 text-2xl font-black text-text-strong">
                {isReceipt ? "₦2,500" : "₦10,000"}
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-text-muted">
              Payment is processed securely by Paystack. Your credits are added
              after the payment is verified.
            </p>

            <button
              type="button"
              onClick={startPayment}
              disabled={pending}
              className="mt-6 min-h-12 w-full rounded-button bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Opening Paystack..." : "Buy now"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
