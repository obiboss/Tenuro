import { NextResponse } from "next/server";
import { getManagerUnifiedReportData } from "@/server/services/manager-unified-report.service";
import { buildWaMeUrl } from "@/server/utils/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getManagerUnifiedReportData({
      landlordClientId: url.searchParams.get("landlordClientId"),
      propertyId: url.searchParams.get("propertyId"),
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    });

    if (!data.snapshot) {
      return NextResponse.json(
        {
          ok: false,
          message: "Select a landlord and property before sending the report.",
        },
        { status: 400 },
      );
    }

    if (!data.snapshot.landlord.landlord_phone) {
      return NextResponse.json(
        {
          ok: false,
          message: "Add the landlord phone number before sending the report.",
        },
        { status: 400 },
      );
    }

    const message = [
      `Hello ${data.snapshot.landlord.landlord_name},`,
      "",
      `Here is the summary for ${data.snapshot.property.property_name} from ${date(
        data.snapshot.period.dateFrom,
      )} to ${date(data.snapshot.period.dateTo)}.`,
      "",
      `Rent collected: ${money(data.snapshot.totals.rentCollected)}`,
      `Manager commission: ${money(data.snapshot.totals.managerCommission)}`,
      `Maintenance and expenses: ${money(
        data.snapshot.totals.maintenanceAndExpenses,
      )}`,
      `Amount remitted: ${money(data.snapshot.totals.amountRemitted)}`,
      `Pending landlord balance: ${money(
        data.snapshot.totals.pendingLandlordBalance,
      )}`,
      "",
      `Occupied units: ${data.snapshot.occupancy.occupiedUnits} of ${data.snapshot.occupancy.totalUnits}`,
      `Tenants owing: ${data.snapshot.occupancy.tenantsOwing}`,
      `Tenants due soon: ${data.snapshot.occupancy.tenantsDueSoon}`,
      "",
      "A professional PDF copy can also be downloaded from BOPA Manager.",
      "",
      "BOPA - Boldverse Property App",
    ].join("\n");

    return NextResponse.redirect(
      buildWaMeUrl({
        phoneNumber: data.snapshot.landlord.landlord_phone,
        message,
      }),
    );
  } catch (error) {
    console.error("manager unified property report share failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The report could not be prepared for WhatsApp.",
      },
      { status: 500 },
    );
  }
}
