import * as React from "react";
import { useEffect, useState, useRef, useContext, useMemo, KeyboardEventHandler } from "react";
import { type Terminal } from "xterm";
import { type FitAddon } from "xterm-addon-fit";

import useRepositoryField, { type RepoProvider } from "./hooks/useRepositoryField";
import Combobox from "./components/form/Combobox";
import useFormCache from "./hooks/useFormCache";
import { PermalinkContext } from "./context/Permalink";
import { ICustomOptionProps } from "./types/fields";

const TOKEN_KEY = "jupytherhub-build-token"; 
const DELETE_NONSENCE = "for git push, delete later";

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
  const xsrfToken = (`; ${document.cookie}`).split("; _xsrf=").pop().split(";")[0];
  const userResponse = await fetch(`/hub/api/user?_xsrf=${xsrfToken}`);
  const { name } = await userResponse.json();

  const exisitingToken = localStorage.getItem(TOKEN_KEY);
  if (exisitingToken) {
    const { id, expires_at, token } = JSON.parse(exisitingToken);
    const expiryDate = Date.parse(expires_at);
    const isExpired = expiryDate < new Date().getTime();

    if (isExpired) {
      // Token is expired, deleting from server and localStorage
      localStorage.removeItem(TOKEN_KEY);
      await fetch(`/hub/api/users/${name}/tokens/${id}?_xsrf=${xsrfToken}`, {
        method: "DELETE"
      });
    } else {
      return token;
    }
  }

  // No token or token is expired, requesting a new token
  const tokenResponse = await fetch(`/hub/api/users/${name}/tokens?_xsrf=${xsrfToken}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      expires_in: 3600,
      note: "Created by Fancy Profiles for Build your Own Image"
    }),
    credentials: "include"
  });
  const res = await tokenResponse.json();
  localStorage.setItem(TOKEN_KEY, JSON.stringify(res));
  return res.token;
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
        `${u.host}${u.pathname}`.replace(/^doi\.org\//i, "").replace(/^dx\.doi\.org\//i, ""),
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

function buildProviderSpec(args: BinderBuildArgs) {
  const providerToken = mapToBinderProvider(args.provider);
  const norm = normalizeForProvider(args.provider, args.repo);
  const refRaw = safeTrim(args.ref);
  const ref = refRaw || "HEAD";

  if (providerUsesRef(providerToken)) {
    return `${providerToken}/${norm.spec}/${ref}`;
  }

  if (refRaw) {
    return `${providerToken}/${norm.spec}/${refRaw}`;
  }

  return `${providerToken}/${norm.spec}`;
}

async function buildImageFromArgs(
  args: BinderBuildArgs,
  onLog: (chunk: string) => void,
) {
  const apiToken = await getApiToken();

  // @ts-expect-error - v0.5.0 client types not available
  const { BinderRepository } = await import("@jupyterhub/binderhub-client/client.js");
  const providerSpec = buildProviderSpec(args);
  const buildEndPointURL = new URL(
    "/services/binder/build/",
    window.location.origin,
  );

  if (safeTrim(args.subdir)) {
    buildEndPointURL.searchParams.set("subdir", safeTrim(args.subdir));
  }

  const image = new BinderRepository(
    providerSpec,
    buildEndPointURL,
    {
      apiToken,
      buildOnly: true,
    }
  );

  for await (const data of image.fetch()) {
    if (data.message !== undefined) {
      onLog(data.message);
    } else {
      onLog(`${JSON.stringify(data)}\n`);
    }

    switch (data.phase) {
      case "failed": {
        image.close();
        return Promise.reject(new Error(data.message || "Image build failed."));
      }
      case "ready": {
        image.close();
        return Promise.resolve(data.imageName);
      }
      default: {
        break;
      }
    }
  }
}

interface IImageLogs {
  setTerm: React.Dispatch<React.SetStateAction<Terminal>>;
  setFitAddon: React.Dispatch<React.SetStateAction<FitAddon>>;
  name: string;
}

function ImageLogs({ setTerm, setFitAddon, name }: IImageLogs) {
  const terminalId = `${name}--terminal`;
  useEffect(() => {
    async function setup() {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const term = new Terminal({
        convertEol: true,
        disableStdin: true,
        // 60 cols is pretty small, but unfortunately we have very limited width
        // available in our form!
        cols: 66,
        rows: 1,
        // Increase scrollback since image builds can sometimes produce a ton of output
        scrollback: 10000,
        // colors checked with the contrast checker at https://webaim.org/resources/contrastchecker/
        theme: {
          red: "\x1b[38;2;248;113;133m",
          green: "\x1b[38;2;134;239;172m",
          yellow: "\x1b[38;2;253;224;71m",
          blue: "\x1b[38;2;147;197;253m",
          magenta: "\x1b[38;2;249;168;212m",
          cyan: "\x1b[38;2;103;232;249m",
        },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(document.getElementById(terminalId));
      fitAddon.fit();
      setTerm(term);
      setFitAddon(fitAddon);
      term.write("Logs will appear here when image is being built");
    }
    setup();
  }, []);

  return (
    <div className="terminal-container border">
      <div id={terminalId} />
    </div>
  );
}

export function ImageBuilder(props?: Partial<ICustomOptionProps>) {
  if (!props?.name || props.isActive === undefined || !props.optionKey) {
    return null;
  }

  const { name, isActive, optionKey } = props as ICustomOptionProps;
  const { setPermalinkValue, permalinkValues } = useContext(PermalinkContext);

  const repoRef = permalinkValues[`${optionKey}:ref`];
  const binderRepo = permalinkValues[`${optionKey}:binderRepo`];
  const { repo, repoId, repoFieldProps, repoError } =
    useRepositoryField(binderRepo);
  const { getRepositoryOptions, getRefOptions, removeRefOption, removeRepositoryOption } = useFormCache();

  const [ref, setRef] = useState<string>(repoRef || "HEAD");
  const repoFieldRef = useRef<HTMLInputElement>();
  const branchFieldRef = useRef<HTMLInputElement>();

  const [customImage, setCustomImage] = useState<string>("");
  const [customImageError, setCustomImageError] = useState<string>(null);

  const [term, setTerm] = useState<Terminal>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon>(null);

  const [isBuildingImage, setIsBuildingImage] = useState<boolean>(false);

  const repositoryOptions = getRepositoryOptions(name);
  const refOptions = useMemo(() => {
    return getRefOptions(name, repoId);
  }, [repoId]);

  useEffect(() => {
    if (!isActive) setCustomImageError("");
  }, [isActive]);

  if (isActive) {
    setPermalinkValue(`${optionKey}:binderProvider`, "gh");
    setPermalinkValue(`${optionKey}:binderRepo`, repoId);
    setPermalinkValue(`${optionKey}:ref`, ref);
  }

  const handleBuildStart = async () => {
    if (repoFieldRef.current && !repo) {
      repoFieldRef.current.focus();
      repoFieldRef.current.blur();
      return;
    }

    if (branchFieldRef.current && !ref) {
      branchFieldRef.current.focus();
      branchFieldRef.current.blur();
      return;
    }

    setIsBuildingImage(true);
    buildImage(repoId, ref, term, fitAddon)
      .then((imageName) => {
        setCustomImage(imageName);
        term.write(
          "\nImage has been built! Click the start button to launch your server",
        );
      })
      .catch(() => console.log("Error building image."))
      .finally(() => setIsBuildingImage(false));
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      handleBuildStart();
    }
  };

  // We render everything, but only toggle visibility based on wether we are being
  // shown or hidden. This provides for more DOM stability, and also allows the image
  // to continue being built evn if the user moves away elsewhere. When hidden, we just
  // don't generate the hidden input that posts the built image out.
  return (
    <>
      <div className="profile-option-container">
        <div className="profile-option-label-container">Provider</div>
        <div className="profile-option-control-container">GitHub</div>
      </div>

      <Combobox
        id={`${name}--repo`}
        className={isActive ? "cache-repository" : undefined}
        label="Repository"
        ref={repoFieldRef}
        {...repoFieldProps}
        error={repoError}
        options={repositoryOptions}
        autoComplete="off"
        onRemoveOption={(option) => removeRepositoryOption(name, option)}
        validate={
          isActive && {
            required: "Provide the repository as the format 'organization/repository'.",
          }
        }
        onKeyDown={handleKeyDown}
      />
      <Combobox
        id={`${name}--ref`}
        label="Git Ref"
        ref={branchFieldRef}
        hint="Branch, Tag or Commit to use. HEAD will use the default branch"
        value={ref}
        validate={
          isActive && {
            required: "Enter a git ref.",
          }
        }
        onChange={(e) => setRef(e.target.value)}
        onBlur={(e) => {
          setRef(e.target.value.trim());
        }}
        tabIndex={isActive ? 0 : -1}
        options={refOptions}
        autoComplete="off"
        onRemoveOption={(option) => {
          removeRefOption(name, repoFieldProps.value, option);
        }}
      />

      <div className="right-button">
        <button
          type="button"
          className="btn btn-jupyter"
          onClick={handleBuildStart}
          disabled={isBuildingImage}
        >
          Build image
        </button>
      </div>
      <input
        type="text"
        name={name}
        value={customImage}
        aria-invalid={isActive && !customImage}
        required={isActive}
        aria-hidden="true"
        style={{ display: "none" }}
        onInvalid={() =>
          setCustomImageError("Wait for the image build to complete.")}
        onChange={() => {}} // Hack to prevent a console error, while at the same time allowing for this field to be validatable, ie.
      />
      {customImageError && isActive ? (
        <div className="field-error">{customImageError}</div>
      ) : null}
      <ImageLogs setTerm={setTerm} setFitAddon={setFitAddon} name={name} />
    </>
  );
}

async function buildImage(
  repo: string,
  ref: string,
  term: Terminal,
  fitAddon: FitAddon,
) {
  const apiToken = await getApiToken();

  // @ts-expect-error - v0.5.0 client types not available
  const { BinderRepository } = await import("@jupyterhub/binderhub-client/client.js");
  const providerSpec = "gh/" + repo + "/" + ref;
  // FIXME: Assume the binder api is available in the same hostname, under /services/binder/
  const buildEndPointURL = new URL(
    "/services/binder/build/",
    window.location.origin,
  );

  // Use new v0.5.0 API with options object - only apiToken needed for auth
  const image = new BinderRepository(
    providerSpec,
    buildEndPointURL,
    {
      apiToken,     // JupyterHub API token for Authorization header
      buildOnly: true,
    }
  );
  // Clear the last line written, so we start from scratch
  term.write("\x1b[2K\r");
  term.resize(66, 16);
  fitAddon.fit();

  for await (const data of image.fetch()) {
    // Write message to the log terminal if there is a message
    if (data.message !== undefined) {
      // Write out all messages to the terminal!
      term.write(data.message);
      // Resize our terminal to make sure it fits messages appropriately
      fitAddon.fit();
    } else {
      console.log(data);
    }

    switch (data.phase) {
      case "failed": {
        image.close();
        return Promise.reject();
      }
      case "ready": {
        // Close the EventStream when the image has been built
        image.close();
        return Promise.resolve(data.imageName);
      }
      default: {
        console.log("Unknown phase in response from server");
        console.log(data);
        break;
      }
    }
  }
}

export function useBinderBuild(): [BinderBuildState, BinderBuildControls] {
  const [status, setStatus] = React.useState<BinderBuildState["status"]>("idle");
  const [logs, setLogs] = React.useState<string>("");
  const [logsOpen, setLogsOpen] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imageName, setImageName] = React.useState<string | null>(null);

  const buildIdRef = React.useRef(0);

  const reset = React.useCallback(() => {
    buildIdRef.current += 1;
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
    const buildId = buildIdRef.current + 1;
    buildIdRef.current = buildId;

    setStatus("building");
    setError(null);
    setImageName(null);
    setLogsOpen(true);
    setLogs("");

    (async () => {
      try {
        const builtImage = await buildImageFromArgs(args, (chunk) => {
          if (buildIdRef.current !== buildId) return;
          setLogs((prev) => prev + chunk);
        });

        if (buildIdRef.current !== buildId) return;
        setImageName(builtImage);
        setStatus("done");
        setLogs((prev) => prev + "\nImage has been built! Click the start button to launch your server\n");
      } catch (e: any) {
        if (buildIdRef.current !== buildId) return;
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
