import { useEffect, useState } from "react";
import { settingsApi } from "../api/endpoints";
import type { PayoffStrategy, UserSettings } from "../api/types";
import { useTheme, type ThemePreference } from "../auth/ThemeContext";
import { useGlass } from "../auth/GlassContext";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { lightOpacity, darkOpacity, setLightOpacity, setDarkOpacity } = useGlass();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [currencyInput, setCurrencyInput] = useState("");
  const [fyStartInput, setFyStartInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.get().then((s) => {
      setSettings(s);
      setCurrencyInput(s.currency);
      setFyStartInput(String(s.fyStartMonth));
    });
  }, []);

  async function save(next: UserSettings) {
    setError(null);
    setSettings(next);
    try {
      await settingsApi.update(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("Could not save — please try again");
    }
  }

  function saveCurrency() {
    if (!settings) return;
    const trimmed = currencyInput.trim();
    if (!trimmed) {
      setCurrencyInput(settings.currency);
      return;
    }
    save({ ...settings, currency: trimmed });
  }

  function saveFyStart() {
    if (!settings) return;
    const parsed = Number(fyStartInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
      setFyStartInput(String(settings.fyStartMonth));
      return;
    }
    save({ ...settings, fyStartMonth: parsed });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card">
        <h2>Appearance</h2>
        <div className="form-grid">
          <div className="field">
            <label>Theme</label>
            <div className="segmented">
              {THEME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={theme === o.value ? "active" : ""}
                  onClick={() => setTheme(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Control how see-through the glass panels (sidebar, cards, tables) are — set separately for light and dark
          mode. Lower is more transparent, higher is more solid.
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="glass-light">Light mode transparency ({lightOpacity}%)</label>
            <input
              id="glass-light"
              type="range"
              min={0}
              max={100}
              value={lightOpacity}
              onChange={(e) => setLightOpacity(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="glass-dark">Dark mode transparency ({darkOpacity}%)</label>
            <input
              id="glass-dark"
              type="range"
              min={0}
              max={100}
              value={darkOpacity}
              onChange={(e) => setDarkOpacity(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {settings && (
        <div className="card">
          <h2>Preferences</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="currency">Currency</label>
              <input
                id="currency"
                type="text"
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                onBlur={saveCurrency}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
            <div className="field">
              <label htmlFor="fy-start">Financial year start month</label>
              <input
                id="fy-start"
                type="number"
                min={1}
                max={12}
                value={fyStartInput}
                onChange={(e) => setFyStartInput(e.target.value)}
                onBlur={saveFyStart}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
            <div className="field">
              <label htmlFor="default-strategy">Default debt strategy</label>
              <select
                id="default-strategy"
                value={settings.defaultDebtStrategy}
                onChange={(e) => save({ ...settings, defaultDebtStrategy: e.target.value as PayoffStrategy })}
              >
                <option value="AVALANCHE">Avalanche</option>
                <option value="SNOWBALL">Snowball</option>
                <option value="CUSTOM">Custom priority</option>
              </select>
            </div>
          </div>
          {saved && <p style={{ color: "var(--status-good)", fontSize: 13 }}>Saved</p>}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
