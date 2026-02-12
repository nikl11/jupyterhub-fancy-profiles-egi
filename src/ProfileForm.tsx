import { useContext, useMemo, useState } from "react";

import { SpawnerFormContext } from "./state";
import { PermalinkContext } from "./context/Permalink";
import { IProfile } from "./types/config";
import { ProfileOptions } from "./ProfileOptions";
import Permalink from "./components/Permalink";

function ProfileRadio({
  profile,
  checked,
  onChange,
}: {
  profile: IProfile;
  checked: boolean;
  onChange: () => void;
}) {
  const title = profile.display_name;
  const desc = profile.description ?? "";
  return (
    <label className="profile-card" style={{ cursor: "pointer" }}>
      <div className="profile-card__main">
        <input
          type="radio"
          name="profile-select"
          aria-label={`${title}${desc ? " " + desc : ""}`}
          checked={checked}
          onChange={onChange}
        />
        <div className="profile-card__text">
          <div className="profile-card__title">{title}</div>
          {desc ? <div className="profile-card__desc">{desc}</div> : null}
        </div>
      </div>
    </label>
  );
}

function getDefaultProfileSlug(profileList: IProfile[]) {
  return profileList.find((p) => p.default)?.slug ?? profileList[0]?.slug ?? "";
}

export default function ProfileForm() {
  const { profileList, profile, setProfile } = useContext(SpawnerFormContext);
  const { permalinkValues, permalinkParseError, setPermalinkValue } = useContext(PermalinkContext);

  const defaultSlug = useMemo(() => getDefaultProfileSlug(profileList), [profileList]);

  const permalinkProfile = permalinkValues["profile"];
  const initialSlug =
    permalinkProfile && profileList.some((p) => p.slug === permalinkProfile) ? permalinkProfile : defaultSlug;

  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);

  const selectedProfile = useMemo(
    () => profileList.find((p) => p.slug === selectedSlug) ?? null,
    [profileList, selectedSlug],
  );

  if (selectedProfile && profile?.slug !== selectedProfile.slug) {
    setProfile(selectedProfile);
  }
  if (selectedProfile) {
    setPermalinkValue("profile", selectedProfile.slug);
  }

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
    const p = profileList.find((x) => x.slug === slug) ?? null;
    setProfile(p);
    setPermalinkValue("profile", slug);
  };

  return (
    <div>
      {permalinkParseError ? (
        <div className="alert alert-warning" role="alert">
          Invalid permalink config. Some saved values could not be restored.
        </div>
      ) : null}

      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="h5 mb-0">Choose your environment</h2>
        <Permalink />
      </div>

      <div className="profile-list">
        {profileList.map((p) => (
          <ProfileRadio
            key={p.slug}
            profile={p}
            checked={p.slug === selectedSlug}
            onChange={() => handleSelect(p.slug)}
          />
        ))}
      </div>

      <input type="hidden" name="profile" value={selectedProfile?.slug ?? ""} />

      {selectedProfile?.profile_options ? (
        <div className="mt-3">
          <ProfileOptions profile={selectedProfile.slug} config={selectedProfile.profile_options} />
        </div>
      ) : null}

      <button className="btn btn-jupyter form-control mt-4" type="submit">
        Launch
      </button>
    </div>
  );
}
