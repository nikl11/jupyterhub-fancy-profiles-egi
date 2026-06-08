import React from 'react';
import { createRoot } from "react-dom/client";
import { App } from "./ProfileForm";

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
  kubespawner_override?: Record<string, unknown>;
  profile_options?: Record<string, unknown>;
};

declare global {
  interface Window {
    profileList?: Profile[];
  }
}

const mount = document.getElementById("form");

if (mount) {
  const root = createRoot(mount);
  root.render(<App profileList={window.profileList ?? []} />);
}

