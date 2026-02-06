import { useMemo } from "react";
import Permalink from "./components/Permalink";
import { ProfileOptions } from "./ProfileOptions";
import { useSpawnerFormContext } from "./state";
import "./form.css";

export function ProfileForm() {
  const { profile: selectedProfile, setProfile, profileList } =
    useSpawnerFormContext();

  const defaultProfile = useMemo(() => {
    return profileList.find((p) => p.default === true) || profileList[0];
  }, [profileList]);

  const active = selectedProfile || defaultProfile;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    const next = profileList.find((p) => p.slug === slug);
    if (next) setProfile(next);
  };

  if (!active) {
    return (
      <div className="alert alert-warning">
        No profiles available. Check spawner profile_list configuration.
      </div>
    );
  }

  const hasOptions = Boolean(active.profile_options);

  return (
    <div className="fp-page">
      <div className="fp-header">
        <h2 className="fp-title">Choose Your Environment</h2>
        <div className="fp-permalink">
          <Permalink />
        </div>
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
              Server option ZzZ
            </label>
          </div>

          <div className="fp-control">
            <select
              id="fp-server-option"
              className="form-select fp-select"
              value={active.slug}
              onChange={handleSelect}
            >
              {profileList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.display_name}
                </option>
              ))}
            </select>

            {active.description ? (
              <div className="form-text fp-help">{active.description}</div>
            ) : null}
          </div>
        </div>

        {hasOptions ? (
          <div className="fp-options">
            <ProfileOptions profile={active.slug} config={active.profile_options} />
          </div>
        ) : null}

        <div className="fp-launch">
          <button className="btn btn-jupyter fp-launch-btn" type="submit">
            Launch ZyZ
          </button>
        </div>
      </div>
    </div>
  );
}
