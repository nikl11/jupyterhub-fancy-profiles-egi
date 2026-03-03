import { createRoot } from "react-dom/client";

import ProfileForm from "./ProfileForm";
import { SpawnerFormProvider } from "./state";
import { FormCacheProvider } from "./context/FormCache";
import { PermalinkProvider } from "./context/Permalink";

const mount = document.getElementById("form");

if (mount) {
  const root = createRoot(mount);
  root.render(
    <PermalinkProvider>
      <SpawnerFormProvider>
        <FormCacheProvider>
          <ProfileForm />
        </FormCacheProvider>
      </SpawnerFormProvider>
    </PermalinkProvider>,
  );
}
