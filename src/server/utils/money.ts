export {
  formatNaira,
  formatNairaCompact,
} from "@/lib/money/naira";

export function convertNairaToKobo(amount: number) {
  return Math.round(amount * 100);
}

export function convertKoboToNaira(amountInKobo: number) {
  return Number((amountInKobo / 100).toFixed(2));
}
