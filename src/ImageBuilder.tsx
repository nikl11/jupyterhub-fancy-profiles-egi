import * as React from "react";
import { RepoProvider } from "./hooks/useRepositoryField";

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

function encodePathSegment(s: string) {
  // encodeURIComponent is correct for a single path segment
  return encodeURIComponent(s);
}

function normalizeGithub(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) {
    // accept owner/repo or owner/repo/tree/branch etc -> reduce
    const parts = raw.split("/").filter(Boolean);
    if (parts.length >= 2) return { spec: `${parts[0]}/${stripGitSuffix(parts[1])}` };
    return { spec: raw };
  }

  // https://github.com/owner/repo(/...)
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return { spec: `${parts[0]}/${stripGitSuffix(parts[1])}` };
  }
  return { spec: raw };
}

function normalizeGitlab(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) {
    // group/subgroup/repo
    return { spec: stripGitSuffix(raw.replace(/^\/+/, "")) };
  }

  // https://gitlab.com/group/subgroup/repo/-/tree/...
  const parts = u.pathname.split("/").filter(Boolean);
  const dashIdx = parts.indexOf("-");
  const useful = dashIdx >= 0 ? parts.slice(0, dashIdx) : parts;
  const cleaned = useful.map((p) => stripGitSuffix(p)).join("/");
  return { spec: cleaned };
}

function normalizeGist(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  // BinderHub gist provider usually wants the gist id
  if (!u) {
    // allow "user/gistid" or just "gistid"
    const parts = raw.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? raw;
    return { spec: last };
  }

  // https://gist.github.com/user/<id> or /<id>
  const parts = u.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? raw;
  return { spec: last };
}

function normalizeZenodo(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));

  // Accept:
  // - 10.5281/zenodo.3242074
  // - https://doi.org/10.5281/zenodo.3242074
  // - https://dx.doi.org/10.5281/zenodo.3242074
  // - 3242074 (record id)
  //
  // Prefer DOI form if present; otherwise allow record id.
  const u = tryParseUrl(raw);
  const candidate = u ? stripTrailingSlash(`${u.host}${u.pathname}`.replace(/^doi\.org\//i, "").replace(/^dx\.doi\.org\//i, "")) : raw;

  // Extract DOI in path if it contains "/zenodo."
  const doiMatch = candidate.match(/(10\.5281\/zenodo\.\d+)/i);
  if (doiMatch) return { spec: doiMatch[1] };

  // Sometimes DOI appears without scheme: 10.5281/zenodo.3242074
  const directDoiMatch = raw.match(/(10\.5281\/zenodo\.\d+)/i);
  if (directDoiMatch) return { spec: directDoiMatch[1] };

  // Otherwise treat as record id (digits)
  const id = raw.replace(/[^\d]/g, "");
  return { spec: id || raw };
}

function normalizeFigshare(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  // Common:
  // - https://figshare.com/articles/<...>/<id>
  // - https://doi.org/10.6084/m9.figshare.<id>
  // - 10.6084/m9.figshare.<id>
  // - <id>
  if (u) {
    const host = u.host.toLowerCase();
    if (host.includes("doi.org") || host.includes("dx.doi.org")) {
      const m = u.pathname.match(/(10\.6084\/m9\.figshare\.\d+)/i);
      if (m) return { spec: m[1] };
    }
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? raw;
    if (/^\d+$/.test(last)) return { spec: last };
  }

  const doi = raw.match(/(10\.6084\/m9\.figshare\.\d+)/i);
  if (doi) return { spec: doi[1] };

  const id = raw.match(/(\d{5,})/);
  if (id) return { spec: id[1] };

  return { spec: raw };
}

function normalizeHydroshare(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  // Common:
  // - https://www.hydroshare.org/resource/<uuid>/
  // - <uuid>
  if (u) {
    const m = u.pathname.match(/\/resource\/([0-9a-fA-F-]{10,})/);
    if (m) return { spec: m[1] };
  }
  return { spec: raw };
}

function normalizeDataverse(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  // Common:
  // - https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/...
  // - doi:10.7910/DVN/...
  // - 10.7910/DVN/...
  if (u) {
    const pid = u.searchParams.get("persistentId");
    if (pid) return { spec: pid };
    // sometimes persistentId is in fragment too, but rare
  }

  const m1 = raw.match(/(doi:\s*10\.\d+\/\S+)/i);
  if (m1) return { spec: m1[1].replace(/\s+/g, "") };

  const m2 = raw.match(/(10\.\d+\/\S+)/);
  if (m2) return { spec: `doi:${m2[1]}` };

  return { spec: raw };
}

function normalizeCkan(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  // CKANProvider typically accepts a dataset URL.
  // We'll pass through a normalized URL (no trailing slash).
  if (u) return { spec: stripTrailingSlash(u.toString()) };
  return { spec: raw };
}

function normalizeGit(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));

  // Accept:
  // - https://host/org/repo(.git)
  // - git@host:org/repo(.git)
  // - any git clone URL
  // For https URLs, strip trailing slash, keep .git optional.
  if (/^https?:\/\//i.test(raw)) return { spec: stripTrailingSlash(raw) };
  return { spec: raw };
}

