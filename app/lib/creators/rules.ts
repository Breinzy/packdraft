export function parseCreatorSlug(raw: string): string {
  const slug = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (slug.length < 3 || slug.length > 32) {
    throw new Error('Creator slug must be 3–32 letters, numbers, or dashes');
  }
  return slug;
}

export function creatorBudgetCap(isAdmin: boolean, budget: number): number {
  if (isAdmin) return budget;
  if (!(budget > 0)) throw new Error('Starting budget must be positive');
  if (budget > 100000) throw new Error('Creator budget cannot exceed $100,000');
  return budget;
}

export function creatorDurationCap(isAdmin: boolean, days: number): number {
  if (isAdmin) return days;
  if (!(days > 0) || days > 30) throw new Error('Creator duration must be 1–30 days');
  return days;
}
