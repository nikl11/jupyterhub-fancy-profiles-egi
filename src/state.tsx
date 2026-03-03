import { createContext, PropsWithChildren, useMemo, useState } from "react";
import { IJupytherHubWindowObject, IProfile } from "./types/config";

export interface ISpawnerFormState {
  profile: IProfile;
  setProfile: React.Dispatch<React.SetStateAction<IProfile>>;
  profileList: IProfile[];
}

const win = window as IJupytherHubWindowObject;
const profileListFromWindow: IProfile[] = win.profileList || [];

function getDefaultProfile(profileList: IProfile[]) {
  return profileList.find((p) => p.default) || profileList[0] || null;
}

export const SpawnerFormContext = createContext<ISpawnerFormState>(null);

export function SpawnerFormProvider({ children }: PropsWithChildren) {
  const profileList = profileListFromWindow;

  const defaultProfile = useMemo(() => getDefaultProfile(profileList), [profileList]);
  const [profile, setProfile] = useState<IProfile>(defaultProfile);

  const state = useMemo(
    () => ({
      profile,
      setProfile,
      profileList,
    }),
    [profile, profileList],
  );

  return <SpawnerFormContext.Provider value={state}>{children}</SpawnerFormContext.Provider>;
}
