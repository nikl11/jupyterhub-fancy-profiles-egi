import * as React from "react";

export type RepoProvider = "github" | "gitlab" | "gist" | "zenodo" | "other";

export type RepoFormState = {
  provider: RepoProvider;
  setProvider: (p: RepoProvider) => void;

  repo: string;
  setRepo: (v: string) => void;

  ref: string;
  setRef: (v: string) => void;

  subdir: string;
  setSubdir: (v: string) => void;
};

export function useRepositoryField(initial?: Partial<Pick<RepoFormState, "provider" | "repo" | "ref" | "subdir">>): RepoFormState {
  const [provider, setProvider] = React.useState<RepoProvider>(initial?.provider ?? "github");
  const [repo, setRepo] = React.useState<string>(initial?.repo ?? "");
  const [ref, setRef] = React.useState<string>(initial?.ref ?? "");
  const [subdir, setSubdir] = React.useState<string>(initial?.subdir ?? "");

  return {
    provider,
    setProvider,
    repo,
    setRepo,
    ref,
    setRef,
    subdir,
    setSubdir,
  };
}

