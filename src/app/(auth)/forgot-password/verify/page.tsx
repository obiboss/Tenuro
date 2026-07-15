import { redirect } from "next/navigation";
import { VerifyRecoveryOtpForm } from "@/components/auth/verify-recovery-otp-form";
import { PageHeader } from "@/components/ui/page-header";
import { getPhoneRecoveryPhoneNumber } from "@/server/services/password-recovery-state.service";
import { maskPhoneNumber } from "@/server/utils/phone";

export default async function VerifyForgotPasswordPage() {
  const phoneNumber = await getPhoneRecoveryPhoneNumber();

  if (!phoneNumber) {
    redirect("/forgot-password?error=missing");
  }

  return (
    <>
      <PageHeader
        title="Verify your phone"
        description="Enter the verification code sent to your phone number."
      />

      <VerifyRecoveryOtpForm maskedPhoneNumber={maskPhoneNumber(phoneNumber)} />
    </>
  );
}
