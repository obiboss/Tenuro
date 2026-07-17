import {
  NextResponse,
} from "next/server";
import {
  applyOfflineSafeMutations,
} from "@/server/offline/safe-mutation.service";
import {
  offlineSafeMutationBatchSchema,
} from "@/server/validators/offline-safe-mutation.schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message:
          "The offline changes request is invalid.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  }

  const parsed =
    offlineSafeMutationBatchSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ??
          "The offline changes request is invalid.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  }

  try {
    const result =
      await applyOfflineSafeMutations(
        parsed.data.mutations,
      );

    if (!result.authorized) {
      return NextResponse.json(
        {
          message:
            "Please sign in again to sync offline changes.",
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

    return NextResponse.json(
      {
        results: result.results,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Offline changes could not be synced yet.",
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
