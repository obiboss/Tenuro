import { redirect } from "next/navigation";

export default function LandlordPaymentClaimsPage() {
  redirect("/payments?tab=confirm");
}
