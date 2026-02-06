import { createRoot } from "react-dom/client";
import { SpawnerFormProvider } from "./state";
import { ProfileForm } from "./ProfileForm";
import { applyTheming } from "./theme";

declare global {
  interface Window {
    profileList?: any[];
  }
}

function main() {
  // Apply theming as early as possible (buttons, accents)
  applyTheming();

  const profileList = window.profileList || [];
  const mount = document.getElementById("form");
  if (!mount) return;

  const root = createRoot(mount);
  root.render(
    <SpawnerFormProvider profileList={profileList}>
      <ProfileForm />
    </SpawnerFormProvider>
  );
}

main();

