export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Compact Indian notation for tight spaces (chart axes, legends): ₹1.5L, ₹2.3Cr, etc. */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function monthBounds(monthValue: string): [string, string] {
  const [year, month] = monthValue.split("-").map(Number);
  const from = `${monthValue}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${monthValue}-${String(lastDay).padStart(2, "0")}`;
  return [from, to];
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
