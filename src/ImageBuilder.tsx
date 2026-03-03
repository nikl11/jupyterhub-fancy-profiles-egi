import * as React from "react";
import { useRepositoryField, RepoProvider } from "./hooks/useRepositoryField";

const PROVIDERS: Array<{ id: RepoProvider; label: string; hint: string }> = [
  { id: "github", label: "GitHub", hint: "owner/repo" },
  { id: "gitlab", label: "GitLab", hint: "group/project" },
  { id: "gist", label: "Gist", hint: "username/gist-id or gist-id" },
  { id: "zenodo", label: "Zenodo", hint: "record id (e.g. 1234567)" },
  { id: "other", label: "Other (git URL)", hint: "https://host/org/repo.git" },
];

function toBinderProvider(p: RepoProvider): string {
  // BinderHub build endpoint provider codes
  // gh, gl, gist, zenodo, git
  switch (p) {
    case "github":
      return "gh";
    case "gitlab":
      return "gl";
    case "gist":
      return "gist";
    case "zenodo":
      return "zenodo";
    case "other":
    default:
      return "git";
  }
}

function joinUrl(base: string, path: string) {
  if (base.endsWith("/")) base = base.slice(0, -1);
  if (!path.startsWith("/")) path = "/" + path;
  return base + path;
}

export function ImageBuilder() {
  const repo = useRepositoryField();

  const providerMeta = React.useMemo(() => {
    return PROVIDERS.find((p) => p.id === repo.provider) ?? PROVIDERS[0];
  }, [repo.provider]);

  const [status, setStatus] = React.useState<"idle" | "building" | "built" | "failed">("idle");
  const [error, setError] = React.useState<string>("");
  const [logs, setLogs] = React.useState<string>("");
  const [imageName, setImageName] = React.useState<string>("");

  const esRef = React.useRef<EventSource | null>(null);
  const logRef = React.useRef<HTMLPreElement | null>(null);

  React.useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  React.useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  function appendLog(line: string) {
    setLogs((prev) => (prev ? prev + "\n" + line : line));
  }

  function buildUrl(): string {
    const binderProvider = toBinderProvider(repo.provider);

    const rawRepo = repo.repo.trim();
    const ref = (repo.ref || "HEAD").trim();
    const subdir = repo.subdir.trim();

    if (!rawRepo) {
      throw new Error("Repository is required.");
    }

    // JupyterHub-service proxied Binder build endpoint:
    //   /services/binder/build/<provider>/<spec>
    //
    // For gh/gl: <org>/<repo>/<ref>
    // For gist: <username>/<id>/<ref> or <id>/<ref>
    // For zenodo: <recordid>
    // For git: <url-encoded-git-url> (optional ref via ?ref=)
    let specPath = "";

    if (binderProvider === "git") {
      specPath = encodeURIComponent(rawRepo);
    } else if (binderProvider === "zenodo") {
      specPath = encodeURIComponent(rawRepo);
    } else {
      const parts = rawRepo.split("/").filter(Boolean).map(encodeURIComponent);
      const refPart = encodeURIComponent(ref);
      specPath = [...parts, refPart].join("/");
    }

    const params = new URLSearchParams();
    if (subdir) params.set("subdir", subdir);
    if (binderProvider === "git" && repo.ref.trim()) params.set("ref", repo.ref.trim());

    const base = "/services/binder";
    const url = joinUrl(base, `/build/${binderProvider}/${specPath}`);
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  function stopStream() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  function startBuild() {
    setError("");
    setLogs("");
    setImageName("");
    setStatus("building");

    let url: string;
    try {
      url = buildUrl();
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    appendLog(`Connecting to: ${url}`);

    stopStream();

    // Important: EventSource must carry cookies (Hub auth). Most browsers do for same-origin.
    // We still pass withCredentials for completeness.
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (ev) => {
      if (!ev.data) return;

      let payload: any;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        appendLog(String(ev.data));
        return;
      }

      const phase = payload?.phase ? String(payload.phase) : "";
      const msg = payload?.message ?? payload?.log ?? payload?.status ?? payload?.error ?? "";

      if (phase) {
        appendLog(`[${phase}] ${String(msg ?? "").trim()}`);
      } else if (msg) {
        appendLog(String(msg));
      } else {
        appendLog(ev.data);
      }

      if (payload?.imageName) {
        setImageName(String(payload.imageName));
      }

      if (phase === "failed") {
        setStatus("failed");
        setError(String(payload?.message ?? payload?.error ?? "Build failed"));
        stopStream();
        return;
      }

      // Binder typically sends "ready" when the build is done (with imageName)
      if (phase === "ready" || phase === "built") {
        if (payload?.imageName) {
          setImageName(String(payload.imageName));
        }
        setStatus("built");
        stopStream();
        return;
      }
    };

    es.onerror = () => {
      // Sometimes fires on normal close. Only mark as failed if we don't already have an image.
      if (imageName) return;
      setStatus("failed");
      setError("Connection error while streaming build logs.");
      stopStream();
    };
  }

  const isBuilding = status === "building";

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h2 className="h4 mb-0">Repository</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Build an image using BinderHub and stream logs below.
            </div>
          </div>
          <span className="badge text-bg-secondary">
            {status === "idle" ? "Idle" : status === "building" ? "Building" : status === "built" ? "Built" : "Failed"}
          </span>
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-3">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={repo.provider}
              onChange={(e) => repo.setProvider(e.target.value as RepoProvider)}
              disabled={isBuilding}
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
              disabled={isBuilding}
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
              disabled={isBuilding}
            />
            <div className="form-text">Optional (defaults to HEAD).</div>
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
                disabled={isBuilding}
              />
              <div className="form-text">Optional.</div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Build</label>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={startBuild}
                  disabled={isBuilding}
                >
                  {isBuilding ? "Building..." : "Build image"}
                </button>
                {isBuilding ? (
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={stopStream}>
                    Stop stream
                  </button>
                ) : null}
                {imageName ? <span className="badge text-bg-success">imageName set</span> : null}
              </div>

              {error ? (
                <div className="mt-2 alert alert-danger py-2 mb-0">{error}</div>
              ) : null}

              <div className="mt-2">
                <pre
                  ref={logRef}
                  className="p-2 border rounded bg-body-tertiary mb-0"
                  style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}
                >
{logs || "Logs will appear here once build starts."}
                </pre>
              </div>

              {imageName ? (
                <div className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>
                  Built image: <code>{imageName}</code>
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
