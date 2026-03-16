import * as React from "react";
import { useBinderBuild } from "./ImageBuilder";
import { useRepositoryField, RepoProvider } from "./hooks/useRepositoryField";

type ProfileOptionChoice = {
  display_name?: string;
  description?: string;
  default?: boolean;
  kubespawner_override?: Record<string, unknown>;
};

type SelectProfileOption = {
  display_name?: string;
  choices?: Record<string, ProfileOptionChoice>;
};

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
  profile_options?: {
    image?: SelectProfileOption;
    hardware?: SelectProfileOption;
  };
};

type BinderEnvironmentChoice = {
  key: string;
  title: string;
  description: string;
  isDefault?: boolean;
};

type Props = {
  profileList: Profile[];
};

type UiMode = "binder" | "environment";

const FALLBACK_BINDER_HARDWARE_CHOICES: BinderEnvironmentChoice[] = [
  {
    key: "binder-1cpu-4gb",
    title: "1 core + 4 GB RAM",
    description: "Small Binder session for lightweight notebooks.",
    isDefault: true,
  },
  {
    key: "binder-2cpu-8gb",
    title: "2 core + 8 GB RAM",
    description: "Balanced Binder session for common interactive workloads.",
  },
  {
    key: "binder-8cpu-32gb",
    title: "8 core + 32 GB RAM",
    description: "Larger Binder session for heavier analyses and parallel work.",
  },
  {
    key: "binder-32cpu-128gb",
    title: "32 core + 128 GB RAM",
    description: "Very large Binder session for demanding workloads.",
  },
];

function getDefaultProfileSlug(profileList: Profile[]) {
  return profileList.find((p) => p.default === true)?.slug ?? profileList[0]?.slug ?? "default";
}

function getBinderHardwareChoices(profile?: Profile): BinderEnvironmentChoice[] {
  const choices = profile?.profile_options?.hardware?.choices ?? {};
  const entries = Object.entries(choices).map(([key, value]) => ({
    key,
    title: value.display_name ?? key,
    description: value.description ?? "",
    isDefault: value.default === true,
  }));

  if (entries.length > 0) {
    return entries;
  }

  return FALLBACK_BINDER_HARDWARE_CHOICES;
}

function getInitialBinderChoice(choices: BinderEnvironmentChoice[]) {
  return choices.find((choice) => choice.isDefault)?.key ?? choices[0]?.key ?? "default";
}

