import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIso(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(s: string): string {
  const d = fromIso(s);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DatePicker({
  value,
  onChange,
  id,
  min,
  max,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => fromIso(value) ?? new Date());
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setViewDate(fromIso(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Flip above the trigger when there isn't room below, and clamp horizontally, so the
      // popover (position: fixed, so page scroll can't bring an off-screen one back into view)
      // never renders somewhere the user can't reach — e.g. a trigger near the bottom of a tall page.
      const estimatedHeight = 380;
      const estimatedWidth = Math.max(rect.width, 260);
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow >= estimatedHeight + 8 ? rect.bottom + 8 : Math.max(8, rect.top - estimatedHeight - 8);
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - estimatedWidth - 8);
      setCoords({ top, left, width: rect.width });
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: new Date(year, month, i - startWeekday + 1), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
  }

  const selected = fromIso(value);
  const todayDate = new Date();
  const minDate = min ? fromIso(min) : null;
  const maxDate = max ? fromIso(max) : null;

  function selectDate(d: Date) {
    if (minDate && d < minDate) return;
    if (maxDate && d > maxDate) return;
    onChange(toIso(d));
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
            aria-label="Choose date"
            style={{ position: "fixed", top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 260) }}
          >
          <div className="date-picker-header">
            <button type="button" className="ghost" onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Previous month">
              ‹
            </button>
            <span>{viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <button type="button" className="ghost" onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {cells.map(({ date, outside }, i) => {
              const disabled = (minDate != null && date < minDate) || (maxDate != null && date > maxDate);
              const isSelected = selected != null && sameDay(date, selected);
              const isToday = sameDay(date, todayDate);
              return (
                <button
                  type="button"
                  key={i}
                  className={
                    "date-picker-day" +
                    (outside ? " outside" : "") +
                    (isSelected ? " selected" : "") +
                    (isToday && !isSelected ? " today" : "")
                  }
                  disabled={disabled}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-picker-footer">
            <button type="button" className="ghost" onClick={() => onChange("")}>
              Clear
            </button>
            <button type="button" className="ghost" onClick={() => selectDate(new Date())}>
              Today
            </button>
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
