import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./ProfileForm";
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

function getProfileList(): any[] {
  const list = (window as any).profileList;
  return Array.isArray(list) ? list : [];
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
