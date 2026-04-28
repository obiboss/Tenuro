import { AppError } from "@/server/errors/app-error";
import type {
  OtpDeliveryChannel,
  OtpDeliveryStatus,
} from "@/server/types/auth.types";

type TwilioMessageResponse = {
  sid: string;
  status: string;
};

type OtpDispatchResult = {
  channel: OtpDeliveryChannel;
  status: OtpDeliveryStatus;
  provider: "twilio";
  providerReference?: string;
  failureReason?: string;
};

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new AppError(
      "TWILIO_NOT_CONFIGURED",
      "Message delivery is not configured.",
      500,
    );
  }

  return {
    accountSid,
    authToken,
  };
}

function getBasicAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

function buildOtpMessage(otpCode: string) {
  return `Your Tenuro verification code is ${otpCode}. This code expires in 10 minutes. Do not share it with anyone.`;
}

async function sendTwilioMessage(params: {
  to: string;
  from: string;
  body: string;
}) {
  const { accountSid, authToken } = getTwilioCredentials();

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: params.to,
        From: params.from,
        Body: params.body,
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as Partial<TwilioMessageResponse> & {
    message?: string;
  };

  if (!response.ok || !payload.sid) {
    throw new AppError(
      "OTP_DELIVERY_FAILED",
      payload.message ?? "Verification code could not be sent.",
      502,
    );
  }

  return {
    sid: payload.sid,
    status: payload.status ?? "sent",
  };
}

export async function sendOtpViaWhatsApp(params: {
  phoneNumber: string;
  otpCode: string;
}): Promise<OtpDispatchResult> {
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!whatsappNumber) {
    throw new AppError(
      "WHATSAPP_NOT_CONFIGURED",
      "WhatsApp delivery is not configured.",
      500,
    );
  }

  const message = await sendTwilioMessage({
    to: `whatsapp:${params.phoneNumber}`,
    from: `whatsapp:${whatsappNumber}`,
    body: buildOtpMessage(params.otpCode),
  });

  return {
    channel: "whatsapp",
    status: "sent",
    provider: "twilio",
    providerReference: message.sid,
  };
}

export async function sendOtpViaSms(params: {
  phoneNumber: string;
  otpCode: string;
}): Promise<OtpDispatchResult> {
  const smsNumber = process.env.TWILIO_SMS_NUMBER;

  if (!smsNumber) {
    throw new AppError(
      "SMS_NOT_CONFIGURED",
      "SMS delivery is not configured.",
      500,
    );
  }

  const message = await sendTwilioMessage({
    to: params.phoneNumber,
    from: smsNumber,
    body: buildOtpMessage(params.otpCode),
  });

  return {
    channel: "sms",
    status: "sent",
    provider: "twilio",
    providerReference: message.sid,
  };
}

export async function dispatchOtp(params: {
  phoneNumber: string;
  otpCode: string;
}): Promise<OtpDispatchResult> {
  try {
    return await sendOtpViaWhatsApp(params);
  } catch (whatsappError) {
    try {
      return await sendOtpViaSms(params);
    } catch (smsError) {
      const failureReason =
        smsError instanceof Error
          ? smsError.message
          : whatsappError instanceof Error
            ? whatsappError.message
            : "Verification code could not be sent.";

      return {
        channel: "sms",
        status: "failed",
        provider: "twilio",
        failureReason,
      };
    }
  }
}
