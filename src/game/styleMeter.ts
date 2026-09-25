export const MAX_STYLE = 100;
export const TRICK_STYLE_GAIN = 10;
export const HUMILIATION_STYLE_BONUS = 18;

export function addStyle(current: number, amount: number): number {
  return Math.min(MAX_STYLE, Math.max(0, current + amount));
}

export function canUseSpecialShot(current: number): boolean {
  return current >= MAX_STYLE;
}

export function spendSpecialShot(current: number): number {
  return canUseSpecialShot(current) ? 0 : current;
}
