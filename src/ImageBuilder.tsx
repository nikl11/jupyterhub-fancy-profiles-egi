import { useContext, useEffect, useMemo, useRef, useState, KeyboardEventHandler } from "react";
import { type Terminal } from "xterm";
import { type FitAddon } from "xterm-addon-fit";


import useRepositoryField, { type BinderProvider } from "./hooks/useRepositoryField";
import Combobox from "./components/form/Combobox";
import useFormCache from "./hooks/useFormCache";
import { PermalinkContext } from "./context/Permalink";
import { ICustomOptionProps } from "./types/fields";

const TOKEN_KEY = "jupyterhub-build-token";

const PROVIDERS: Array<{ id: BinderProvider; label: string; hint: string }> = [
  { id: "gh", label: "GitHub", hint: "owner/repo or https://github.com/owner/repo" },
  { id: "gl", label: "GitLab", hint: "group/project or https://gitlab.com/group/project" },
  { id: "gist", label: "Gist", hint: "gist-id or user/gist-id or https://gist.github.com/..." },
  { id: "zenodo", label: "Zenodo", hint: "record id (e.g. 1234567) or DOI URL" },
  { id: "git", label: "Git (URL)", hint: "https://example.org/repo.git" },
];

async function getApiToken() {
  const xsrfToken = (`; ${document.cookie}`).split("; _xsrf=").pop()?.split(";")[0] ?? "";
  const userResponse = await fetch(`/hub/api/user?_xsrf=${xsrfToken}`, { credentials: "include" });
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expires_in: 3600,
      note: "Created by Fancy Profiles for Build your Own Image",
    }),
    credentials: "include",
  });

  const res = await tokenResponse.json();
  localStorage.setItem(TOKEN_KEY, JSON.stringify(res));
  return res.token as string;
}

async function buildImage(
  provider: BinderProvider,
  repoId: string,
  ref: string,
  term: Terminal,
  fitAddon: FitAddon,
) {
  const apiToken = await getApiToken();

  // @ts-expect-error - v0.5.0 client types not available
  const { BinderRepository } = await import("@jupyterhub/binderhub-client/client.js");

  const safeRef = ref && ref.trim().length ? ref.trim() : "HEAD";
  const providerSpec = `${provider}/${repoId}/${safeRef}`;

  const buildEndPointURL = new URL("/services/binder/build/", window.location.origin);

  const image = new BinderRepository(providerSpec, buildEndPointURL, {
    apiToken,
    buildOnly: true,
  });

  term.write("\x1b[2K\r");
  term.resize(66, 16);
  fitAddon.fit();

  for await (const data of image.fetch()) {
    if (data.message !== undefined) {
      term.write(data.message);
      fitAddon.fit();
    }

    switch (data.phase) {
      case "failed": {
        image.close();
        return Promise.reject(new Error("Image build failed"));
      }
      case "ready": {
        image.close();
        return Promise.resolve(data.imageName as string);
      }
      default: {
        break;
      }
    }
  }

  return Promise.reject(new Error("Image build stream ended unexpectedly"));
}

interface IImageLogs {
  setTerm: React.Dispatch<React.SetStateAction<Terminal>>;
  setFitAddon: React.Dispatch<React.SetStateAction<FitAddon>>;
  name: string;
}

