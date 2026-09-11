import { useEffect, useState } from "react";

const COLORS = ["var(--brand)", "var(--accent-gold)", "var(--series-1)", "var(--series-2)", "var(--status-good)"];

type Piece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  drift: number;
};

export default function Confetti({ onDone }: { onDone: () => void }) {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2.2 + Math.random() * 1.2,
      rotate: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      drift: (Math.random() - 0.5) * 160,
    })),
  );

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              background: p.color,
              "--drift": `${p.drift}px`,
              transform: `rotate(${p.rotate}deg)`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
