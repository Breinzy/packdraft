export function formatUSD(n: number, opts?: { compact?: boolean; cents?: boolean }): string {
  const { compact, cents } = opts ?? {};
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

export function formatPct(n: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign === false ? "" : n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatSignedUSD(n: number, opts?: { compact?: boolean }): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${formatUSD(Math.abs(n), { compact: opts?.compact, cents: !opts?.compact })}`;
}

export function formatCompactNumber(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function trendClass(n: number) {
  return n > 0 ? "text-positive" : n < 0 ? "text-negative" : "text-muted-foreground";
}

export function money(n: number | null | undefined, compact = false) {
  if (n == null) return "—";
  return formatUSD(n, { cents: true, compact });
}

export function setCode(name: string) {
  const words = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter((word) => word && !["the", "of", "and", "a"].includes(word.toLowerCase()));
  if (words.length === 0) return "SET";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function setAccent(name: string) {
  const hues = [258, 30, 164, 84, 300, 200, 22, 78];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % hues.length;
  return `oklch(0.72 0.14 ${hues[hash]})`;
}