function ensureFormField(name: string, value: string) {
  const all = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    `[name="${CSS.escape(name)}"]`
  );

  if (all.length > 0) {
    all.forEach((node) => {
      (node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value = value;
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

function ModeSwitch(props: {
  mode: UiMode;
  onChange: (mode: UiMode) => void;
  disabled: boolean;
}) {
  const { mode, onChange, disabled } = props;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <h2 className="h4 mb-1">Launch mode</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Switch between Binder build mode and the regular prebuilt environments.
            </div>
          </div>

          <div className="btn-group" role="group" aria-label="Launch mode selector">
            <button
              type="button"
              className={`btn ${mode === "binder" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => onChange("binder")}
              disabled={disabled}
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
      </div>
    </div>
  );
}

function ProfileCards(props: {
  title?: string;
  subtitle?: string;
  profileList: Profile[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  disabled: boolean;
}) {
  const {
    title = "Environment",
    subtitle = "Select an environment profile.",
    profileList,
    selectedSlug,
    onSelect,
    disabled,
  } = props;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h2 className="h4 mb-0">{title}</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              {subtitle}
            </div>
          </div>
        </div>

        <div className="d-grid gap-2">
          {profileList.map((p) => {
            const cardTitle = p.display_name ?? p.slug;
            const desc = p.description ?? "";
            const active = p.slug === selectedSlug;

            return (
              <label
                key={p.slug}
                htmlFor={`profile-${p.slug}`}
                className={`border rounded p-3 ${active ? "border-primary" : ""} ${disabled ? "opacity-75" : ""}`}
                style={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  userSelect: "none",
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold">{cardTitle}</div>
                    {desc ? (
                      <div
                        className="text-muted"
                        style={{ fontSize: "0.95rem" }}
                        dangerouslySetInnerHTML={{ __html: desc }}
                      />
                    ) : null}
                  </div>

                  <input
                    id={`profile-${p.slug}`}
                    type="radio"
                    name="select-profile"
                    value={p.slug}
                    checked={active}
                    onChange={() => onSelect(p.slug)}
                    disabled={disabled}
                  />
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BinderEnvironmentCards(props: {
  choices: BinderEnvironmentChoice[];
  selectedKey: string;
  onSelect: (key: string) => void;
  disabled: boolean;
}) {
  const { choices, selectedKey, onSelect, disabled } = props;

  return (
    <div className="card mb-3" aria-disabled={disabled}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h2 className="h4 mb-0">Environment</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Choose the hardware resources for the image that Binder builds from the repository above.
            </div>
          </div>
        </div>

        <div className="d-grid gap-2">
          {choices.map((choice) => {
            const active = choice.key === selectedKey;

            return (
              <label
                key={choice.key}
                htmlFor={`binder-environment-${choice.key}`}
                className={`border rounded p-3 ${active ? "border-primary" : ""} ${disabled ? "opacity-75" : ""}`}
                style={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  userSelect: "none",
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold">{choice.title}</div>
                    {choice.description ? (
                      <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                        {choice.description}
                      </div>
                    ) : null}
                  </div>

                  <input
                    id={`binder-environment-${choice.key}`}
                    type="radio"
                    name="binder-environment"
                    value={choice.key}
                    checked={active}
                    onChange={() => onSelect(choice.key)}
                    disabled={disabled}
                  />
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RepositoryForm(props: {
  repoState: ReturnType<typeof useRepositoryField>;
  disabled: boolean;
}) {
  const { repoState, disabled } = props;

  const PROVIDERS: Array<{ id: RepoProvider; label: string; hint: string }> = [
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
    return PROVIDERS.find((p) => p.id === repoState.provider) ?? PROVIDERS[0];
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
        <h3 className="h5 mb-2">Repository</h3>

        <div className="row g-2">
          <div className="col-12 col-md-3">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={repoState.provider}
              onChange={(e) => repoState.setProvider(e.target.value as RepoProvider)}
              disabled={disabled}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
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
    if (!buildState.logsOpen) return;
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [buildState.logs, buildState.logsOpen]);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h3 className="h5 mb-2">Build &amp; launch</h3>

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
  const list = props.profileList?.length
    ? props.profileList
    : [{ slug: "default", display_name: "Default", default: true }];

  const [uiMode, setUiMode] = React.useState<UiMode>("binder");
  const [selectedSlug, setSelectedSlug] = React.useState<string>(getDefaultProfileSlug(list));

  const selectedProfile = React.useMemo(() => {
    return list.find((profile) => profile.slug === selectedSlug) ?? list[0];
  }, [list, selectedSlug]);

  const binderChoices = React.useMemo(() => {
    return getBinderHardwareChoices(selectedProfile);
  }, [selectedProfile]);

  const [selectedBinderChoice, setSelectedBinderChoice] = React.useState<string>(
    getInitialBinderChoice(binderChoices)
  );

  const repoState = useRepositoryField();
  const [buildState, buildControls] = useBinderBuild();

  const lockInputs = buildState.status === "building";

  React.useEffect(() => {
    renamePrimarySubmitButton("Launch");
  }, []);

  React.useEffect(() => {
    ensureFormField("profile", selectedSlug);
  }, [selectedSlug]);

  React.useEffect(() => {
    setSelectedBinderChoice(getInitialBinderChoice(binderChoices));
    buildControls.reset();
  }, [selectedSlug, binderChoices, buildControls]);

  React.useEffect(() => {
    const imageChoiceField = `profile-option-${selectedSlug}--image`;
    const imageUnlistedField = `profile-option-${selectedSlug}--image--unlisted-choice`;
    const hardwareField = `profile-option-${selectedSlug}--hardware`;

    if (buildState.imageName) {
      ensureFormField(imageChoiceField, "unlisted_choice");
      ensureFormField(imageUnlistedField, buildState.imageName);
    } else {
      ensureFormField(imageChoiceField, "default");
      ensureFormField(imageUnlistedField, "");
    }

    if (uiMode === "binder") {
      ensureFormField(hardwareField, selectedBinderChoice || "default");
      return;
    }

    ensureFormField(hardwareField, getInitialBinderChoice(binderChoices));
  }, [buildState.imageName, binderChoices, selectedBinderChoice, selectedSlug, uiMode]);

  const handleModeChange = React.useCallback(
    (nextMode: UiMode) => {
      if (nextMode === uiMode) return;
      buildControls.reset();
      setUiMode(nextMode);
    },
    [buildControls, uiMode]
  );

  const handleBinderEnvironmentChange = React.useCallback(
    (choiceKey: string) => {
      buildControls.reset();
      setSelectedBinderChoice(choiceKey);
    },
    [buildControls]
  );

  return (
    <div>
      <ModeSwitch mode={uiMode} onChange={handleModeChange} disabled={lockInputs} />

      {uiMode === "binder" ? (
        <>
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

          <BinderEnvironmentCards
            choices={binderChoices}
            selectedKey={selectedBinderChoice}
            onSelect={handleBinderEnvironmentChange}
            disabled={lockInputs}
          />
        </>
      ) : (
        <ProfileCards
          profileList={list}
          selectedSlug={selectedSlug}
          onSelect={setSelectedSlug}
          disabled={lockInputs}
          subtitle="Select one of the existing prebuilt notebook environments."
        />
      )}
    </div>
  );
}
