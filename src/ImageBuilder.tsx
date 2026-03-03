import * as React from "react";
import { useRepositoryField, RepoProvider } from "./hooks/useRepositoryField";

const PROVIDERS: Array<{ id: RepoProvider; label: string; hint: string }> = [
  { id: "github", label: "GitHubb", hint: "owner/repo" },
  { id: "gitlab", label: "GitLab", hint: "group/project" },
  { id: "gist", label: "Gist", hint: "username/gist-id or gist-id" },
  { id: "zenodo", label: "Zenodo", hint: "record id (e.g. 1234567)" },
  { id: "other", label: "Other", hint: "any identifier" },
];

export function ImageBuilder() {
  const repo = useRepositoryField();

  const providerMeta = React.useMemo(() => {
    return PROVIDERS.find((p) => p.id === repo.provider) ?? PROVIDERS[0];
  }, [repo.provider]);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h2 className="h4 mb-0">Repository</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Select a source and fill repository details (visual-only for now).
            </div>
          </div>
          <span className="badge text-bg-secondary">Preview</span>
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-3">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={repo.provider}
              onChange={(e) => repo.setProvider(e.target.value as RepoProvider)}
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
              value={repo.repo}
              onChange={(e) => repo.setRepo(e.target.value)}
              placeholder={providerMeta.hint}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="form-text">
              Example: <code>{providerMeta.hint}</code>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Ref</label>
            <input
              className="form-control"
              value={repo.ref}
              onChange={(e) => repo.setRef(e.target.value)}
              placeholder="branch / tag / commit"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="form-text">Optional.</div>
          </div>
        </div>

        <details className="mt-3">
          <summary className="text-muted">Advanced</summary>

          <div className="row g-2 mt-2">
            <div className="col-12 col-md-6">
              <label className="form-label">Subdirectory</label>
              <input
                className="form-control"
                value={repo.subdir}
                onChange={(e) => repo.setSubdir(e.target.value)}
                placeholder="path/inside/repo"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="form-text">Optional.</div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Build status</label>
              <div className="p-2 border rounded bg-body-tertiary">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">Not started</div>
                    <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                      Wiring to Binder build comes next.
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                    Build
                  </button>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

