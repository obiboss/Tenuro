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
      setMessage(error instanceof Error ? error.message : "Payment could not be started.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={startPayment} disabled={pending}>
        {pending
          ? "Opening payment..."
          : props.product === "receipt"
            ? "Get 24 more receipts for ₦2,500"
            : "Get 3 more agreements for ₦10,000"}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