function mapToBinderProvider(p: RepoProvider): string {
  // BinderHub endpoint provider tokens
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

function providerUsesRefInPath(binderProvider: string) {
  // In BinderHub, git-backed providers use /<ref> path segment.
  // Dataset providers usually resolve versions internally, so we omit /<ref> if empty.
  return binderProvider === "gh" || binderProvider === "gl" || binderProvider === "gist" || binderProvider === "git";
}

function buildBinderBuildUrl(args: BinderBuildArgs): { url: string; display: string } {
  const providerToken = mapToBinderProvider(args.provider);
  const norm = normalizeForProvider(args.provider, args.repo);

  const specEncoded = encodePathSegment(norm.spec);
  const base = `/services/binder/build/${providerToken}/${specEncoded}`;

  const refRaw = safeTrim(args.ref);
  const ref = refRaw || "HEAD";

  const query: string[] = [];
  const subdirRaw = safeTrim(args.subdir);
  if (subdirRaw) query.push(`subdir=${encodeURIComponent(subdirRaw)}`);

  let full = base;

  if (providerUsesRefInPath(providerToken)) {
    full = `${base}/${encodePathSegment(ref)}`;
  } else {
    // dataset providers: let BinderHub resolve default version; don't force HEAD if empty
    // If user provided a ref explicitly, we still pass it in the path (it is supported by BinderHub for some providers),
    // but many dataset providers ignore it. Keep it optional:
    if (refRaw) full = `${base}/${encodePathSegment(refRaw)}`;
  }

  if (query.length) full += `?${query.join("&")}`;

  return { url: full, display: full };
}

function appendLog(setter: React.Dispatch<React.SetStateAction<string>>, chunk: string) {
  setter((prev) => prev + chunk);
}

function tryExtractImageNameFromLine(line: string): string | null {
  // BinderHub often outputs json-logs from repo2docker/binder build
  // We try JSON first, then fall back to simple regexes.
  const trimmed = line.trim();
  if (!trimmed) return null;

  // JSON log line
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj: any = JSON.parse(trimmed);
      const candidates = [obj.imageName, obj.image, obj.image_name, obj["image-name"], obj["image_name"]];
      for (const c of candidates) {
        if (typeof c === "string" && c.includes("/")) return c;
      }
    } catch {
      // ignore
    }
  }

  // Plain text patterns
  const m1 = trimmed.match(/Built image:\s*(\S+)/i);
  if (m1) return m1[1];

  const m2 = trimmed.match(/--image(?:=|\s+)(\S+)/i);
  if (m2) return m2[1];

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

    const { url, display } = buildBinderBuildUrl(args);

    setStatus("building");
    setError(null);
    setImageName(null);
    setLogsOpen(true);
    setLogs(`Connecting to: ${display}\n`);

    fetch(url, {
      method: "GET",
      signal: ac.signal,
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          const t = await res.text().catch(() => "");
          appendLog(setLogs, t ? t + "\n" : "\n");
          setStatus("done");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          appendLog(setLogs, chunk);

          buffer += chunk;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const found = tryExtractImageNameFromLine(line);
            if (found) setImageName(found);
          }
        }

        // handle remainder
        if (buffer) {
          const found = tryExtractImageNameFromLine(buffer);
          if (found) setImageName(found);
        }

        setStatus("done");
      })
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        const msg = typeof e?.message === "string" ? e.message : String(e);
        setStatus("error");
        setError(msg);
        appendLog(setLogs, `\n[failed] ${msg}\n`);
      });
  }, []);

  return [
    { status, logs, logsOpen, error, imageName },
    { startBuild, toggleLogs, openLogs, closeLogs, reset },
  ];
}
