export type ThemeName = "egi" | "eosc";

declare const __JHFP_THEME__: ThemeName | undefined;

export function getTheme(): ThemeName {
  // Compile-time injected by webpack DefinePlugin (fallback to "egi")
  const baked = (typeof __JHFP_THEME__ !== "undefined" ? __JHFP_THEME__ : "egi") as ThemeName;
  return baked === "eosc" ? "eosc" : "egi";
}

export function applyThemeClass(): ThemeName {
  const theme = getTheme();
  const root = document.documentElement;

  root.classList.remove("jhfp-theme-egi", "jhfp-theme-eosc");
  root.classList.add(theme === "eosc" ? "jhfp-theme-eosc" : "jhfp-theme-egi");

  // Optional debug
  (window as any).__JHFP_THEME__ = theme;

  return theme;
}
