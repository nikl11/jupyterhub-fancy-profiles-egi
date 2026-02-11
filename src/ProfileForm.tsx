import * as React from "react";
import ImageBuilder, { type BuildResult } from "./ImageBuilder";
import { useRepositoryField } from "./hooks/useRepositoryField";

export type Profile = {
  slug: string;
  display_name: string;
  description?: string;
  default?: boolean;
  profile_options?: unknown;
};

const BINDER_SLUG = "__build_your_own_image__";

type Props = {
  profileList: Profile[];
};

function pickDefaultProfile(profileList: Profile[]): Profile | null {
  if (!profileList.length) return null;
  return profileList.find((p) => p.default === true) ?? profileList[0];
}

export default function ProfileForm({ profileList }: Props) {
  const defaultProfile = React.useMemo(() => pickDefaultProfile(profileList), [profileList]);

  const [selectedSlug, setSelectedSlug] = React.useState<string>(
    defaultProfile?.slug ?? BINDER_SLUG,
  );

  const isBinderMode = selectedSlug === BINDER_SLUG;

  // Binder fields
  const [repoUrl, setRepoUrl] = React.useState<string>("");
  const { repo, setRepo } = useRepositoryField(repoUrl);
  const [gitRef, setGitRef] = React.useState<string>("main");
  const [fileToOpen, setFileToOpen] = React.useState<string>("");

  const [buildResult, setBuildResult] = React.useState<BuildResult | null>(null);

  const activeProfile = React.useMemo(() => {
    if (isBinderMode) return null;
    return profileList.find((p) => p.slug === selectedSlug) ?? defaultProfile;
  }, [defaultProfile, isBinderMode, profileList, selectedSlug]);

  const onSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBuildResult(null);
    setSelectedSlug(e.target.value);
  };

  if (!defaultProfile && !isBinderMode) {
    return (
      <div className="alert alert-warning">
        No profiles available. Check spawner profile_list configuration.
      </div>
    );
  }

  return (
    <div className="fp-page">
      <div className="fp-header">
        <h2 className="fp-title">Server Options</h2>
        <div className="fp-subtitle">
          Choose a predefined JupyterHub environment, or build your own image (Binder).
        </div>
      </div>

      <div className="fp-card">
        {/* This is the dropdown Jaromir wants as the "core component" */}
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
              value={selectedSlug}
              onChange={onSelect}
            >
              {profileList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.display_name}
                </option>
              ))}
              <option value={BINDER_SLUG}>Build your own image (Binder)</option>
            </select>

            {!isBinderMode && activeProfile?.description ? (
              <div className="form-text fp-help">{activeProfile.description}</div>
            ) : null}
            {isBinderMode ? (
              <div className="form-text fp-help">
                This will build an image via Binder and show the build log.
              </div>
            ) : null}
          </div>
        </div>

        {/* JupyterHub mode: we keep only ONE submit button (fix double Start/Launch) */}
        {!isBinderMode && activeProfile ? (
          <>
            {/* Hidden field submitted to JupyterHub */}
            <input type="radio" className="hidden" name="profile" value={activeProfile.slug} checked readOnly />

            <div className="fp-launch">
              <button className="btn btn-jupyter fp-launch-btn" type="submit">
                Launch
              </button>
            </div>
          </>
        ) : null}

        {/* Binder mode: repo/ref/file + build log */}
        {isBinderMode ? (
          <div className="fp-binder">
            <div className="fp-divider" />

            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-repo" className="form-label">
                  Repository (GitHub URL)
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-repo"
                  className="form-control"
                  placeholder="https://github.com/org/repo"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    // keep parsed repo in sync
                    setRepo(e.target.value);
                  }}
                />
                <div className="form-text fp-help">Example: https://github.com/jupyterhub/zero-to-jupyterhub-k8s</div>
              </div>
            </div>

            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-ref" className="form-label">
                  Ref (branch / tag / commit)
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-ref"
                  className="form-control"
                  placeholder="main"
                  value={gitRef}
                  onChange={(e) => setGitRef(e.target.value)}
                />
              </div>
            </div>

            <div className="fp-row">
              <div className="fp-label">
                <label htmlFor="fp-file" className="form-label">
                  File to open (optional)
                </label>
              </div>
              <div className="fp-control">
                <input
                  id="fp-file"
                  className="form-control"
                  placeholder="path/to/notebook.ipynb"
                  value={fileToOpen}
                  onChange={(e) => setFileToOpen(e.target.value)}
                />
              </div>
            </div>

            <ImageBuilder
              repo={repo}
              gitRef={gitRef}
              fileToOpen={fileToOpen}
              onBuilt={(res) => setBuildResult(res)}
            />

            {buildResult ? (
              <div className="alert alert-success fp-built">
                <div><strong>Build complete.</strong></div>
                <div className="fp-mono">image: {buildResult.imageName}</div>
                {buildResult.binderRef ? <div className="fp-mono">ref: {buildResult.binderRef}</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

