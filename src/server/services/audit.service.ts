import "server-only";

import { redirect } from "next/navigation";
import { AppError } from "@/server/errors/app-error";
import { getServerSession } from "@/server/services/session.service";

export async function requireUser() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireLandlord() {
  const session = await requireUser();

  if (session.role !== "landlord") {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this page.",
      403,
    );
  }

  return {
    id: session.id,
    fullName: session.fullName,
    phoneNumber: session.phoneNumber,
    email: session.email,
  };
}

export async function requireTenant() {
  const session = await requireUser();

  if (session.role !== "tenant") {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this page.",
      403,
    );
  }

  return session;
}

export async function requireCaretaker() {
  const session = await requireUser();

  if (session.role !== "caretaker") {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this page.",
      403,
    );
  }

  return session;
}
