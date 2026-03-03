import * as React from "react";
import { useBinderBuild } from "./ImageBuilder";
import { useRepositoryField, RepoProvider } from "./hooks/useRepositoryField";

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
};

type Props = {
  profileList: Profile[];
};

function ProfileCards(props: {
  profileList: Profile[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  const { profileList, selectedSlug, onSelect } = props;

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h2 className="h4 mb-0">Environment</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Select an environment profile.
            </div>
          </div>
        </div>

        <div className="d-grid gap-2">
          {profileList.map((p) => {
            const title = p.display_name ?? p.slug;
            const desc = p.description ?? "";
            const active = p.slug === selectedSlug;

            return (
              <label
                key={p.slug}
                htmlFor={`profile-${p.slug}`}
                className={`border rounded p-3 ${active ? "border-primary" : ""}`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold">{title}</div>
                    {desc ? (
                      <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                        {desc}
                      </div>
                    ) : null}
                  </div>

                  <input
                    id={`profile-${p.slug}`}
                    type="radio"
                    name="select-profile"
                    value={p.slug}
                    checked={active}
                    onChange={() => onSelect(p.slug)}
                  />
                </div>
              </label>
            );
          })}
        </div>

        {/* Field that JupyterHub uses */}
        <input type="hidden" name="profile" value={selectedSlug} />
      </div>
    </div>
  );
}

function RepositoryForm(props: {
  repoState: ReturnType<typeof useRepositoryField>;
  disabled: boolean;
}) {
  const { repoState, disabled } = props;

  const PROVIDERS: Array<{ id: RepoProvider; label: string; hint: string }> = [
    { id: "github", label: "GitHub", hint: "owner/repo or https://github.com/owner/repo" },
    { id: "gitlab", label: "GitLab", hint: "group/project or https://gitlab.com/group/project" },
    { id: "gist", label: "Gist", hint: "username/gist-id or gist-id" },
    { id: "zenodo", label: "Zenodo", hint: "record id (e.g. 1234567)" },
    { id: "other", label: "Other (git URL)", hint: "https://host/org/repo.git" },
  ];

  const providerMeta = React.useMemo(() => {
    return PROVIDERS.find((p) => p.id === repoState.provider) ?? PROVIDERS[0];
  }, [repoState.provider]);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h3 className="h5 mb-2">Repository</h3>

        <div className="row g-2">
          <div className="col-12 col-md-3">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={repoState.provider}
              onChange={(e) => repoState.setProvider(e.target.value as RepoProvider)}
              disabled={disabled}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Repository</label>
            <input
              className="form-control"
              value={repoState.repo}
              onChange={(e) => repoState.setRepo(e.target.value)}
              placeholder={providerMeta.hint}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
            <div className="form-text">
              Example: <code>{providerMeta.hint}</code>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Ref</label>
            <input
              className="form-control"
              value={repoState.ref}
              onChange={(e) => repoState.setRef(e.target.value)}
              placeholder="branch / tag / commit"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
            <div className="form-text">Optional (defaults to HEAD).</div>
          </div>
        </div>

        <div className="row g-2 mt-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Subdirectory (optional)</label>
            <input
              className="form-control"
              value={repoState.subdir}
              onChange={(e) => repoState.setSubdir(e.target.value)}
              placeholder="path/inside/repo"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildAndLaunch(props: {
  buildState: ReturnType<typeof useBinderBuild>[0];
  buildControls: ReturnType<typeof useBinderBuild>[1];
  repo: { provider: RepoProvider; repo: string; ref: string; subdir: string };
}) {
  const { buildState, buildControls, repo } = props;
  const isBuilding = buildState.status === "building";

  const logRef = React.useRef<HTMLPreElement | null>(null);

  React.useEffect(() => {
    if (!buildState.logsOpen) return;
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [buildState.logs, buildState.logsOpen]);

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="h5 mb-2">Build &amp; launch</h3>

        {/* Removed: "Buttons below are visual-only for now." */}

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              buildControls.startBuild({
                provider: repo.provider,
                repo: repo.repo,
                ref: repo.ref,
                subdir: repo.subdir,
              })
            }
            disabled={isBuilding}
          >
            {isBuilding ? "Building..." : "Build image"}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={buildControls.openLogs}
          >
            Open logs
          </button>

          {buildState.imageName ? (
            <span className="badge text-bg-success">imageName set</span>
          ) : null}
        </div>

        {buildState.error ? (
          <div className="mt-2 alert alert-danger py-2 mb-0">{buildState.error}</div>
        ) : null}

        {buildState.logsOpen ? (
          <div className="mt-2">
            <pre
              ref={logRef}
              className="p-2 border rounded bg-body-tertiary mb-0"
              style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}
            >
{buildState.logs || "Logs will appear here once build starts."}
            </pre>

            {buildState.imageName ? (
              <div className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>
                Built image: <code>{buildState.imageName}</code>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* The actual spawn (submit) button stays elsewhere in your form/page */}
      </div>
    </div>
  );
}

export function App(props: Props) {
  const list = props.profileList ?? [];
  const initial =
    list.find((p) => p.default === true)?.slug ?? list[0]?.slug ?? "default";

  const [selectedSlug, setSelectedSlug] = React.useState<string>(initial);

  // Repository fields live in ProfileForm (so Build & launch buttons here can use them).
  const repoState = useRepositoryField();

  // Binder build logic (SSE streaming) – UI is in this file.
  const [buildState, buildControls] = useBinderBuild();

  return (
    <div>
      <ProfileCards
        profileList={
          list.length
            ? list
            : [{ slug: "default", display_name: "Default", default: true }]
        }
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
      />

      <RepositoryForm repoState={repoState} disabled={buildState.status === "building"} />

      <BuildAndLaunch
        buildState={buildState}
        buildControls={buildControls}
        repo={{
          provider: repoState.provider,
          repo: repoState.repo,
          ref: repoState.ref,
          subdir: repoState.subdir,
        }}
      />

      {/* Keep your existing Start/submit button wherever it already is in your UI */}
    </div>
  );
}
