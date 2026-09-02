export function isPro(proUntil: string | null | undefined, now: Date = new Date()): boolean {
  if (!proUntil) return false;
  const until = new Date(proUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > now.getTime();
}

export const FREE_PRICE_HISTORY = 14;
export const PRO_PRICE_HISTORY = 90;
export const FREE_CAREER_CHART = 90;
export const PRO_CAREER_CHART = 365;

export function priceHistoryLimit(pro: boolean): number {
  return pro ? PRO_PRICE_HISTORY : FREE_PRICE_HISTORY;
}

export function careerChartLimit(pro: boolean): number {
  return pro ? PRO_CAREER_CHART : FREE_CAREER_CHART;
}
