import * as React from "react";
import { useBinderBuild } from "./ImageBuilder";
import { useRepositoryField, RepoProvider } from "./hooks/useRepositoryField";

type ProfileChoice = {
  display_name?: string;
  description?: string;
  default?: boolean;
  kubespawner_override?: Record<string, unknown>;
};

type ProfileOption = {
  display_name?: string;
  choices?: Record<string, ProfileChoice>;
  dynamic_image_building?: {
    enabled?: boolean;
  };
};

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
  profile_options?: Record<string, ProfileOption>;
};

type Props = {
  profileList: Profile[];
};

type UIMode = "binder" | "environment";

function ensureFormField(name: string, value: string) {
  const nodes = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    `[name="${CSS.escape(name)}"]`
  );

  if (nodes.length > 0) {
    nodes.forEach((node) => {
      (node as HTMLInputElement).value = value;
    });
    return;
  }

  const form = document.querySelector<HTMLFormElement>("form");
  if (!form) return;

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

function renamePrimarySubmitButton(label: string) {
  const form = document.querySelector<HTMLFormElement>("form");
  if (!form) return;

  const btn = form.querySelector(`button[type="submit"], input[type="submit"]`);
  if (!btn) return;

  if (btn instanceof HTMLInputElement) btn.value = label;
  else (btn as HTMLButtonElement).textContent = label;
}

function setPrimarySubmitButtonDisabled(disabled: boolean) {
  const form = document.querySelector<HTMLFormElement>("form");
  if (!form) return;

  const btn = form.querySelector<HTMLButtonElement | HTMLInputElement>(
    `button[type="submit"], input[type="submit"]`
  );
  if (!btn) return;

  btn.disabled = disabled;
  btn.setAttribute("aria-disabled", disabled ? "true" : "false");
}

function isBinderProfile(profile: Profile) {
  const slug = (profile.slug ?? "").toLowerCase();
  const displayName = (profile.display_name ?? "").toLowerCase();
  const hasDynamicImageBuilding = Boolean(profile.profile_options?.image?.dynamic_image_building?.enabled);

  return hasDynamicImageBuilding || slug.startsWith("binder") || displayName.includes("binder");
}

function getDefaultBinderProfileSlug(profiles: Profile[]) {
  return profiles.find((profile) => profile.default)?.slug ?? profiles[0]?.slug ?? "";
}

