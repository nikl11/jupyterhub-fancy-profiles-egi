import * as React from "react";
import { RepoProvider } from "./hooks/useRepositoryField";

console.log("IMAGEBUILDER VERSION 2026-03-03-A");

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

  if (!xsrfToken) {
    throw new Error("Missing _xsrf cookie");
  }

  const defaultHeaders = {
    "X-XSRFToken": xsrfToken,
    "Accept": "application/json",
  };

  const userResponse = await fetch(`/hub/api/user`, {
    method: "GET",
    credentials: "include",
    headers: defaultHeaders,
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
      await fetch(`/hub/api/users/${name}/tokens/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: defaultHeaders,
      });
    } else {
      return token as string;
    }
  }

  const tokenResponse = await fetch(`/hub/api/users/${name}/tokens`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_in: 3600,
      note: "Created by Fancy Profiles for Build your Own Image",
    }),
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

  if (!u) return { spec: stripGitSuffix(raw.replace(/^\/+/, "")) };

  const parts = u.pathname.split("/").filter(Boolean);
  const dashIdx = parts.indexOf("-");
  const useful = dashIdx >= 0 ? parts.slice(0, dashIdx) : parts;
  return { spec: useful.map((p) => stripGitSuffix(p)).join("/") };
}

function normalizeGist(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) {
    const parts = raw.split("/").filter(Boolean);
    return { spec: parts[parts.length - 1] ?? raw };
  }

  const parts = u.pathname.split("/").filter(Boolean);
  return { spec: parts[parts.length - 1] ?? raw };
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

function buildBinderBuildUrl(args: BinderBuildArgs, apiToken: string) {
  const providerToken = mapToBinderProvider(args.provider);
  const norm = normalizeForProvider(args.provider, args.repo);
  const refRaw = safeTrim(args.ref);
  const ref = refRaw || "HEAD";
  const subdir = safeTrim(args.subdir);

  let path = `/services/binder/build/${providerToken}`;

  if (providerToken === "git") {
    path += `/${encodeURIComponent(norm.spec)}/${encodeURIComponent(ref)}`;
  } else if (providerToken === "gh" || providerToken === "gl" || providerToken === "gist") {
    // IMPORTANT: keep repo path segments separate, do not encode the whole owner/repo as one segment
    const repoSegments = norm.spec.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    path += `/${repoSegments}/${encodeURIComponent(ref)}`;
  } else if (providerToken === "zenodo" || providerToken === "figshare" || providerToken === "dataverse") {
    // DOI-like providers: keep slashes in spec
    path += `/${encodeURI(norm.spec)}`;
    if (refRaw) path += `/${encodeURIComponent(refRaw)}`;
  } else {
    // hydroshare / ckan and similar
    path += `/${encodeURIComponent(norm.spec)}`;
    if (refRaw) path += `/${encodeURIComponent(refRaw)}`;
  }

  const params = new URLSearchParams();
  params.set("token", apiToken);
  params.set("build_only", "1");
  if (subdir) params.set("subdir", subdir);

  return `${path}?${params.toString()}`;
}

function tryExtractImageNameFromLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    const jsonPart = trimmed.replace(/^data:\s*/, "");
    try {
      const obj: any = JSON.parse(jsonPart);
      if (typeof obj?.imageName === "string" && obj.imageName.includes("/")) return obj.imageName;
    } catch {
      // ignore
    }
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj: any = JSON.parse(trimmed);
      if (typeof obj?.imageName === "string" && obj.imageName.includes("/")) return obj.imageName;
    } catch {
      // ignore
    }
  }

  const m1 = trimmed.match(/"imageName"\s*:\s*"([^"]+)"/);
  if (m1) return m1[1];

  const m2 = trimmed.match(/Built image:\s*(\S+)/i);
  if (m2) return m2[1];

  const m3 = trimmed.match(/--image(?:=|\s+)(\S+)/i);
  if (m3) return m3[1];

  return null;
}

export function useBinderBuild(): [BinderBuildState, BinderBuildControls] {
  const [status, setStatus] = React.useState<BinderBuildState["status"]>("idle");
  const [logs, setLogs] = React.useState<string>("");
  const [logsOpen, setLogsOpen] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imageName, setImageName] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  const reset = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setStatus("building");
    setError(null);
    setImageName(null);
    setLogsOpen(true);
    setLogs("");

    (async () => {
      try {
        const apiToken = await getApiToken();
        const url = buildBinderBuildUrl(args, apiToken);

        setLogs(`Connecting to: ${url}\n`);

        const res = await fetch(url, {
          method: "GET",
          signal: ac.signal,
          credentials: "include",
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          const t = await res.text().catch(() => "");
          setLogs((prev) => prev + (t ? t + "\n" : ""));
          setStatus("done");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          setLogs((prev) => prev + chunk);

          buffer += chunk;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const found = tryExtractImageNameFromLine(line);
            if (found) setImageName(found);

            if (line.includes(`"phase": "built"`) && found) {
              setStatus("done");
              abortRef.current?.abort();
              return;
            }

            if (line.includes(`"phase": "ready"`) && found) {
              setStatus("done");
              abortRef.current?.abort();
              return;
            }

            if (line.includes(`"phase": "failed"`)) {
              let msg = "Image build failed.";
              try {
                const jsonPart = line.replace(/^data:\s*/, "");
                const obj = JSON.parse(jsonPart);
                if (typeof obj?.message === "string") msg = obj.message;
              } catch {
                // ignore
              }
              throw new Error(msg);
            }
          }
        }

        if (buffer) {
          const found = tryExtractImageNameFromLine(buffer);
          if (found) setImageName(found);
        }

        setStatus("done");
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        const msg = typeof e?.message === "string" ? e.message : String(e);
        setStatus("error");
        setError(msg);
        setLogs((prev) => prev + `\n[failed] ${msg}\n`);
      }
    })();
  }, []);

  return [
    { status, logs, logsOpen, error, imageName },
    { startBuild, toggleLogs, openLogs, closeLogs, reset },
  ];
}
