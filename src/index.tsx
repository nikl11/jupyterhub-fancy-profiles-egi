import * as React from "react";
import { createRoot } from "react-dom/client";

import ProfileForm, { type Profile } from "./ProfileForm";
import { GLOBAL_CSS } from "./styles";
import { applyThemeClass } from "./theme";

function injectGlobalCss(cssText: string) {
  const id = "jupyterhub-fancy-profiles-css";
  if (document.getElementById(id)) return;

  const el = document.createElement("style");
  el.id = id;
  el.textContent = cssText;
  document.head.appendChild(el);
}

function readWindowProfileList(): Profile[] {
  const w = window as unknown as { profileList?: unknown };
  const list = w.profileList;

  if (!Array.isArray(list)) return [];

  // Minimal runtime validation
  return list
    .filter((p) => typeof p === "object" && p !== null)
    .map((p) => p as Profile);
}

const rootEl = document.getElementById("form");
if (rootEl) {
  injectGlobalCss(GLOBAL_CSS);
  applyThemeClass();

  const profileList = readWindowProfileList();

  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ProfileForm profileList={profileList} />
    </React.StrictMode>,
  );
}

