export type ThemeName = "egi" | "eosc";

/**
 * This constant is injected at build time by webpack DefinePlugin.
 * If not injected, we fall back to "egi".
 */
// eslint-disable-next-line no-underscore-dangle
declare const __JHFP_THEME__: ThemeName | undefined;

export function getTheme(): ThemeName {
  const baked: ThemeName =
    typeof __JHFP_THEME__ !== "undefined" ? __JHFP_THEME__ : "egi";
  return baked === "eosc" ? "eosc" : "egi";
}

export function applyThemeClass(): ThemeName {
  const theme = getTheme();
  const root = document.documentElement;

  root.classList.remove("jhfp-theme-egi", "jhfp-theme-eosc");
  root.classList.add(theme === "eosc" ? "jhfp-theme-eosc" : "jhfp-theme-egi");

  return theme;
}
