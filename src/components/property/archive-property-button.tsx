"use client";

import { useTransition } from "react";
import { archivePropertyAction } from "@/actions/properties.actions";
import { Button } from "@/components/ui/button";

type ArchivePropertyButtonProps = {
  propertyId: string;
};

export function ArchivePropertyButton({
  propertyId,
}: ArchivePropertyButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      isLoading={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          "Archive this property? It will be removed from your active property list.",
        );

        if (!confirmed) {
          return;
        }

        startTransition(() => {
          archivePropertyAction(propertyId);
        });
      }}
    >
      Archive Property
    </Button>
  );
}
