import * as React from "react";
import { RepoProvider } from "./hooks/useRepositoryField";

const TOKEN_KEY = "jupytherhub-build-token";

export type BinderBuildArgs = {
  provider: RepoProvider;
  repo: string;
  ref: string;
  subdir: string;
};

export type BinderBuildState = {
  status: "idle" | "building" | "done" | "error";
  logs: string;
  logsOpen: boolean;
  error: string | null;
  imageName: string | null;
};

export type BinderBuildControls = {
  startBuild: (args: BinderBuildArgs) => void;
  toggleLogs: () => void;
  openLogs: () => void;
  closeLogs: () => void;
  reset: () => void;
};

async function getApiToken() {
  const xsrfToken = (`; ${document.cookie}`).split("; _xsrf=").pop()?.split(";")[0] ?? "";

  const userResponse = await fetch(`/hub/api/user?_xsrf=${xsrfToken}`, {
    credentials: "include",
  });
  if (!userResponse.ok) {
    throw new Error(`Failed to get JupyterHub user: HTTP ${userResponse.status}`);
  }

  const { name } = await userResponse.json();

  const existingToken = localStorage.getItem(TOKEN_KEY);
  if (existingToken) {
    const { id, expires_at, token } = JSON.parse(existingToken);
    const expiryDate = Date.parse(expires_at);
    const isExpired = expiryDate < new Date().getTime();

    if (isExpired) {
      localStorage.removeItem(TOKEN_KEY);
      await fetch(`/hub/api/users/${name}/tokens/${id}?_xsrf=${xsrfToken}`, {
        method: "DELETE",
        credentials: "include",
      });
    } else {
      return token as string;
    }
  }

  const tokenResponse = await fetch(`/hub/api/users/${name}/tokens?_xsrf=${xsrfToken}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      expires_in: 3600,
      note: "Created by Fancy Profiles for Build your Own Image",
    }),
    credentials: "include",
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to create JupyterHub API token: HTTP ${tokenResponse.status}`);
  }

  const res = await tokenResponse.json();
  localStorage.setItem(TOKEN_KEY, JSON.stringify(res));
  return res.token as string;
}

function safeTrim(s: string) {
  return (s ?? "").trim();
}

function stripTrailingSlash(s: string) {
  return s.replace(/\/+$/, "");
}

function stripGitSuffix(s: string) {
  return s.replace(/\.git$/i, "");
}

function tryParseUrl(s: string): URL | null {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

function normalizeGithub(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) {
    const parts = raw.split("/").filter(Boolean);
    if (parts.length >= 2) return { spec: `${parts[0]}/${stripGitSuffix(parts[1])}` };
    return { spec: raw };
  }

  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length >= 2) return { spec: `${parts[0]}/${stripGitSuffix(parts[1])}` };
  return { spec: raw };
}

function normalizeGitlab(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) {
    return { spec: stripGitSuffix(raw.replace(/^\/+/, "")) };
  }

  const parts = u.pathname.split("/").filter(Boolean);
  const dashIdx = parts.indexOf("-");
  const useful = dashIdx >= 0 ? parts.slice(0, dashIdx) : parts;
  const cleaned = useful.map((p) => stripGitSuffix(p)).join("/");
  return { spec: cleaned };
}

function normalizeGist(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) {
    const parts = raw.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? raw;
    return { spec: last };
  }

  const parts = u.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? raw;
  return { spec: last };
}

function normalizeZenodo(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  const candidate = u
    ? stripTrailingSlash(
        `${u.host}${u.pathname}`.replace(/^doi\.org\//i, "").replace(/^dx\.doi\.org\//i, "")
      )
    : raw;

  const doiMatch = candidate.match(/(10\.\d+\/zenodo\.\d+)/i);
  if (doiMatch) return { spec: doiMatch[1] };

  const direct = raw.match(/(10\.\d+\/zenodo\.\d+)/i);
  if (direct) return { spec: direct[1] };

  return { spec: raw };
}

function normalizeFigshare(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (u) {
    const host = u.host.toLowerCase();
    if (host.includes("doi.org") || host.includes("dx.doi.org")) {
      const m = u.pathname.match(/(10\.\d+\/.+)/);
      if (m) return { spec: m[1].replace(/^\/+/, "") };
    }
  }

  const doi = raw.match(/(10\.\d+\/.+)/);
  if (doi) return { spec: doi[1] };

  return { spec: raw };
}

function normalizeHydroshare(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (u) {
    const m = u.pathname.match(/\/resource\/([0-9a-fA-F-]{10,})/);
    if (m) return { spec: m[1] };
  }

  return { spec: raw };
}

function normalizeDataverse(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (u) {
    const pid = u.searchParams.get("persistentId");
    if (pid) return { spec: pid.replace(/\s+/g, "") };
  }

  const m1 = raw.match(/(doi:\s*10\.\d+\/\S+)/i);
  if (m1) return { spec: m1[1].replace(/\s+/g, "") };

  const m2 = raw.match(/(10\.\d+\/\S+)/);
  if (m2) return { spec: m2[1] };

  return { spec: raw };
}

function normalizeCkan(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);
  if (u) return { spec: stripTrailingSlash(u.toString()) };
  return { spec: raw };
}

