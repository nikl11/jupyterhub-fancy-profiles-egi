import * as React from "react";
import { createRoot } from "react-dom/client";

import { ProfileForm } from "./ProfileForm";
import { GLOBAL_CSS } from "./styles";
import { applyThemeClass } from "./theme";

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
  kubespawner_override?: Record<string, unknown>;
  profile_options?: Record<string, unknown>;
};

function injectGlobalCss(cssText: string) {
  const id = "jupyterhub-fancy-profiles-css";
  if (document.getElementById(id)) return;

  const el = document.createElement("style");
  el.id = id;
  el.textContent = cssText;
  document.head.appendChild(el);
}

function getProfileList(): Profile[] {
  const w = window as unknown as { profileList?: unknown };
  const list = w.profileList;
  return Array.isArray(list) ? (list as Profile[]) : [];
}

const rootEl = document.getElementById("form");

if (rootEl) {
  injectGlobalCss(GLOBAL_CSS);
  applyThemeClass();

  const profileList = getProfileList();

  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ProfileForm profileList={profileList} />
    </React.StrictMode>,
  );
}
