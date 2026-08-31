/** Round to cents the same way Postgres `round(numeric, 2)` does for financial totals. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function tradeTotal(quantity: number, price: number): number {
  return roundMoney(quantity * price);
}

export function returnPct(finalValue: number, startingCash: number): number {
  if (!Number.isFinite(startingCash) || startingCash === 0) return 0;
  return roundTo( ((finalValue - startingCash) / startingCash) * 100, 4);
}

function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}
