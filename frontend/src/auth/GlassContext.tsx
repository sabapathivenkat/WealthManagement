import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "./ThemeContext";

interface GlassState {
  lightOpacity: number;
  darkOpacity: number;
  setLightOpacity: (v: number) => void;
  setDarkOpacity: (v: number) => void;
}

const GlassContext = createContext<GlassState | undefined>(undefined);

const DEFAULT_LIGHT_OPACITY = 66;
const DEFAULT_DARK_OPACITY = 58;

// Base tint colors each theme's glass surfaces are built from — kept in sync with the
// defaults in index.css. The opacity sliders scale the alpha channel of these at runtime.
// Dark mode uses a neutral near-black tint (not a hue-tinted one) so the surfaces read as a
// true black/dark-gray glass — color is reserved for accents (buttons, charts, icons), not
// the panels themselves.
const LIGHT_SURFACE_RGB = "255, 255, 255";
const LIGHT_BORDER_RGB = "255, 255, 255";
const DARK_SURFACE_RGB = "24, 24, 27";
const DARK_BORDER_RGB = "255, 255, 255";

function readStored(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}

export function GlassProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [lightOpacity, setLightOpacityState] = useState(() => readStored("glassOpacityLight", DEFAULT_LIGHT_OPACITY));
  const [darkOpacity, setDarkOpacityState] = useState(() => readStored("glassOpacityDark", DEFAULT_DARK_OPACITY));

  useEffect(() => {
    const root = document.documentElement.style;
    const opacity = resolvedTheme === "dark" ? darkOpacity : lightOpacity;
    const surfaceRgb = resolvedTheme === "dark" ? DARK_SURFACE_RGB : LIGHT_SURFACE_RGB;
    const borderRgb = resolvedTheme === "dark" ? DARK_BORDER_RGB : LIGHT_BORDER_RGB;
    // surface-2 and the border stay proportionally lighter than the primary surface tint
    // (ratios taken from the original hand-picked design); the slider's 0-100 value is used
    // directly as the primary surface's alpha percentage, so 0 = fully see-through and
    // 100 = a near-solid tinted surface.
    const surface2Ratio = resolvedTheme === "dark" ? 0.73 : 0.625;
    const borderRatio = resolvedTheme === "dark" ? 0.36 : 0.9;
    const surface1Alpha = opacity / 100;
    const surface2Alpha = surface1Alpha * surface2Ratio;
    const borderAlpha = surface1Alpha * borderRatio;

    root.setProperty("--surface-1", `rgba(${surfaceRgb}, ${surface1Alpha.toFixed(3)})`);
    root.setProperty("--surface-2", `rgba(${surfaceRgb}, ${surface2Alpha.toFixed(3)})`);
    root.setProperty("--glass-border", `rgba(${borderRgb}, ${borderAlpha.toFixed(3)})`);
  }, [resolvedTheme, lightOpacity, darkOpacity]);

  function setLightOpacity(v: number) {
    localStorage.setItem("glassOpacityLight", String(v));
    setLightOpacityState(v);
  }

  function setDarkOpacity(v: number) {
    localStorage.setItem("glassOpacityDark", String(v));
    setDarkOpacityState(v);
  }

  return (
    <GlassContext.Provider value={{ lightOpacity, darkOpacity, setLightOpacity, setDarkOpacity }}>
      {children}
    </GlassContext.Provider>
  );
}

export function useGlass() {
  const ctx = useContext(GlassContext);
  if (!ctx) throw new Error("useGlass must be used within GlassProvider");
  return ctx;
}
