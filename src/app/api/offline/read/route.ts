import {
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  getOfflineReadSnapshot,
} from "@/server/offline/read-snapshot.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
) {
  try {
    const cursor =
      request.nextUrl.searchParams.get(
        "cursor",
      );
    const forceFull =
      request.nextUrl.searchParams.get(
        "full",
      ) === "1";

    const snapshot =
      await getOfflineReadSnapshot({
        cursor,
        forceFull,
      });

    if (!snapshot) {
      return NextResponse.json(
        {
          message:
            "Offline workspace data is unavailable.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      );
    }

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    });
  } catch (error) {
    // Keep database details out of the response, but retain them in the server
    // log. Without this, a missing migration or an invalid snapshot query is
    // indistinguishable from a transient offline-sync failure.
    console.error(
      "Unable to create the offline read snapshot.",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Offline workspace data could not be refreshed.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  }
}
