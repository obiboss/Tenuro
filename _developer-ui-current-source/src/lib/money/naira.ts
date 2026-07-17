export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNairaCompact(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNairaInput(value: string) {
  const numericValue = value.replace(/[^\d]/g, "");

  if (!numericValue) {
    return "";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(numericValue));
}

export function getNumericMoneyValue(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function parseNumericMoneyValue(value: string) {
  const numericValue = getNumericMoneyValue(value);

  if (!numericValue) {
    return null;
  }

  return Number(numericValue);
}
