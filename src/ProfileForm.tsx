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

function getBinderProfile(list: Profile[]) {
  return (
    list.find((profile) => profile.slug === "binder") ??
    list.find((profile) => (profile.display_name ?? "").toLowerCase().includes("binder")) ??
    null
  );
}

function isBinderProfile(profile: Profile) {
  return profile.slug === "binder" || (profile.display_name ?? "").toLowerCase().includes("binder");
}

function getDefaultChoiceSlug(option?: ProfileOption) {
  const choices = option?.choices ?? {};
  const explicitDefault = Object.entries(choices).find(([, choice]) => choice.default);
  if (explicitDefault) return explicitDefault[0];

  const first = Object.keys(choices)[0];
  return first ?? "";
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

function HardwareSelect(props: {
  profileSlug: string;
  option?: ProfileOption;
  selectedChoice: string;
  onSelect: (choice: string) => void;
  disabled: boolean;
}) {
  const { profileSlug, option, selectedChoice, onSelect, disabled } = props;
  const choices = option?.choices ?? {};
  const entries = Object.entries(choices);

  React.useEffect(() => {
    if (!selectedChoice || !choices[selectedChoice]) return;
    ensureFormField(`profile-option-${profileSlug}--hardware`, selectedChoice);
  }, [profileSlug, selectedChoice, choices]);

  if (entries.length === 0) return null;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <h5 className="mb-1">Environment</h5>
        <div className="text-muted mb-3" style={{ fontSize: "0.95rem" }}>
          Select hardware resources for the repository image that Binder will build.
        </div>

        <select
          className="form-select"
          value={selectedChoice}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
        >
          {entries.map(([choiceSlug, choice]) => (
            <option key={choiceSlug} value={choiceSlug}>
              {choice.display_name ?? choiceSlug}
            </option>
          ))}
        </select>

        {choices[selectedChoice]?.description ? (
          <div
            className="text-muted mt-2"
            style={{ fontSize: "0.95rem" }}
            dangerouslySetInnerHTML={{ __html: choices[selectedChoice].description ?? "" }}
          />
        ) : null}
      </div>
    </div>
  );
}

function RepositoryForm(props: {
  repoState: ReturnType<typeof useRepositoryField>;
  disabled: boolean;
}) {
  const { repoState, disabled } = props;

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
        <h5 className="mb-2">Repository</h5>

        <div className="row g-2">
          <div className="col-12 col-md-3">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={repoState.provider}
              onChange={(e) => repoState.setProvider(e.target.value as RepoProvider)}
              disabled={disabled}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Repository</label>
            <input
              className="form-control"
              value={repoState.repo}
              onChange={(e) => repoState.setRepo(e.target.value)}
              placeholder={providerMeta.hint}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
            <div className="form-text">
              Example: <code>{providerMeta.hint}</code>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Ref</label>
            <input
              className="form-control"
              value={repoState.ref}
              onChange={(e) => repoState.setRef(e.target.value)}
              placeholder="branch / tag / commit"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled || refNotApplicable}
            />
            <div className="form-text">Optional (defaults to HEAD).</div>
          </div>
        </div>

        <div className="row g-2 mt-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Subdirectory (optional)</label>
            <input
              className="form-control"
              value={repoState.subdir}
              onChange={(e) => repoState.setSubdir(e.target.value)}
              placeholder="path/inside/repo"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
            />
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
}) {
  const { buildState, buildControls, repo, lockInputs } = props;
  const isBuilding = buildState.status === "building";
  const logRef = React.useRef<HTMLPreElement | null>(null);

  React.useEffect(() => {
    if (!buildState.logsOpen || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [buildState.logs, buildState.logsOpen]);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="mb-2">Build &amp; launch</h5>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              buildControls.startBuild({
                provider: repo.provider,
                repo: repo.repo,
                ref: repo.ref,
                subdir: repo.subdir,
              })
            }
            disabled={lockInputs || isBuilding}
          >
            {isBuilding ? "Building..." : "Build image"}
          </button>

          <button type="button" className="btn btn-outline-secondary" onClick={buildControls.toggleLogs}>
            {buildState.logsOpen ? "Close logs" : "Open logs"}
          </button>

          {buildState.imageName ? <span className="badge text-bg-success">image ready</span> : null}
        </div>

        {buildState.error ? <div className="mt-2 alert alert-danger py-2 mb-0">{buildState.error}</div> : null}

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
  const binderProfile = React.useMemo(() => getBinderProfile(list), [list]);
  const environmentProfiles = React.useMemo(() => list.filter((profile) => !isBinderProfile(profile)), [list]);

  const defaultEnvironmentSlug =
    environmentProfiles.find((profile) => profile.default)?.slug ?? environmentProfiles[0]?.slug ?? list[0]?.slug ?? "default";

  const [mode, setMode] = React.useState<UIMode>(binderProfile ? "binder" : "environment");
  const [environmentSlug, setEnvironmentSlug] = React.useState<string>(defaultEnvironmentSlug);
  const [binderHardware, setBinderHardware] = React.useState<string>(
    getDefaultChoiceSlug(binderProfile?.profile_options?.hardware)
  );

  const repoState = useRepositoryField();
  const [buildState, buildControls] = useBinderBuild();
  const lockInputs = buildState.status === "building";

  const selectedProfileSlug = mode === "binder" && binderProfile ? binderProfile.slug : environmentSlug;
  const binderLaunchDisabled = mode === "binder" && (!binderProfile || lockInputs || !buildState.imageName);

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
    const defaultHardware = getDefaultChoiceSlug(binderProfile?.profile_options?.hardware);
    if (!binderProfile) return;
    if (!binderHardware || !(binderProfile.profile_options?.hardware?.choices ?? {})[binderHardware]) {
      setBinderHardware(defaultHardware);
    }
  }, [binderProfile, binderHardware]);

  React.useEffect(() => {
    ensureFormField("profile", selectedProfileSlug);
  }, [selectedProfileSlug]);

  React.useEffect(() => {
    if (mode !== "binder" || !binderProfile || !buildState.imageName) return;

    const imageChoiceField = `profile-option-${binderProfile.slug}--image`;
    const imageUnlistedField = `profile-option-${binderProfile.slug}--image--unlisted-choice`;

    ensureFormField(imageChoiceField, "unlisted_choice");
    ensureFormField(imageUnlistedField, buildState.imageName);
  }, [mode, binderProfile, buildState.imageName]);

  React.useEffect(() => {
    if (mode !== "binder" || !binderProfile || !binderHardware) return;
    ensureFormField(`profile-option-${binderProfile.slug}--hardware`, binderHardware);
  }, [mode, binderProfile, binderHardware]);

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
    buildControls.reset();
  };

  const handleBinderHardwareChange = (choiceSlug: string) => {
    setBinderHardware(choiceSlug);
    buildControls.reset();
  };

  return (
    <div>
      <ModeToggle mode={mode} onChange={handleModeChange} hasBinder={Boolean(binderProfile)} disabled={lockInputs} />

      {mode === "binder" && binderProfile ? (
        <>
          <HardwareSelect
            profileSlug={binderProfile.slug}
            option={binderProfile.profile_options?.hardware}
            selectedChoice={binderHardware}
            onSelect={handleBinderHardwareChange}
            disabled={lockInputs}
          />

          <RepositoryForm repoState={repoState} disabled={lockInputs} />

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
