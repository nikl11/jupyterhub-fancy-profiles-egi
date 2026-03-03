import * as React from "react";
import { ImageBuilder } from "./ImageBuilder";

type Profile = {
  slug: string;
  display_name: string;
  description?: string;
  default?: boolean;
  profile_options?: Record<string, any>;
};

type Props = {
  profileList: Profile[];
};

type Mode = "prebuilt" | "build";

export default function App({ profileList }: Props) {
  const defaultProfile =
    profileList.find((p) => p.default === true) || profileList[0];

  const [selectedSlug, setSelectedSlug] = React.useState<string>(
    defaultProfile?.slug ?? "",
  );

  const [mode, setMode] = React.useState<Mode>("prebuilt");

  const selectedProfile = React.useMemo(() => {
    return profileList.find((p) => p.slug === selectedSlug) || defaultProfile;
  }, [profileList, selectedSlug, defaultProfile]);

  if (!profileList || profileList.length === 0) {
    return (
      <div className="alert alert-warning">
        No profiles available. Check spawner profile_list configuration.
      </div>
    );
  }

  if (!selectedProfile) {
    return (
      <div className="alert alert-warning">
        Selected profile not found.
      </div>
    );
  }

  return (
    <div className="jhfp-page">
      <div className="jhfp-header">
        <h2 className="jhfp-title">Server Options</h2>
        <div className="text-muted" style={{ fontSize: "0.95rem" }}>
          Choose resources and optionally build your own image.
        </div>
      </div>

      <div className="jhfp-card">
        <div className="jhfp-mode" role="tablist" aria-label="Mode switch">
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${mode === "prebuilt" ? "active" : ""}`}
            onClick={() => setMode("prebuilt")}
          >
            Use prebuilt environment
          </button>

          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${mode === "build" ? "active" : ""}`}
            onClick={() => setMode("build")}
          >
            Build your own image
          </button>
        </div>

        <div className="jhfp-grid">
          {/* LEFT: core component - server options (profiles) */}
          <div>
            <div className="mb-2 fw-semibold">Environment size</div>

            <div className="jhfp-profile-list">
              {profileList.map((p) => {
                const active = p.slug === selectedProfile.slug;
                return (
                  <div
                    key={p.slug}
                    className={`jhfp-profile-item ${active ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSlug(p.slug)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedSlug(p.slug);
                    }}
                    aria-pressed={active}
                  >
                    <p className="jhfp-profile-name">{p.display_name}</p>
                    <p className="jhfp-profile-desc">{p.description || " "}</p>
                  </div>
                );
              })}
            </div>

            {/* Hidden field that is actually submitted to JupyterHub */}
            <input
              type="radio"
              className="hidden"
              name="profile"
              value={selectedProfile.slug}
              checked
              readOnly
            />
          </div>

          {/* RIGHT: mode-dependent content */}
          <div>
            {mode === "prebuilt" ? (
              <div>
                <div className="mb-2 fw-semibold">Summary</div>

                <div className="p-3 border rounded bg-body-tertiary">
                  <div className="fw-semibold">{selectedProfile.display_name}</div>
                  <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                    {selectedProfile.description || "No description."}
                  </div>

                  <hr />

                  <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Profile options wiring comes next (dynamic form per profile_options).
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 fw-semibold">Build your own image</div>
                <ImageBuilder />
              </div>
            )}

            <div className="jhfp-footer">
              <button className="btn jhfp-primary-btn" type="submit">
                Launch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
