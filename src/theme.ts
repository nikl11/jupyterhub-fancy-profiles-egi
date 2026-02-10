export type ThemeName = "egi" | "eosc";

/**
 * This constant can be injected at build time via Webpack DefinePlugin.
 * Example: __JHFP_THEME__ = "eosc"
 */
declare const __JHFP_THEME__: ThemeName | undefined;

type ThemeWindow = Window & {
  __JHFP_THEME__?: ThemeName;
};

export function getTheme(): ThemeName {
  // Value injected at build time (fallback to "egi")
  const baked: ThemeName =
    typeof __JHFP_THEME__ !== "undefined" ? __JHFP_THEME__ : "egi";

  return baked === "eosc" ? "eosc" : "egi";
}

export function applyThemeClass(): ThemeName {
  const theme = getTheme();
  const root = document.documentElement;

  root.classList.remove("jhfp-theme-egi", "jhfp-theme-eosc");
  root.classList.add(
    theme === "eosc" ? "jhfp-theme-eosc" : "jhfp-theme-egi",
  );

  // Expose for debugging (no "any")
  const w = window as ThemeWindow;
  w.__JHFP_THEME__ = theme;

  return theme;
}
