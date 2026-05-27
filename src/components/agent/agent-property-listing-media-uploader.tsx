"use client";

import { useRef, useState, useTransition } from "react";
import {
  confirmAgentListingMediaUploadAction,
  createAgentListingMediaUploadUrlAction,
} from "@/actions/agent-property-listing-media.actions";

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

function getFileInputAcceptValue() {
  return ACCEPTED_MEDIA_TYPES.join(",");
}

export function AgentPropertyListingMediaUploader({
  listingId,
}: {
  listingId: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function uploadSelectedFile(file: File) {
    setMessage("");
    setIsSuccess(false);

    if (!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
      setMessage(
        "Only JPG, PNG, WEBP, MP4, WEBM, and MOV files are supported.",
      );
      return;
    }

    const uploadPermission = await createAgentListingMediaUploadUrlAction({
      listingId,
      filename: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    });

    if (!uploadPermission.ok) {
      setMessage(uploadPermission.message);
      return;
    }

    if (
      !uploadPermission.uploadUrl ||
      !uploadPermission.objectKey ||
      !uploadPermission.bucketName ||
      !uploadPermission.mediaType
    ) {
      setMessage("Upload could not be prepared. Please try again.");
      return;
    }

    const uploadResponse = await fetch(uploadPermission.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      setMessage("Media upload failed. Please try again.");
      return;
    }

    const confirmation = await confirmAgentListingMediaUploadAction({
      listingId,
      filename: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      objectKey: uploadPermission.objectKey,
      bucketName: uploadPermission.bucketName,
      mediaType: uploadPermission.mediaType,
    });

    setMessage(confirmation.message);
    setIsSuccess(confirmation.ok);

    if (confirmation.ok) {
      resetInput();
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    startTransition(() => {
      void uploadSelectedFile(file);
    });
  }

  return (
    <div className="rounded-button bg-white p-3">
      <label
        htmlFor={`listing-media-${listingId}`}
        className="block text-xs font-black uppercase tracking-wide text-text-muted"
      >
        Add picture or video
      </label>

      <input
        ref={inputRef}
        id={`listing-media-${listingId}`}
        type="file"
        accept={getFileInputAcceptValue()}
        onChange={handleFileChange}
        disabled={isPending}
        className="mt-2 w-full rounded-button border border-border-soft bg-background px-3 py-2 text-sm font-semibold text-text-strong file:mr-3 file:rounded-button file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
      />

      <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
        Images up to 8MB. Videos up to 80MB.
      </p>

      {message ? (
        <p
          role="alert"
          className={`mt-2 rounded-button px-3 py-2 text-xs font-bold ${
            isSuccess
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {message}
        </p>
      ) : null}

      {isPending ? (
        <p className="mt-2 text-xs font-bold text-primary">
          Uploading media...
        </p>
      ) : null}
    </div>
  );
}
