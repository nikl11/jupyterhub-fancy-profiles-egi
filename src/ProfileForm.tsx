import * as React from "react";

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
  profile_options?: Record<string, unknown>;
};

type Props = {
  profileList: Profile[];
};

export function ProfileForm({ profileList }: Props) {
  const defaultProfile = React.useMemo(() => {
    return profileList.find((p) => p.default === true) || profileList[0];
  }, [profileList]);

  const [activeSlug, setActiveSlug] = React.useState<string>(
    defaultProfile?.slug ?? "",
  );

  const active = React.useMemo(() => {
    return profileList.find((p) => p.slug === activeSlug) || defaultProfile;
  }, [profileList, activeSlug, defaultProfile]);

  if (!active) {
    return (
      <div className="alert alert-warning">
        No profiles available. Check spawner profile_list configuration.
      </div>
    );
  }

  return (
    <div className="fp-page">
      <div className="fp-header">
        <h2 className="fp-title">Server Options</h2>
      </div>

      <div className="fp-card">
        {/* Hidden field actually submitted to JupyterHub */}
        <input
          type="radio"
          className="hidden"
          name="profile"
          value={active.slug}
          checked
          readOnly
        />

        <div className="fp-row">
          <div className="fp-label">
            <label htmlFor="fp-server-option" className="form-label">
              Server option
            </label>
          </div>

          <div className="fp-control">
            <select
              id="fp-server-option"
              className="form-select fp-select"
              value={active.slug}
              onChange={(e) => setActiveSlug(e.target.value)}
            >
              {profileList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.display_name ?? p.slug}
                </option>
              ))}
            </select>

            {active.description ? (
              <div className="form-text fp-help">{active.description}</div>
            ) : null}
          </div>
        </div>

        <div className="fp-launch">
          <button className="btn btn-jupyter fp-launch-btn" type="submit">
            Launch
          </button>
        </div>
      </div>
    </div>
  );
}
