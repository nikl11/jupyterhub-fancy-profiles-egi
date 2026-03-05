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

function encodePathSegmentStrict(s: string) {
  // Encodes '/' as %2F (good for git providers where spec is a single segment)
  return encodeURIComponent(s);
}

function encodePathKeepSlashes(s: string) {
  // Keeps '/' unescaped (good for DOI-like specs where BinderHub expects slashes)
  // Still encodes spaces etc.
  return encodeURI(s);
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
  if (parts.length >= 2) {
    return { spec: `${parts[0]}/${stripGitSuffix(parts[1])}` };
  }
  return { spec: raw };
}

function normalizeGitlab(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  if (!u) return { spec: stripGitSuffix(raw.replace(/^\/+/, "")) };

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

  // Accept DOI formats:
  // 10.5281/zenodo.3242074
  // https://doi.org/10.5281/zenodo.3242074
  // https://dx.doi.org/10.5281/zenodo.3242074
  const u = tryParseUrl(raw);
  const candidate = u
    ? stripTrailingSlash(`${u.host}${u.pathname}`
        .replace(/^doi\.org\//i, "")
        .replace(/^dx\.doi\.org\//i, ""))
    : raw;

  const doiMatch = candidate.match(/(10\.\d+\/zenodo\.\d+)/i);
  if (doiMatch) return { spec: doiMatch[1] };

  const direct = raw.match(/(10\.\d+\/zenodo\.\d+)/i);
  if (direct) return { spec: direct[1] };

  // If user pasted something odd, just pass it through; BinderHub will validate.
  return { spec: raw };
}

function normalizeFigshare(input: string): { spec: string } {
  const raw = stripTrailingSlash(safeTrim(input));
  const u = tryParseUrl(raw);

  // Figshare provider expects a DOI-like spec too.
  // e.g. 10.6084/m9.figshare.9782777.v1
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

function providerUsesRefInPath(binderProvider: string) {
  return binderProvider === "gh" || binderProvider === "gl" || binderProvider === "gist" || binderProvider === "git";
}

function providerKeepsSlashesInSpec(binderProvider: string) {
  // DOI/persistentId style specs must keep '/' in the path (urlEncode: False in BinderHub UI config)
  return (
    binderProvider === "zenodo" ||
    binderProvider === "figshare" ||
    binderProvider === "dataverse"
    // hydroshare/ckan specs do not contain '/' in the same way, but keeping slashes is harmless.
  );
}

function buildBinderBuildUrl(args: BinderBuildArgs): { url: string; display: string } {
  const providerToken = mapToBinderProvider(args.provider);
  const norm = normalizeForProvider(args.provider, args.repo);

  const specEncoded = providerKeepsSlashesInSpec(providerToken)
    ? encodePathKeepSlashes(norm.spec)
    : encodePathSegmentStrict(norm.spec);

  const base = `/services/binder/build/${providerToken}/${specEncoded}`;

  const refRaw = safeTrim(args.ref);
  const ref = refRaw || "HEAD";

  const query: string[] = [];
  const subdirRaw = safeTrim(args.subdir);
  if (subdirRaw) query.push(`subdir=${encodeURIComponent(subdirRaw)}`);

  let full = base;

  if (providerUsesRefInPath(providerToken)) {
    full = `${base}/${encodePathSegmentStrict(ref)}`;
  } else {
    // Dataset providers: do NOT force "/HEAD" when empty.
    if (refRaw) full = `${base}/${encodePathSegmentStrict(refRaw)}`;
  }

  if (query.length) full += `?${query.join("&")}`;

  return { url: full, display: full };
}

function appendLog(setter: React.Dispatch<React.SetStateAction<string>>, chunk: string) {
  setter((prev) => prev + chunk);
}

function tryExtractImageNameFromLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

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
