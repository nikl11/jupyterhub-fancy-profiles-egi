import * as React from "react";
import { useRepositoryField, RepoProvider } from "./hooks/useRepositoryField";

type ImageBuilderProps = {
  title?: string;
};

const PROVIDER_OPTIONS: Array<{ value: RepoProvider; label: string; placeholder: string }> = [
  { value: "github", label: "GitHub", placeholder: "org/repo (e.g. nikl11/jupyterhub-fancy-profiles-egi)" },
  { value: "gitlab", label: "GitLab", placeholder: "group/repo or full URL" },
  { value: "gist", label: "Gist", placeholder: "username/gist-id or full URL" },
  { value: "zenodo", label: "Zenodo", placeholder: "record id or DOI" },
  { value: "other", label: "Other", placeholder: "full git URL" },
];

function providerPlaceholder(provider: RepoProvider): string {
  const found = PROVIDER_OPTIONS.find((p) => p.value === provider);
  return found ? found.placeholder : "repository";
}

export function ImageBuilder(props: ImageBuilderProps) {
  const { title } = props;

  const repoForm = useRepositoryField();
  const [open, setOpen] = React.useState<boolean>(false);

  // Optional "file to open" (Binder-style)
  const [filepath, setFilepath] = React.useState<string>("");

  // Placeholder build state / logs (wired later)
  const [isBuilding, setIsBuilding] = React.useState<boolean>(false);
  const [buildLog, setBuildLog] = React.useState<string>("");

  const terminalRef = React.useRef<HTMLPreElement | null>(null);

  React.useEffect(() => {
    if (!terminalRef.current) return;
    // Keep terminal scrolled to bottom when logs change
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [buildLog]);

  function appendLog(line: string) {
    setBuildLog((prev) => (prev ? `${prev}\n${line}` : line));
  }

  function handleFakeBuild() {
    // UI-only for now (we will wire binder build later)
    setIsBuilding(true);
    setBuildLog("");
    appendLog("Starting build (UI-only placeholder)...");
    appendLog(`Provider: ${repoForm.provider}`);
    appendLog(`Repository: ${repoForm.repo || "(empty)"}`);
    appendLog(`Ref: ${repoForm.ref || "(default)"}`);
    appendLog(`Subdir: ${repoForm.subdir || "(none)"}`);
    appendLog(`File to open: ${filepath || "(none)"}`);
    appendLog("");
    appendLog("TODO: Wire BinderHub build + stream logs.");
    setTimeout(() => {
      appendLog("Done (placeholder).");
      setIsBuilding(false);
    }, 600);
  }

  return (
    <div className="fp-options-block">
      <div className="fp-options-header">
        <div className="fp-options-title">{title ?? "Options"}</div>
        <div className="fp-options-subtitle">Options will be wired next.</div>
      </div>

      <div className="fp-binder-block">
        <div className="fp-binder-head">
          <div className="fp-binder-title">Build your own image (Binder)</div>
          <button
            type="button"
            className="btn btn-default fp-binder-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>

        {open ? (
          <div className="fp-binder-body">
            <div className="fp-grid">
              <div className="fp-field">
                <label className="form-label" htmlFor="fp-provider">
                  Provider
                </label>
                <select
                  id="fp-provider"
                  className="form-select"
                  value={repoForm.provider}
                  onChange={(e) => repoForm.setProvider(e.target.value as RepoProvider)}
                  disabled={isBuilding}
                >
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  Select where the repo lives. We will map this to BinderHub build endpoints later.
                </div>
              </div>

              <div className="fp-field">
                <label className="form-label" htmlFor="fp-repo">
                  Repository
                </label>
                <input
                  id="fp-repo"
                  className="form-control"
                  value={repoForm.repo}
                  onChange={(e) => repoForm.setRepo(e.target.value)}
                  placeholder={providerPlaceholder(repoForm.provider)}
                  disabled={isBuilding}
                />
              </div>

              <div className="fp-field">
                <label className="form-label" htmlFor="fp-ref">
                  Ref (branch / tag / commit)
                </label>
                <input
                  id="fp-ref"
                  className="form-control"
                  value={repoForm.ref}
                  onChange={(e) => repoForm.setRef(e.target.value)}
                  placeholder="main"
                  disabled={isBuilding}
                />
              </div>

              <div className="fp-field">
                <label className="form-label" htmlFor="fp-subdir">
                  Subdir (optional)
                </label>
                <input
                  id="fp-subdir"
                  className="form-control"
                  value={repoForm.subdir}
                  onChange={(e) => repoForm.setSubdir(e.target.value)}
                  placeholder="path/inside/repo"
                  disabled={isBuilding}
                />
              </div>

              <div className="fp-field">
                <label className="form-label" htmlFor="fp-filepath">
                  File to open (optional)
                </label>
                <input
                  id="fp-filepath"
                  className="form-control"
                  value={filepath}
                  onChange={(e) => setFilepath(e.target.value)}
                  placeholder="notebooks/demo.ipynb"
                  disabled={isBuilding}
                />
              </div>
            </div>

            <div className="fp-binder-actions">
              <button
                type="button"
                className="btn btn-jupyter fp-build-btn"
                onClick={handleFakeBuild}
                disabled={isBuilding}
              >
                {isBuilding ? "Building..." : "Build image"}
              </button>

              <div className="fp-binder-hint">
                For now this only prints parameters and a placeholder log. Next step: wire BinderHub build + log streaming.
              </div>
            </div>

            <div className="fp-terminal-wrap">
              <div className="fp-terminal-title">Build log</div>
              <pre ref={terminalRef} className="fp-terminal" aria-label="Build log">
                {buildLog || "No logs yet."}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
