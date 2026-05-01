"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

type TenantKycDocumentType =
  | "tenant_id_document"
  | "tenant_passport_photo"
  | "guarantor_id_document";

type UploadResponse = {
  ok: boolean;
  message: string;
  file?: {
    bucket: string;
    path: string;
    contentType: string;
    sizeBytes: number;
  };
};

type TenantKycFileUploadProps = {
  token: string;
  documentType: TenantKycDocumentType;
  label: string;
  name: string;
  required?: boolean;
  helperText?: string;
  error?: string;
};

export function TenantKycFileUpload({
  token,
  documentType,
  label,
  name,
  required,
  helperText,
  error,
}: TenantKycFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedPath, setUploadedPath] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("documentType", documentType);
      formData.append("file", file);

      const response = await fetch("/api/files/signed-upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.ok || !result.file) {
        throw new Error(result.message || "File upload failed.");
      }

      setUploadedPath(result.file.path);
      setUploadedFileName(file.name);
      setMessage("File uploaded successfully.");
    } catch (uploadError) {
      setUploadedPath("");
      setUploadedFileName("");
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "File upload failed.",
      );

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-text-strong">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>

      <input type="hidden" name={name} value={uploadedPath} />

      <div className="rounded-button border border-dashed border-border-soft bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <UploadCloud aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>

            <div>
              <p className="text-sm font-bold text-text-strong">
                {uploadedFileName || "Upload file"}
              </p>
              <p className="mt-1 text-sm leading-5 text-text-muted">
                {helperText || "JPG, PNG, WEBP, or PDF. Maximum 5MB."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            isLoading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Choose File
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
        />
      </div>

      {message ? (
        <p
          className={
            uploadedPath
              ? "text-sm font-semibold text-success"
              : "text-sm font-semibold text-danger"
          }
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}
