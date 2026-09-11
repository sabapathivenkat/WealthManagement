export default function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ height: 6, borderRadius: 3, background: "var(--gridline)" }}>
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          borderRadius: 3,
          background: color ?? "var(--series-1)",
        }}
      />
    </div>
  );
}
