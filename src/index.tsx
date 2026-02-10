import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./ProfileForm";
import { GLOBAL_CSS } from "./styles";
import { applyThemeClass } from "./theme";

type MinimalProfile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
  // Keep it flexible; we only need slug for UI right now
  profile_options?: unknown;
  kubespawner_override?: unknown;
};

function injectGlobalCss(cssText: string) {
  const id = "jupyterhub-fancy-profiles-css";
  if (document.getElementById(id)) return;

  const el = document.createElement("style");
  el.id = id;
  el.textContent = cssText;
  document.head.appendChild(el);
}

function getProfileList(): MinimalProfile[] {
  const w = window as unknown as { profileList?: unknown };
  const list = w.profileList;

  if (!Array.isArray(list)) return [];

  // Basic runtime sanity check so we don't crash on bad data
  return list
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .filter((p) => typeof p.slug === "string")
    .map((p) => p as unknown as MinimalProfile);
}

const rootEl = document.getElementById("form");

if (rootEl) {
  injectGlobalCss(GLOBAL_CSS);
  applyThemeClass();

  const profileList = getProfileList();

  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App profileList={profileList} />
    </React.StrictMode>,
  );
}
