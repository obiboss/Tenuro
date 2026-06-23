import { CaretakersPageClient } from "@/components/caretaker/caretakers-page-client";
import { getLandlordCaretakersPageData } from "@/server/services/caretaker-invites.service";

export default async function CaretakersPage() {
  const data = await getLandlordCaretakersPageData();

  return (
    <CaretakersPageClient
      caretakers={data.caretakers}
      pendingInvites={data.pendingInvites}
      properties={data.properties}
    />
  );
}
