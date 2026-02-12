// src/ProfileForm.tsx
import * as React from "react";
import ImageBuilder from "./ImageBuilder";
import { useRepositoryField } from "./hooks/useRepositoryField";

type Profile = {
  slug: string;
  display_name: string;
  description?: string;
  default?: boolean;
  profile_options?: Record<string, unknown>;
};

type Props = {
  profileList: Profile[];
};

const BINDER_SLUG = "build-your-own-image";

export default function ProfileForm({ profileList }: Props) {
  const defaultProfile = React.useMemo(() => {
    return profileList.find((p) => p.default === true) || profileList[0];
  }, [profileList]);

  const [activeSlug, setActiveSlug] = React.useState<string>(
    defaultProfile?.slug || "",
  );

  const active = React.useMemo(() => {
    return profileList.find((p) => p.slug === activeSlug) || defaultProfile;
  }, [profileList, activeSlug, defaultProfile]);

  const hasOptions = Boolean(active?.profile_options);

  // Binder fields (UI-only for now; wiring will follow)
  const repoField = useRepositoryField({
    defaultProvider: "gh",
    defaultRepo: "",
    defaultRef: "HEAD",
  });

  const [fileToOpen, setFileToOpen] = React.useState<string>("");

  const onBuilt = React.useCallback((res: { imageName: string; binderRef?: string }) => {
    // UI-only: keep this hook for later wiring
    // eslint-disable-next-line no-console
    console.log("Built:", res);
  }, []);

  if (!active) {
    return (
      <div className="alert alert-warning">
        No profiles available. Check spawner profile_list configuration.
      </div>
    );
  }

  const isBinder = active.slug === BINDER_SLUG;

  return (
    <div className="fp-page">
      <div className="fp-header">
        <h2 className="fp-title">Choose Your Environment</h2>
      </div>

      <div className="fp-card">
        {/* Hidden field actually submitted to JupyterHub */}
        <input type="radio" className="hidden" name="profile" value={active.slug} checked readOnly />

        {/* Profile selector */}
        <div className="fp-row">
          <div className="fp-label">
            <label htmlFor="fp-server-option" className="form-label">
              Server option
            </label>
          </div>

          <div className="fp-control">
            <select
              id="fp-server-option"
              className="form-select fp-select"
              value={active.slug}
              onChange={(e) => setActiveSlug(e.target.value)}
            >
              {profileList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.display_name}
                </option>
              ))}
            </select>

            {active.description ? (
              <div className="form-text fp-help">{active.description}</div>
            ) : null}
          </div>
        </div>

        {/* Binder UI */}
        {isBinder ? (
          <div className="fp-binder">
            <div className="fp-subtitle">Build your own image</div>

            {/* Provider */}
            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-provider" className="form-label">
                  Provider
                </label>
              </div>
              <div className="fp-control">
                <select
                  id="fp-provider"
                  className="form-select fp-select"
                  value={repoField.provider}
                  onChange={(e) => repoField.setProvider(e.target.value as "gh" | "gl")}
                >
                  <option value="gh">GitHub</option>
                  <option value="gl">GitLab</option>
                </select>
                <div className="form-text fp-help">
                  Select where the repository lives.
                </div>
              </div>
            </div>

            {/* Repository */}
            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-repo" className="form-label">
                  Repository
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-repo"
                  className="form-control fp-input"
                  placeholder={repoField.provider === "gh" ? "org/repo" : "group/project"}
                  value={repoField.repo}
                  onChange={(e) => repoField.setRepo(e.target.value)}
                />
                <div className="form-text fp-help">
                  Use the short form (example: <code>org/repo</code>).
                </div>
              </div>
            </div>

            {/* Ref */}
            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-ref" className="form-label">
                  Ref (branch/tag/commit)
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-ref"
                  className="form-control fp-input"
                  placeholder="HEAD"
                  value={repoField.ref}
                  onChange={(e) => repoField.setRef(e.target.value)}
                />
              </div>
            </div>

            {/* Subdir */}
            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-subdir" className="form-label">
                  Subdir (optional)
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-subdir"
                  className="form-control fp-input"
                  placeholder="path/inside/repo"
                  value={repoField.subdir}
                  onChange={(e) => repoField.setSubdir(e.target.value)}
                />
              </div>
            </div>

            {/* File to open */}
            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-file" className="form-label">
                  File to open (optional)
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-file"
                  className="form-control fp-input"
                  placeholder="notebooks/demo.ipynb"
                  value={fileToOpen}
                  onChange={(e) => setFileToOpen(e.target.value)}
                />
              </div>
            </div>

            {/* Build + logs */}
            <ImageBuilder
              provider={repoField.provider}
              repo={repoField.repo}
              gitRef={repoField.ref}
              subdir={repoField.subdir}
              fileToOpen={fileToOpen}
              onBuilt={onBuilt}
            />
          </div>
        ) : null}

        {/* Options placeholder (kept) */}
        {hasOptions ? (
          <div className="fp-options">
            <div className="fp-subtitle">Options</div>
            <div className="form-text fp-help">
              Options rendering will be wired next.
            </div>
          </div>
        ) : null}

        <div className="fp-launch">
          <button className="btn btn-jupyter fp-launch-btn" type="submit">
            Launch
          </button>
        </div>
      </div>
    </div>
  );
}
