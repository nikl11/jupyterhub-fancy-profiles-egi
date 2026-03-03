import * as React from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

export type BuildResult = {
  imageName: string;
  binderRef?: string;
};

type Props = {
  repo: string;          // expected "org/repo" for GitHub
  gitRef: string;        // branch/tag/commit
  fileToOpen?: string;   // optional, not used by build-only
  onBuilt?: (res: BuildResult) => void;
};

const TOKEN_KEY = "jhfp_binder_api_token";

type JupyterHubTokenResponse = {
  token: string;
  id?: string;
  created?: string;
  last_activity?: string;
  note?: string;
};

async function getOrCreateApiToken(): Promise<string> {
  const cachedRaw = localStorage.getItem(TOKEN_KEY);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as Partial<JupyterHubTokenResponse>;
      if (typeof cached.token === "string" && cached.token.length > 0) return cached.token;
    } catch {
      // ignore
    }
  }

  const w = window as unknown as { jhdata?: { user?: { name?: string } } };
  const userName = w.jhdata?.user?.name;
  if (!userName) {
    throw new Error("Missing jhdata.user.name (cannot create JupyterHub API token).");
  }

  const tokenResponse = await fetch(`/hub/api/users/${encodeURIComponent(userName)}/tokens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expires_in: 3600,
      note: "Created by Fancy Profiles (Build your own image)",
    }),
    credentials: "include",
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Failed to create token: ${tokenResponse.status} ${text}`);
  }

  const res = (await tokenResponse.json()) as JupyterHubTokenResponse;
  if (!res.token) throw new Error("Token response missing token.");
  localStorage.setItem(TOKEN_KEY, JSON.stringify(res));
  return res.token;
}

async function buildImage(
  repo: string,
  ref: string,
  term: Terminal,
  fitAddon: FitAddon,
): Promise<BuildResult> {
  const apiToken = await getOrCreateApiToken();

  // binderhub-client v0.5.0 doesn't ship TS types here, so we load dynamically
  // and keep the usage isolated to this function.
  const mod = (await import("@jupyterhub/binderhub-client/client.js")) as unknown as {
    BinderRepository: new (
      spec: string,
      buildEndpoint: URL,
      options: { apiToken: string; buildOnly: boolean },
    ) => {
      fetch: () => AsyncGenerator<Record<string, unknown>, void, unknown>;
      imageName?: string;
    };
  };

  const providerSpec = `gh/${repo}/${ref}`;

  // Binder service is exposed under JupyterHub as /services/binder/
  const buildEndPointURL = new URL("/services/binder/build/", window.location.origin);

  const image = new mod.BinderRepository(providerSpec, buildEndPointURL, {
    apiToken,
    buildOnly: true,
  });

  term.clear();
  term.writeln(`Starting build: ${providerSpec}`);
  term.writeln(`Endpoint: ${buildEndPointURL.toString()}`);
  term.writeln("");

  // Stream build logs
  for await (const evt of image.fetch()) {
    // binder events commonly contain "message" or "phase"
    const msg = (evt as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) {
      term.writeln(msg);
      fitAddon.fit();
      continue;
    }

    const phase = (evt as { phase?: unknown }).phase;
    if (typeof phase === "string" && phase.length > 0) {
      term.writeln(`[${phase}]`);
      fitAddon.fit();
      continue;
    }
  }

  const imageName = typeof image.imageName === "string" && image.imageName.length > 0
    ? image.imageName
    : "unknown";

  term.writeln("");
  term.writeln("Build finished.");

  return { imageName, binderRef: providerSpec };
}

export default function ImageBuilder({ repo, gitRef, onBuilt }: Props) {
  const termRef = React.useRef<Terminal | null>(null);
  const fitRef = React.useRef<FitAddon | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [isBuilding, setIsBuilding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      convertEol: true,
      fontSize: 12,
      scrollback: 5000,
    });
    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    term.writeln("Ready.");

    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  const canBuild = repo.trim().length > 0 && gitRef.trim().length > 0;

  const onBuild = async () => {
    setError(null);

    const term = termRef.current;
    const fitAddon = fitRef.current;
    if (!term || !fitAddon) {
      setError("Terminal is not initialized.");
      return;
    }

    if (!canBuild) {
      setError("Repository and ref are required.");
      return;
    }

    setIsBuilding(true);
    try {
      const result = await buildImage(repo.trim(), gitRef.trim(), term, fitAddon);
      if (onBuilt) onBuilt(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      term.writeln("");
      term.writeln(`ERROR: ${msg}`);
      fitAddon.fit();
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="fp-builder">
      <div className="fp-row">
        <div className="fp-label" />
        <div className="fp-control">
          <button
            type="button"
            className="btn btn-jupyter fp-build-btn"
            disabled={!canBuild || isBuilding}
            onClick={onBuild}
          >
            {isBuilding ? "Building..." : "Build image"}
          </button>
          {error ? <div className="form-text fp-error">{error}</div> : null}
        </div>
      </div>

      <div className="fp-terminal" ref={containerRef} />
    </div>
  );
}

