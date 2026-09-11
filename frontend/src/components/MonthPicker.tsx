import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseValue(value: string): { year: number; month: number } | null {
  if (!value) return null;
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return null;
  return { year: y, month: m - 1 };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDisplay(value: string): string {
  const parsed = parseValue(value);
  if (!parsed) return "";
  return new Date(parsed.year, parsed.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function MonthPicker({
  value,
  onChange,
  id,
  placeholder = "Select month",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseValue(value)?.year ?? new Date().getFullYear());
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setViewYear(parseValue(value)?.year ?? new Date().getFullYear());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = parseValue(value);
  const now = new Date();

  function selectMonth(monthIndex: number) {
    onChange(`${viewYear}-${pad(monthIndex + 1)}`);
    setOpen(false);
  }

  return (
    <div className="date-picker" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="date-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "" : "date-picker-placeholder"}>{value ? formatDisplay(value) : placeholder}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="date-picker-popover glass"
            role="dialog"
            aria-label="Choose month"
            style={{ position: "fixed", top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 240) }}
          >
            <div className="date-picker-header">
              <button type="button" className="ghost" onClick={() => setViewYear((y) => y - 1)} aria-label="Previous year">
                ‹
              </button>
              <span>{viewYear}</span>
              <button type="button" className="ghost" onClick={() => setViewYear((y) => y + 1)} aria-label="Next year">
                ›
              </button>
            </div>
            <div className="month-picker-grid">
              {MONTHS.map((label, i) => {
                const isSelected = selected != null && selected.year === viewYear && selected.month === i;
                const isCurrent = viewYear === now.getFullYear() && i === now.getMonth();
                return (
                  <button
                    type="button"
                    key={label}
                    className={"date-picker-day" + (isSelected ? " selected" : "") + (isCurrent && !isSelected ? " today" : "")}
                    onClick={() => selectMonth(i)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="date-picker-footer">
              <button type="button" className="ghost" onClick={() => onChange("")}>
                Clear
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setViewYear(now.getFullYear());
                  selectMonth(now.getMonth());
                }}
              >
                This month
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
