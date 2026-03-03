import * as React from "react";
import { RepoProvider } from "./hooks/useRepositoryField";

export type BinderBuildStatus = "idle" | "building" | "built" | "failed";

export type BinderBuildState = {
  status: BinderBuildStatus;
  error: string;
  logs: string;
  imageName: string;
  logsOpen: boolean;
};

export type BinderBuildControls = {
  startBuild: (args: {
    provider: RepoProvider;
    repo: string;
    ref?: string;
    subdir?: string;
  }) => void;
  openLogs: () => void;
  closeLogs: () => void;
  toggleLogs: () => void;
  stopStream: () => void;
  clear: () => void;
};

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

function stripTrailingGit(s: string) {
  return s.endsWith(".git") ? s.slice(0, -4) : s;
}

function normalizeRepoInput(provider: RepoProvider, input: string): string {
  const raw = input.trim();
  if (!raw) return raw;

  // Allow pasting full URLs for GitHub/GitLab/Gist and normalize to the expected spec.
  if (provider === "github") {
    const m = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);
    if (m) return `${m[1]}/${stripTrailingGit(m[2])}`;
  }

  if (provider === "gitlab") {
    const m = raw.match(/^https?:\/\/gitlab\.[^/]+\/(.+)$/i);
    if (m) {
      const path = stripTrailingGit(m[1]).replace(/\/+$/, "");
      return path;
    }
  }

  if (provider === "gist") {
    const m = raw.match(/^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)(?:\/.*)?$/i);
    if (m) return `${m[1]}/${m[2]}`;
  }

  return raw;
}

function buildBinderUrl(args: {
  provider: RepoProvider;
  repo: string;
  ref?: string;
  subdir?: string;
}): string {
  const binderProvider = toBinderProvider(args.provider);

  const normalizedRepo = normalizeRepoInput(args.provider, args.repo);
  const ref = (args.ref && args.ref.trim()) ? args.ref.trim() : "HEAD";
  const subdir = (args.subdir || "").trim();

  if (!normalizedRepo) {
    throw new Error("Repository is required.");
  }

  // /services/binder/build/<provider>/<spec>
  let specPath = "";

  if (binderProvider === "git") {
    // For git provider, Binder expects a URL-encoded git URL as a single segment.
    specPath = encodeURIComponent(normalizedRepo);
  } else if (binderProvider === "zenodo") {
    // For zenodo, it's typically a record id.
    specPath = encodeURIComponent(normalizedRepo);
  } else {
    // For gh/gl/gist: keep slashes; encode segments.
    const parts = normalizedRepo.split("/").filter(Boolean).map(encodeURIComponent);
    const refPart = encodeURIComponent(ref);
    specPath = [...parts, refPart].join("/");
  }

  const params = new URLSearchParams();
  if (subdir) params.set("subdir", subdir);
  if (binderProvider === "git" && args.ref && args.ref.trim()) params.set("ref", args.ref.trim());

  const base = "/services/binder";
  const url = joinUrl(base, `/build/${binderProvider}/${specPath}`);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export function useBinderBuild(): [BinderBuildState, BinderBuildControls] {
  const [status, setStatus] = React.useState<BinderBuildStatus>("idle");
  const [error, setError] = React.useState<string>("");
  const [logs, setLogs] = React.useState<string>("");
  const [imageName, setImageName] = React.useState<string>("");
  const [logsOpen, setLogsOpen] = React.useState<boolean>(false);

  const esRef = React.useRef<EventSource | null>(null);

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

  function stopStream() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  function clear() {
    setError("");
    setLogs("");
    setImageName("");
    setStatus("idle");
  }

  function startBuild(args: { provider: RepoProvider; repo: string; ref?: string; subdir?: string }) {
    setError("");
    setLogs("");
    setImageName("");
    setStatus("building");
    setLogsOpen(true);

    let url: string;
    try {
      url = buildBinderUrl(args);
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    appendLog(`Connecting to: ${url}`);

    stopStream();

    // SSE must carry Hub auth cookies. Same-origin usually does; withCredentials is best-effort.
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

      // Binder typically ends with "ready" (and includes imageName).
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
      // Sometimes fires on normal close. Mark failed only if we don't already have an image.
      if (imageName) return;
      setStatus("failed");
      setError("Connection error while streaming build logs.");
      stopStream();
    };
  }

  const state: BinderBuildState = { status, error, logs, imageName, logsOpen };
  const controls: BinderBuildControls = {
    startBuild,
    openLogs: () => setLogsOpen(true),
    closeLogs: () => setLogsOpen(false),
    toggleLogs: () => setLogsOpen((v) => !v),
    stopStream,
    clear,
  };

  return [state, controls];
}
