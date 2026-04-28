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

export function convertNairaToKobo(amount: number) {
  return Math.round(amount * 100);
}

export function convertKoboToNaira(amountInKobo: number) {
  return Number((amountInKobo / 100).toFixed(2));
}
