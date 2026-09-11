import type { ReactNode } from "react";
import { formatCurrency } from "../utils/format";

export default function StatTile({
  label,
  value,
  variant,
  sub,
}: {
  label: string;
  value: number;
  variant?: "income" | "expense" | "net";
  sub?: ReactNode;
}) {
  return (
    <div className={`stat-tile${variant ? ` ${variant}` : ""}`}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
      {sub}
    </div>
  );
}