function normalizeGit(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  if (/^https?:\/\//i.test(raw)) return { spec: stripTrailingSlash(raw) };
  return { spec: raw };
}

function mapToBinderProvider(p: RepoProvider): string {
  switch (p) {
    case "github":
      return "gh";
    case "gitlab":
      return "gl";
    case "gist":
      return "gist";
    case "zenodo":
      return "zenodo";
    case "figshare":
      return "figshare";
    case "hydroshare":
      return "hydroshare";
    case "dataverse":
      return "dataverse";
    case "ckan":
      return "ckan";
    case "git":
      return "git";
    default:
      return "gh";
  }
}

function normalizeForProvider(p: RepoProvider, repoRaw: string) {
  switch (p) {
    case "github":
      return normalizeGithub(repoRaw);
    case "gitlab":
      return normalizeGitlab(repoRaw);
    case "gist":
      return normalizeGist(repoRaw);
    case "zenodo":
      return normalizeZenodo(repoRaw);
    case "figshare":
      return normalizeFigshare(repoRaw);
    case "hydroshare":
      return normalizeHydroshare(repoRaw);
    case "dataverse":
      return normalizeDataverse(repoRaw);
    case "ckan":
      return normalizeCkan(repoRaw);
    case "git":
      return normalizeGit(repoRaw);
    default:
      return { spec: safeTrim(repoRaw) };
  }
}

function providerUsesRef(providerToken: string) {
  return providerToken === "gh" || providerToken === "gl" || providerToken === "gist" || providerToken === "git";
}

function providerSpecForBinder(args: BinderBuildArgs): string {
  const providerToken = mapToBinderProvider(args.provider);
  const norm = normalizeForProvider(args.provider, args.repo);

  if (providerToken === "git") {
    const ref = safeTrim(args.ref) || "HEAD";
    return `${providerToken}/${encodeURIComponent(norm.spec)}/${ref}`;
  }

  if (providerUsesRef(providerToken)) {
    const ref = safeTrim(args.ref) || "HEAD";
    return `${providerToken}/${norm.spec}/${ref}`;
  }

  return `${providerToken}/${norm.spec}`;
}

function subdirToBuildArgs(args: BinderBuildArgs) {
  const subdir = safeTrim(args.subdir);
  if (!subdir) return undefined;
  return { subdir };
}

function appendLog(setter: React.Dispatch<React.SetStateAction<string>>, chunk: string) {
  setter((prev) => prev + chunk);
}

export function useBinderBuild(): [BinderBuildState, BinderBuildControls] {
  const [status, setStatus] = React.useState<BinderBuildState["status"]>("idle");
  const [logs, setLogs] = React.useState<string>("");
  const [logsOpen, setLogsOpen] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imageName, setImageName] = React.useState<string | null>(null);

  const currentBuildRef = React.useRef<{ close?: () => void } | null>(null);

  const reset = React.useCallback(() => {
    try {
      currentBuildRef.current?.close?.();
    } catch {
      // ignore
    }
    currentBuildRef.current = null;
    setStatus("idle");
    setLogs("");
    setLogsOpen(false);
    setError(null);
    setImageName(null);
  }, []);

  const openLogs = React.useCallback(() => setLogsOpen(true), []);
  const closeLogs = React.useCallback(() => setLogsOpen(false), []);
  const toggleLogs = React.useCallback(() => setLogsOpen((v) => !v), []);

  const startBuild = React.useCallback((args: BinderBuildArgs) => {
    try {
      currentBuildRef.current?.close?.();
    } catch {
      // ignore
    }
    currentBuildRef.current = null;

    setStatus("building");
    setError(null);
    setImageName(null);
    setLogsOpen(true);
    setLogs("");

    (async () => {
      try {
        const apiToken = await getApiToken();

        // @ts-expect-error runtime import, package types may be incomplete
        const { BinderRepository } = await import("@jupyterhub/binderhub-client/client.js");

        const providerSpec = providerSpecForBinder(args);
        const buildEndPointURL = new URL("/services/binder/build/", window.location.origin);

        const image = new BinderRepository(providerSpec, buildEndPointURL, {
          apiToken,
          buildOnly: true,
          ...subdirToBuildArgs(args),
        });

        currentBuildRef.current = image;

        appendLog(setLogs, `Connecting to: ${buildEndPointURL.toString()}${providerSpec}\n`);

        for await (const data of image.fetch()) {
          if (data?.message !== undefined) {
            appendLog(setLogs, `data: ${JSON.stringify(data)}\n\n`);
          } else {
            appendLog(setLogs, `${JSON.stringify(data)}\n`);
          }

          // IMPORTANT:
          // Some backends ignore buildOnly and continue to launching/temp-user flow.
          // As soon as we have a built image, we stop there and treat it as success.
          if (data?.phase === "built" && data?.imageName) {
            setImageName(data.imageName);
            setStatus("done");
            try {
              image.close?.();
            } catch {
              // ignore
            }
            currentBuildRef.current = null;
            return;
          }

          if (data?.phase === "ready" && data?.imageName) {
            setImageName(data.imageName);
            setStatus("done");
            try {
              image.close?.();
            } catch {
              // ignore
            }
            currentBuildRef.current = null;
            return;
          }

          if (data?.phase === "failed") {
            try {
              image.close?.();
            } catch {
              // ignore
            }
            currentBuildRef.current = null;
            throw new Error(data?.message || "Image build failed.");
          }
        }

        currentBuildRef.current = null;
      } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : String(e);
        setStatus("error");
        setError(msg);
        appendLog(setLogs, `\n[failed] ${msg}\n`);
      }
    })();
  }, []);

  return [
    { status, logs, logsOpen, error, imageName },
    { startBuild, toggleLogs, openLogs, closeLogs, reset },
  ];
}