function ModeToggle(props: {
  mode: UIMode;
  onChange: (mode: UIMode) => void;
  hasBinder: boolean;
  disabled: boolean;
}) {
  const { mode, onChange, hasBinder, disabled } = props;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <h2 className="h4 mb-1">Launch mode</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Switch between launching a Binder-built repository image and launching a prebuilt environment.
            </div>
          </div>

          <div className="btn-group" role="group" aria-label="Launch mode selector">
            <button
              type="button"
              className={`btn ${mode === "binder" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => onChange("binder")}
              disabled={disabled || !hasBinder}
            >
              Binder mode
            </button>
            <button
              type="button"
              className={`btn ${mode === "environment" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => onChange("environment")}
              disabled={disabled}
            >
              Environment only
            </button>
          </div>
        </div>

        {!hasBinder ? (
          <div className="alert alert-warning mt-3 mb-0 py-2">
            Binder profile was not found in <code>profileList</code>, so only Environment mode is available.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EnvironmentCards(props: {
  title: string;
  subtitle: string;
  profiles: Profile[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  disabled: boolean;
}) {
  const { title, subtitle, profiles, selectedSlug, onSelect, disabled } = props;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <h2 className="h4 mb-1">{title}</h2>
        <div className="text-muted mb-3" style={{ fontSize: "0.95rem" }}>
          {subtitle}
        </div>

        <div className="d-grid gap-2">
          {profiles.map((profile) => {
            const active = profile.slug === selectedSlug;
            return (
              <label
                key={profile.slug}
                htmlFor={`profile-${profile.slug}`}
                className={`border rounded p-3 ${active ? "border-primary" : ""} ${disabled ? "opacity-75" : ""}`}
                style={{ cursor: disabled ? "not-allowed" : "pointer", userSelect: "none" }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold">{profile.display_name ?? profile.slug}</div>
                    {profile.description ? (
                      <div
                        className="text-muted"
                        style={{ fontSize: "0.95rem" }}
                        dangerouslySetInnerHTML={{ __html: profile.description }}
                      />
                    ) : null}
                  </div>

                  <input
                    id={`profile-${profile.slug}`}
                    type="radio"
                    name="ui-profile-selector"
                    value={profile.slug}
                    checked={active}
                    onChange={() => onSelect(profile.slug)}
                    disabled={disabled}
                  />
                </div>
              </label>
            );
          })}
        </div>

        {/* This turns the environment selector into a dropdown instead of the card list above. */}
        {false ? (
          <div className="mt-3">
            <select
              className="form-select"
              value={selectedSlug}
              onChange={(e) => onSelect(e.target.value)}
              disabled={disabled}
            >
              {profiles.map((profile) => (
                <option key={profile.slug} value={profile.slug}>
                  {profile.display_name ?? profile.slug}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BinderProfileSelect(props: {
  profiles: Profile[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  disabled: boolean;
}) {
  const { profiles, selectedSlug, onSelect, disabled } = props;
  const selectedProfile = profiles.find((profile) => profile.slug === selectedSlug);

  if (profiles.length === 0) return null;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <h4 className="mb-1">Environment</h4>
        <div className="text-muted mb-3" style={{ fontSize: "0.95rem" }}>
          Select one of the available Binder launch configurations. These entries come directly from the static profile
          list in binder.yaml.
        </div>

        <select
          className="form-select"
          value={selectedSlug}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
        >
          {profiles.map((profile) => (
            <option key={profile.slug} value={profile.slug}>
              {profile.display_name ?? profile.slug}
            </option>
          ))}
        </select>

        {selectedProfile?.description ? (
          <div
            className="text-muted mt-2"
            style={{ fontSize: "0.95rem" }}
            dangerouslySetInnerHTML={{ __html: selectedProfile.description }}
          />
        ) : null}
      </div>
    </div>
  );
}

function RepositoryForm(props: {
  repoState: ReturnType<typeof useRepositoryField>;
  disabled: boolean;
  validationError: string;
  onRepositoryInputChange: () => void;
}) {
  const { repoState, disabled, validationError, onRepositoryInputChange } = props;

  const providers: Array<{ id: RepoProvider; label: string; hint: string }> = [
    { id: "github", label: "GitHub", hint: "owner/repo or https://github.com/owner/repo" },
    { id: "gitlab", label: "GitLab", hint: "group/repo or https://gitlab.com/group/repo" },
    { id: "gist", label: "Gist", hint: "gist id or https://gist.github.com/<user>/<id>" },
    { id: "zenodo", label: "Zenodo", hint: "DOI or record id (e.g. 10.5281/zenodo.3242074)" },
    { id: "figshare", label: "Figshare", hint: "DOI, article id or URL" },
    { id: "hydroshare", label: "Hydroshare", hint: "resource UUID or URL" },
    { id: "dataverse", label: "Dataverse", hint: "persistentId (doi:...) or dataset URL" },
    { id: "ckan", label: "CKAN", hint: "dataset URL (CKAN instance)" },
    { id: "git", label: "Git (URL)", hint: "git clone URL (https://... or git@...)" },
  ];

  const providerMeta = React.useMemo(() => {
    return providers.find((provider) => provider.id === repoState.provider) ?? providers[0];
  }, [repoState.provider]);

  const refNotApplicable =
    repoState.provider === "zenodo" ||
    repoState.provider === "figshare" ||
    repoState.provider === "hydroshare" ||
    repoState.provider === "dataverse" ||
    repoState.provider === "ckan";

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <h4 className="mb-2">Repository</h4>

        <div className="row g-2">
          <div className="col-12 col-md-2">
            <label className="form-label">Provider</label>
            <select
              className="form-select binder-provider-select"
              value={repoState.provider}
              onChange={(e) => {
                repoState.setProvider(e.target.value as RepoProvider);
                onRepositoryInputChange();
              }}
              disabled={disabled}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-10">
            <label className="form-label">Repository</label>
            <input
              className={`form-control ${validationError ? "is-invalid" : ""}`}
              value={repoState.repo}
              onChange={(e) => {
                repoState.setRepo(e.target.value);
                onRepositoryInputChange();
              }}
              placeholder={providerMeta.hint}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
            {validationError ? <div className="invalid-feedback">{validationError}</div> : null}
            <div className="form-text">
              Example: <code>{providerMeta.hint}</code>
            </div>
          </div>
        </div>

        <div className="row g-2 mt-2">
          <div className="col-12 col-md-5">
            <label className="form-label">Ref (branch, tag, or commit)</label>
            <input
              className="form-control"
              value={repoState.ref}
              onChange={(e) => {
                repoState.setRef(e.target.value);
                onRepositoryInputChange();
              }}
              placeholder="HEAD"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled || refNotApplicable}
            />
            <div className="form-text">Optional. HEAD is used by default.</div>
          </div>

          <div className="col-12 col-md-7">
            <label className="form-label">Subdirectory</label>
            <input
              className="form-control"
              value={repoState.subdir}
              onChange={(e) => {
                repoState.setSubdir(e.target.value);
                onRepositoryInputChange();
              }}
              placeholder="path/inside/repo"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
            <div className="form-text">Optional.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildAndLaunch(props: {
  buildState: ReturnType<typeof useBinderBuild>[0];
  buildControls: ReturnType<typeof useBinderBuild>[1];
  repo: { provider: RepoProvider; repo: string; ref: string; subdir: string };
  lockInputs: boolean;
  validationError: string;
  onValidationError: (message: string) => void;
}) {
  const { buildState, buildControls, repo, lockInputs, validationError, onValidationError } = props;
  const isBuilding = buildState.status === "building";
  const logRef = React.useRef<HTMLPreElement | null>(null);

  React.useEffect(() => {
    if (!buildState.logsOpen || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [buildState.logs, buildState.logsOpen]);

  const handleBuildClick = () => {
    if (!repo.repo.trim()) {
      onValidationError("Repository is required before building the image.");
      return;
    }

    onValidationError("");
    buildControls.startBuild({
      provider: repo.provider,
      repo: repo.repo,
      ref: repo.ref,
      subdir: repo.subdir,
    });
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h4 className="mb-2">Build &amp; launch</h4>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleBuildClick}
            disabled={lockInputs || isBuilding}
          >
            {isBuilding ? "Building..." : "Build image"}
          </button>

          <button type="button" className="btn btn-outline-secondary" onClick={buildControls.toggleLogs}>
            {buildState.logsOpen ? "Close logs" : "Open logs"}
          </button>

          {buildState.imageName ? <span className="badge text-bg-success">image ready</span> : null}
        </div>

        {validationError ? <div className="mt-2 alert alert-danger py-2 mb-0">{validationError}</div> : null}
        {!validationError && buildState.error ? (
          <div className="mt-2 alert alert-danger py-2 mb-0">{buildState.error}</div>
        ) : null}

        {!buildState.imageName ? (
          <div className="mt-2 text-muted" style={{ fontSize: "0.95rem" }}>
            Launch stays disabled in Binder mode until the image build finishes successfully.
          </div>
        ) : null}

        {buildState.logsOpen ? (
          <div className="mt-2">
            <pre
              ref={logRef}
              className="p-2 border rounded bg-body-tertiary mb-0"
              style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}
            >
              {buildState.logs || "Logs will appear here once build starts."}
            </pre>

            {buildState.imageName ? (
              <div className="mt-2 text-muted" style={{ fontSize: "0.9rem" }}>
                Built image: <code>{buildState.imageName}</code>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function App(props: Props) {
  const list = props.profileList ?? [];
  const binderProfiles = React.useMemo(() => list.filter((profile) => isBinderProfile(profile)), [list]);
  const environmentProfiles = React.useMemo(() => list.filter((profile) => !isBinderProfile(profile)), [list]);

  const defaultEnvironmentSlug =
    environmentProfiles.find((profile) => profile.default)?.slug ??
    environmentProfiles[0]?.slug ??
    list[0]?.slug ??
    "default";

  const defaultBinderSlug = React.useMemo(() => getDefaultBinderProfileSlug(binderProfiles), [binderProfiles]);

  const [mode, setMode] = React.useState<UIMode>(binderProfiles.length > 0 ? "binder" : "environment");
  const [environmentSlug, setEnvironmentSlug] = React.useState<string>(defaultEnvironmentSlug);
  const [binderProfileSlug, setBinderProfileSlug] = React.useState<string>(defaultBinderSlug);
  const [binderValidationError, setBinderValidationError] = React.useState<string>("");

  const repoState = useRepositoryField();
  const [buildState, buildControls] = useBinderBuild();
  const lockInputs = buildState.status === "building";

  const selectedProfileSlug = mode === "binder" && binderProfileSlug ? binderProfileSlug : environmentSlug;
  const selectedBinderProfile = React.useMemo(
    () => binderProfiles.find((profile) => profile.slug === binderProfileSlug) ?? null,
    [binderProfiles, binderProfileSlug]
  );
  const binderLaunchDisabled = mode === "binder" && (!selectedBinderProfile || lockInputs || !buildState.imageName);

  React.useEffect(() => {
    renamePrimarySubmitButton("Launch");
  }, []);

  React.useEffect(() => {
    setPrimarySubmitButtonDisabled(binderLaunchDisabled);
  }, [binderLaunchDisabled]);

  React.useEffect(() => {
    return () => {
      setPrimarySubmitButtonDisabled(false);
    };
  }, []);

  React.useEffect(() => {
    if (!environmentProfiles.some((profile) => profile.slug === environmentSlug)) {
      setEnvironmentSlug(defaultEnvironmentSlug);
    }
  }, [environmentProfiles, environmentSlug, defaultEnvironmentSlug]);

  React.useEffect(() => {
    if (!binderProfiles.some((profile) => profile.slug === binderProfileSlug)) {
      setBinderProfileSlug(defaultBinderSlug);
    }
  }, [binderProfiles, binderProfileSlug, defaultBinderSlug]);

  React.useEffect(() => {
    ensureFormField("profile", selectedProfileSlug);
  }, [selectedProfileSlug]);

  React.useEffect(() => {
    if (mode !== "binder" || !selectedBinderProfile || !buildState.imageName) return;

    const imageChoiceField = `profile-option-${selectedBinderProfile.slug}--image`;
    const imageUnlistedField = `profile-option-${selectedBinderProfile.slug}--image--unlisted-choice`;

    ensureFormField(imageChoiceField, "unlisted_choice");
    ensureFormField(imageUnlistedField, buildState.imageName);
  }, [mode, selectedBinderProfile, buildState.imageName]);

  const previousRepoSignature = React.useRef<string>("");

  React.useEffect(() => {
    const currentRepoSignature = JSON.stringify({
      provider: repoState.provider,
      repo: repoState.repo,
      ref: repoState.ref,
      subdir: repoState.subdir,
    });

    if (!previousRepoSignature.current) {
      previousRepoSignature.current = currentRepoSignature;
      return;
    }

    if (previousRepoSignature.current !== currentRepoSignature) {
      previousRepoSignature.current = currentRepoSignature;
      if (mode === "binder" && buildState.status !== "building") {
        buildControls.reset();
      }
    }
  }, [repoState.provider, repoState.repo, repoState.ref, repoState.subdir, mode, buildState.status, buildControls]);

  const handleModeChange = (nextMode: UIMode) => {
    setMode(nextMode);
    setBinderValidationError("");
    buildControls.reset();
  };

  const handleBinderProfileChange = (nextProfileSlug: string) => {
    setBinderProfileSlug(nextProfileSlug);
    setBinderValidationError("");
    buildControls.reset();
  };

  const handleRepositoryInputChange = () => {
    if (binderValidationError) {
      setBinderValidationError("");
    }
  };

  return (
    <div>
      <ModeToggle
        mode={mode}
        onChange={handleModeChange}
        hasBinder={binderProfiles.length > 0}
        disabled={lockInputs}
      />

      {mode === "binder" && binderProfiles.length > 0 ? (
        <>
          <BinderProfileSelect
            profiles={binderProfiles}
            selectedSlug={binderProfileSlug}
            onSelect={handleBinderProfileChange}
            disabled={lockInputs}
          />

          <RepositoryForm
            repoState={repoState}
            disabled={lockInputs}
            validationError={binderValidationError}
            onRepositoryInputChange={handleRepositoryInputChange}
          />

          <BuildAndLaunch
            buildState={buildState}
            buildControls={buildControls}
            repo={{
              provider: repoState.provider,
              repo: repoState.repo,
              ref: repoState.ref,
              subdir: repoState.subdir,
            }}
            lockInputs={lockInputs}
            validationError={binderValidationError}
            onValidationError={setBinderValidationError}
          />
        </>
      ) : (
        <EnvironmentCards
          title="Environment"
          subtitle="Select one of the available prebuilt environments."
          profiles={environmentProfiles}
          selectedSlug={environmentSlug}
          onSelect={setEnvironmentSlug}
          disabled={lockInputs}
        />
      )}
    </div>
  );
}
