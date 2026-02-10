import * as React from "react";
import { ImageBuilder } from "./ImageBuilder";
import "./form.css";

type Profile = {
  slug: string;
  display_name: string;
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

const PROVIDERS = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "gitea", label: "Gitea" },
  { value: "bitbucket", label: "Bitbucket" },
];

function getProfiles(): Profile[] {
  return Array.isArray(window.profileList) ? window.profileList : [];
}

export function ProfileForm() {
  const profiles = React.useMemo(() => getProfiles(), []);
  const defaultProfile = React.useMemo(() => {
    return profiles.find((p) => p.default === true) || profiles[0];
  }, [profiles]);

  const [mode, setMode] = React.useState<"profile" | "build">("profile");
  const [selectedSlug, setSelectedSlug] = React.useState<string>(
    defaultProfile?.slug || "",
  );

  // Binder-like fields (visual only for now)
  const [provider, setProvider] = React.useState<string>(PROVIDERS[0].value);
  const [repository, setRepository] = React.useState<string>("");
  const [ref, setRef] = React.useState<string>("");

  const activeProfile = React.useMemo(() => {
    if (!profiles.length) return undefined;
    return profiles.find((p) => p.slug === selectedSlug) || defaultProfile;
  }, [profiles, selectedSlug, defaultProfile]);

  if (!profiles.length) {
    return (
      <div className="alert alert-warning">
        No profiles available. window.profileList is missing or empty.
      </div>
    );
  }

  return (
    <div className="fp-page">
      <div className="fp-header">
        <div>
          <h2 className="fp-title">Server options</h2>
          <div className="fp-subtitle">
            Choose a prebuilt environment or build your own image.
          </div>
        </div>
      </div>

      {/* MODE SWITCH */}
      <div className="fp-card fp-card--switch">
        <div className="fp-switch">
          <label className="fp-switch-item">
            <input
              type="radio"
              name="fp-mode"
              checked={mode === "profile"}
              onChange={() => setMode("profile")}
            />
            <span>Use prebuilt environment</span>
          </label>

          <label className="fp-switch-item">
            <input
              type="radio"
              name="fp-mode"
              checked={mode === "build"}
              onChange={() => setMode("build")}
            />
            <span>Build your own image</span>
          </label>
        </div>
      </div>

      {/* BINDER SECTION */}
      <div className="fp-card">
        <div className="fp-section-title">Repository</div>

        <div className="fp-grid">
          <div className="fp-field">
            <label className="fp-label" htmlFor="fp-provider">
              Provider
            </label>
            <select
              id="fp-provider"
              className="form-select fp-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="fp-help">
              Visual only for now. Later this will map to Binder providers.
            </div>
          </div>

          <div className="fp-field">
            <label className="fp-label" htmlFor="fp-repository">
              Repository
            </label>
            <input
              id="fp-repository"
              className="form-control"
              placeholder="org/repo or full URL"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              autoComplete="off"
            />
            <div className="fp-help">
              Example: jupyterhub/jupyterhub or https://github.com/org/repo
            </div>
          </div>

          <div className="fp-field">
            <label className="fp-label" htmlFor="fp-ref">
              Ref (branch/tag/commit)
            </label>
            <input
              id="fp-ref"
              className="form-control"
              placeholder="main / v1.2.3 / a1b2c3d"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              autoComplete="off"
            />
            <div className="fp-help">
              Optional. If empty, default branch will be used.
            </div>
          </div>
        </div>

        {mode === "build" ? (
          <div className="fp-build">
            <ImageBuilder />
          </div>
        ) : null}
      </div>

      {/* JUPYTERHUB PROFILE SECTION */}
      <div className="fp-card">
        <div className="fp-section-title">Environment</div>

        {/* Hidden field submitted to JupyterHub */}
        <input
          type="radio"
          className="hidden"
          name="profile"
          value={activeProfile?.slug || ""}
          checked
          readOnly
        />

        <div className="fp-row">
          <div className="fp-labelcol">
            <label htmlFor="fp-server-option" className="fp-label">
              Instance size
            </label>
          </div>
          <div className="fp-controlcol">
            <select
              id="fp-server-option"
              className="form-select fp-select"
              value={activeProfile?.slug || ""}
              onChange={(e) => setSelectedSlug(e.target.value)}
              disabled={mode === "build"}
              title={mode === "build" ? "Disabled in build mode" : undefined}
            >
              {profiles.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.display_name}
                </option>
              ))}
            </select>
            {activeProfile?.description ? (
              <div className="fp-help">{activeProfile.description}</div>
            ) : null}
            {mode === "build" ? (
              <div className="fp-help">
                In build mode, instance selection will be decided later.
              </div>
            ) : null}
          </div>
        </div>

        <div className="fp-launch">
          <button className="btn btn-jupyter fp-launch-btn" type="submit">
            Launch
          </button>
        </div>

        {/* Debug-only (safe to remove later) */}
        <div className="fp-debug">
          <span className="fp-debug-pill">provider={provider}</span>
          <span className="fp-debug-pill">repo={repository || "∅"}</span>
          <span className="fp-debug-pill">ref={ref || "∅"}</span>
          <span className="fp-debug-pill">mode={mode}</span>
          <span className="fp-debug-pill">
            profile={activeProfile?.slug || "∅"}
          </span>
        </div>
      </div>
    </div>
  );
}
