import * as React from "react";

export type Profile = {
  slug: string;
  display_name: string;
  description?: string;
  default?: boolean;
  kubespawner_override?: Record<string, unknown>;
  profile_options?: Record<string, unknown>;
};

export type SpawnerFormState = {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  profileList: Profile[];
};

export const SpawnerFormContext = React.createContext<SpawnerFormState | null>(null);

export function useSpawnerFormContext(): SpawnerFormState {
  const ctx = React.useContext(SpawnerFormContext);
  if (!ctx) {
    throw new Error("useSpawnerFormContext must be used within SpawnerFormProvider");
  }
  return ctx;
}

export function SpawnerFormProvider(props: { children: React.ReactNode; profileList: Profile[] }) {
  const { profileList } = props;

  const defaultProfile =
    profileList.find((p) => p.default === true) ?? profileList[0] ?? null;

  const [profile, setProfile] = React.useState<Profile | null>(defaultProfile);

  const value = React.useMemo<SpawnerFormState>(() => {
    return {
      profile,
      setProfile,
      profileList,
    };
  }, [profile, profileList]);

  return <SpawnerFormContext.Provider value={value}>{props.children}</SpawnerFormContext.Provider>;
}

