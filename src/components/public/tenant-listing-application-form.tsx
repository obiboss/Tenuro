"use client";

import { useActionState, useEffect } from "react";
import {
  initialTenantApplicationProcessingFeeActionState,
  type TenantApplicationProcessingFeeActionState,
} from "@/actions/tenant-application-processing-fees.state";
import {
  initialTenantListingApplicationActionState,
  type TenantListingApplicationActionState,
} from "@/actions/tenant-listing-applications.state";
import { initializeTenantApplicationProcessingFeeAction } from "@/actions/tenant-application-processing-fees.actions";
import { submitTenantListingApplicationAction } from "@/actions/tenant-listing-applications.actions";
import { PublicTenantKycFileUpload } from "@/components/public/public-tenant-kyc-file-upload";

function FieldError({
  field,
  state,
}: {
  field: string;
  state: TenantListingApplicationActionState;
}) {
  const message = state.fieldErrors?.[field]?.[0];

  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-semibold text-danger">{message}</p>;
}

function ProcessingFeeAlert({
  applicationState,
  paymentState,
  paymentAction,
  isPaymentPending,
}: {
  applicationState: TenantListingApplicationActionState;
  paymentState: TenantApplicationProcessingFeeActionState;
  paymentAction: (formData: FormData) => void;
  isPaymentPending: boolean;
}) {
  const shouldShowPaymentButton =
    applicationState.ok &&
    applicationState.requiresProcessingFee &&
    applicationState.applicationId;

  if (!shouldShowPaymentButton) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
      <p>
        Your KYC profile has been saved, but landlord review will only start
        after the processing and verification fee is paid.
      </p>

      {paymentState.message ? (
        <div
          role="alert"
          className={`rounded-button px-4 py-3 ${
            paymentState.ok
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {paymentState.message}
        </div>
      ) : null}

      <input
        type="hidden"
        name="propertyApplicationId"
        value={applicationState.applicationId}
        readOnly
      />

      <button
        type="submit"
        formAction={paymentAction}
        disabled={isPaymentPending}
        className="w-full rounded-button bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaymentPending
          ? "Opening secure payment..."
          : "Pay processing & verification fee"}
      </button>
    </div>
  );
}

export function TenantListingApplicationForm({
  listingId,
}: {
  listingId: string;
}) {
  const [applicationState, applicationAction, isApplicationPending] =
    useActionState(
      submitTenantListingApplicationAction,
      initialTenantListingApplicationActionState,
    );

  const [paymentState, paymentAction, isPaymentPending] = useActionState(
    initializeTenantApplicationProcessingFeeAction,
    initialTenantApplicationProcessingFeeActionState,
  );

  useEffect(() => {
    if (paymentState.ok && paymentState.authorizationUrl) {
      window.location.href = paymentState.authorizationUrl;
    }
  }, [paymentState.ok, paymentState.authorizationUrl]);

  const applicationSubmitted = applicationState.ok;

  return (
    <form action={applicationAction} className="space-y-4">
      <input
        type="hidden"
        name="agentPropertyListingId"
        value={listingId}
        readOnly
      />

      {applicationState.message ? (
        <div
          role="alert"
          className={`rounded-button px-4 py-3 text-sm font-semibold leading-6 ${
            applicationState.ok
              ? applicationState.requiresProcessingFee
                ? "bg-warning-soft text-warning"
                : "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {applicationState.message}
        </div>
      ) : null}

      <ProcessingFeeAlert
        applicationState={applicationState}
        paymentState={paymentState}
        paymentAction={paymentAction}
        isPaymentPending={isPaymentPending}
      />

      {!applicationSubmitted ? (
        <>
          <div>
            <label
              htmlFor="fullName"
              className="text-sm font-bold text-text-strong"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
              required
            />
            <FieldError field="fullName" state={applicationState} />
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="text-sm font-bold text-text-strong"
            >
              Phone number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678 or +2348012345678"
              className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
              required
            />
            <p className="mt-1 text-xs font-semibold text-text-muted">
              Use your Nigerian phone number. BOPA will format it securely.
            </p>
            <FieldError field="phoneNumber" state={applicationState} />
          </div>

          <div>
            <label
              htmlFor="email"
              className="text-sm font-bold text-text-strong"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Optional"
              className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            />
            <FieldError field="email" state={applicationState} />
          </div>

          <div>
            <label
              htmlFor="dateOfBirth"
              className="text-sm font-bold text-text-strong"
            >
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
            />
            <FieldError field="dateOfBirth" state={applicationState} />
          </div>

          <div>
            <label
              htmlFor="homeAddress"
              className="text-sm font-bold text-text-strong"
            >
              Current home address
            </label>
            <textarea
              id="homeAddress"
              name="homeAddress"
              rows={3}
              className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
              required
            />
            <FieldError field="homeAddress" state={applicationState} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="occupation"
                className="text-sm font-bold text-text-strong"
              >
                Occupation
              </label>
              <input
                id="occupation"
                name="occupation"
                type="text"
                className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
                required
              />
              <FieldError field="occupation" state={applicationState} />
            </div>

            <div>
              <label
                htmlFor="employer"
                className="text-sm font-bold text-text-strong"
              >
                Employer / business name
              </label>
              <input
                id="employer"
                name="employer"
                type="text"
                placeholder="Optional"
                className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
              />
              <FieldError field="employer" state={applicationState} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="idType"
                className="text-sm font-bold text-text-strong"
              >
                ID type
              </label>
              <select
                id="idType"
                name="idType"
                className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
                required
              >
                <option value="">Select ID type</option>
                <option value="nin">NIN</option>
                <option value="passport">International Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="voters_card">Voter&apos;s Card</option>
              </select>
              <FieldError field="idType" state={applicationState} />
            </div>

            <div>
              <label
                htmlFor="idNumber"
                className="text-sm font-bold text-text-strong"
              >
                ID number
              </label>
              <input
                id="idNumber"
                name="idNumber"
                type="text"
                autoComplete="off"
                placeholder="Enter your selected ID number"
                className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
                required
              />
              <p className="mt-1 text-xs font-semibold text-text-muted">
                This is saved with your reusable KYC answers.
              </p>
              <FieldError field="idNumber" state={applicationState} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PublicTenantKycFileUpload
              agentPropertyListingId={listingId}
              documentType="tenant_id_document"
              label="ID document"
              name="idDocumentPath"
              required
              error={applicationState.fieldErrors?.idDocumentPath?.[0]}
            />

            <PublicTenantKycFileUpload
              agentPropertyListingId={listingId}
              documentType="tenant_passport_photo"
              label="Passport photo"
              name="passportPhotoPath"
              required
              helperText="Upload a clear passport photo or headshot."
              error={applicationState.fieldErrors?.passportPhotoPath?.[0]}
            />
          </div>

          <div>
            <label
              htmlFor="canProvideGuarantor"
              className="text-sm font-bold text-text-strong"
            >
              Can you provide guarantor details if required?
            </label>
            <select
              id="canProvideGuarantor"
              name="canProvideGuarantor"
              className="mt-2 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none focus:border-primary"
              required
            >
              <option value="">Select answer</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not_sure">Not sure</option>
            </select>
            <p className="mt-1 text-xs font-semibold text-text-muted">
              You do not need to fill guarantor details now.
            </p>
            <FieldError field="canProvideGuarantor" state={applicationState} />
          </div>

          <div className="rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
            Processing and verification fee is not a guarantee that the
            apartment will be given to you. Final approval depends on landlord
            review, property availability, and verification outcome.
          </div>

          <button
            type="submit"
            disabled={isApplicationPending}
            className="w-full rounded-button bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplicationPending
              ? "Submitting application..."
              : "Submit application"}
          </button>
        </>
      ) : null}
    </form>
  );
}
