const DEFAULT_APP_ORIGIN = "https://boldverseproperty.com";

type TrustedAuthOriginInput = {
  configuredAppUrl?: string | null;
  requestOrigin?: string | null;
  requestHost?: string | null;
  forwardedProto?: string | null;
  fallbackOrigin?: string;
};

function toHttpOrigin(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getHostName(host: string) {
  return host.trim().split(":")[0]?.toLowerCase() ?? "";
}

function isTrustedFallbackHost(host: string) {
  const hostname = getHostName(host);

  return (
    hostname === "boldverseproperty.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

function getForwardedProtocol(value: string | null | undefined) {
  const protocol = value?.split(",")[0]?.trim().toLowerCase();

  return protocol === "http" ? "http" : "https";
}

export function getTrustedAuthOrigin(input: TrustedAuthOriginInput = {}) {
  const configuredOrigin = toHttpOrigin(input.configuredAppUrl);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (
    input.requestOrigin &&
    input.requestHost &&
    isTrustedFallbackHost(input.requestHost)
  ) {
    const requestOrigin = toHttpOrigin(input.requestOrigin);

    if (
      requestOrigin &&
      getHostName(new URL(requestOrigin).host) ===
        getHostName(input.requestHost)
    ) {
      return requestOrigin;
    }
  }

  if (input.requestHost && isTrustedFallbackHost(input.requestHost)) {
    return `${getForwardedProtocol(input.forwardedProto)}://${input.requestHost.trim()}`;
  }

  return input.fallbackOrigin ?? DEFAULT_APP_ORIGIN;
}

export function isSafeAuthRedirectPath(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return false;
  }

  return (
    trimmedValue.startsWith("/") &&
    !trimmedValue.startsWith("//") &&
    !trimmedValue.includes("\\")
  );
}

export function getSafeAuthRedirectPath(
  value: string | null | undefined,
  fallbackPath: string,
) {
  const trimmedValue = value?.trim();

  return trimmedValue && isSafeAuthRedirectPath(trimmedValue)
    ? trimmedValue
    : fallbackPath;
}