function ImageLogs({ setTerm, setFitAddon, name }: IImageLogs) {
  const terminalId = `${name}--terminal`;

  useEffect(() => {
    let disposed = false;

    async function setup() {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");

      if (disposed) return;

      const term = new Terminal({
        convertEol: true,
        disableStdin: true,
        cursorStyle: "block",
        cursorBlink: false,
        fontSize: 12,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      setTerm(term);
      setFitAddon(fitAddon);

      const el = document.getElementById(terminalId);
      if (el) {
        term.open(el);
        fitAddon.fit();
      }

      term.writeln("Ready.");
    }

    setup();

    return () => {
      disposed = true;
    };
  }, [terminalId]);

  return (
    <div className="terminal-container border rounded p-2 bg-body-tertiary">
      <div id={terminalId} />
    </div>
  );
}

export function ImageBuilder({ name, isActive, optionKey }: ICustomOptionProps) {
  const { setPermalinkValue, permalinkValues } = useContext(PermalinkContext);

  const initialProvider = (permalinkValues[`${optionKey}:binderProvider`] as BinderProvider) || "gh";
  const [provider, setProvider] = useState<BinderProvider>(initialProvider);

  const repoRef = permalinkValues[`${optionKey}:ref`];
  const binderRepo = permalinkValues[`${optionKey}:binderRepo`];

  const { repo, repoId, repoFieldProps, repoError } = useRepositoryField(provider, binderRepo);

  const { getRepositoryOptions, getRefOptions, removeRefOption, removeRepositoryOption, cacheRepositorySelection } =
    useFormCache();

  const [ref, setRef] = useState<string>(repoRef || "HEAD");
  const repoFieldRef = useRef<HTMLInputElement>();
  const branchFieldRef = useRef<HTMLInputElement>();

  const [customImage, setCustomImage] = useState<string>("");
  const [customImageError, setCustomImageError] = useState<string>(null);

  const [term, setTerm] = useState<Terminal>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon>(null);

  const [isBuildingImage, setIsBuildingImage] = useState<boolean>(false);

  const repositoryOptions = useMemo(() => getRepositoryOptions(name), [name]);
  const refOptions = useMemo(() => getRefOptions(name, repoId), [name, repoId]);

  useEffect(() => {
    if (!isActive) {
      setCustomImageError("");
      setCustomImage("");
    }
  }, [isActive]);

  if (isActive) {
    setPermalinkValue(`${optionKey}:binderProvider`, provider);
    setPermalinkValue(`${optionKey}:binderRepo`, repoId || "");
    setPermalinkValue(`${optionKey}:ref`, ref || "");
  }

  const providerMeta = useMemo(() => PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0], [provider]);

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

    if (!repoId) return;

    setIsBuildingImage(true);
    buildImage(provider, repoId, ref, term, fitAddon)
      .then((imageName) => {
        setCustomImage(imageName);
        cacheRepositorySelection(name, repoId, ref);
        term?.write("\nImage has been built! Click the start button to launch your server.\n");
      })
      .catch(() => {
        term?.write("\nERROR: Image build failed.\n");
      })
      .finally(() => setIsBuildingImage(false));
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      handleBuildStart();
    }
  };

  return (
    <div style={{ display: isActive ? "block" : "none" }}>
      <div className="mt-2">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor={`${name}--provider`}>
              Provider
            </label>
            <select
              id={`${name}--provider`}
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as BinderProvider)}
              tabIndex={isActive ? 0 : -1}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <Combobox
              id={`${name}--repo`}
              label="Repository"
              value={repo}
              hint={providerMeta.hint}
              validate={
                isActive && {
                  required: "Enter a value.",
                }
              }
              error={repoError}
              onChange={repoFieldProps.onChange}
              onBlur={(e) => {
                repoFieldProps.onBlur(e);
              }}
              onKeyDown={handleKeyDown}
              tabIndex={isActive ? 0 : -1}
              options={repositoryOptions}
              autoComplete="off"
              ref={repoFieldRef}
              onRemoveOption={(option) => removeRepositoryOption(name, option)}
            />
          </div>

          <div className="col-12 col-md-3">
            <Combobox
              id={`${name}--ref`}
              label="Ref"
              value={ref}
              hint="branch / tag / commit (default: HEAD)"
              validate={
                isActive && {
                  required: "Enter a value.",
                }
              }
              onChange={(e) => setRef(e.target.value)}
              onBlur={(e) => setRef(e.target.value.trim())}
              onKeyDown={handleKeyDown}
              tabIndex={isActive ? 0 : -1}
              options={refOptions}
              autoComplete="off"
              ref={branchFieldRef}
              onRemoveOption={(option) => removeRefOption(name, repoId, option)}
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleBuildStart}
              disabled={!isActive || isBuildingImage || !repoId}
            >
              {isBuildingImage ? "Building..." : "Build image"}
            </button>
            {!repoId && isActive ? (
              <span className="text-muted" style={{ fontSize: "0.95rem" }}>
                {providerMeta.hint}
              </span>
            ) : null}
          </div>

          <div className="mt-2">
            <ImageLogs setTerm={setTerm} setFitAddon={setFitAddon} name={name} />
          </div>

          <input
            type="text"
            name={name}
            value={customImage}
            aria-invalid={isActive && !customImage}
            required={isActive}
            aria-hidden="true"
            style={{ display: "none" }}
            onInvalid={() => setCustomImageError("Wait for the image build to complete.")}
            onChange={() => {}}
          />

          {!!customImageError && (
            <div className="text-danger mt-2" style={{ fontSize: "0.95rem" }}>
              {customImageError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

