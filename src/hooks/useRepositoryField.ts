import { ChangeEventHandler, FocusEventHandler, useCallback, useEffect, useMemo, useState } from "react";

export type BinderProvider = "gh" | "gl" | "gist" | "zenodo" | "git";

function extractFromUrl(pattern: RegExp, value: string): string | undefined {
  const match = pattern.exec(value);
  return match ? match[1] : undefined;
}

function normalize(value: string) {
  return (value ?? "").trim();
}

function parseRepo(provider: BinderProvider, raw: string): { repoId?: string; error?: string } {
  const value = normalize(raw);
  if (!value) return { repoId: undefined, error: undefined };

  switch (provider) {
    case "gh": {
      const orgRepo =
        /^[^/]+\/[^/]+$/.exec(value)?.[0] ??
        extractFromUrl(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+\/[^/]+)(?:\/)?$/i, value);
      if (!orgRepo) return { error: "Provide the repository as 'owner/repo' or a GitHub repo URL." };
      return { repoId: orgRepo };
    }
    case "gl": {
      const grpProj =
        /^[^/]+\/[^/]+$/.exec(value)?.[0] ??
        extractFromUrl(/^(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([^/]+\/[^/]+)(?:\/)?$/i, value);
      if (!grpProj) return { error: "Provide the project as 'group/project' or a GitLab project URL." };
      return { repoId: grpProj };
    }
    case "gist": {
      const userGist =
        /^[^/]+\/[0-9a-fA-F]+$/.exec(value)?.[0] ??
        /^[0-9a-fA-F]+$/.exec(value)?.[0] ??
        extractFromUrl(/^(?:https?:\/\/)?gist\.github\.com\/([^/]+\/[0-9a-fA-F]+)(?:\/)?$/i, value) ??
        extractFromUrl(/^(?:https?:\/\/)?gist\.github\.com\/([0-9a-fA-F]+)(?:\/)?$/i, value);
      if (!userGist) return { error: "Provide the gist as 'gist-id', 'user/gist-id', or a Gist URL." };
      return { repoId: userGist };
    }
    case "zenodo": {
      const numeric =
        /^[0-9]+$/.exec(value)?.[0] ??
        extractFromUrl(/(?:record|records)\/([0-9]+)/i, value) ??
        extractFromUrl(/(?:zenodo\.org\/)(?:.*\/)?([0-9]{4,})$/i, value) ??
        extractFromUrl(/(?:doi\.org\/10\.5281\/zenodo\.)([0-9]+)/i, value);
      if (!numeric)
        return { error: "Provide the Zenodo record id (e.g. 1234567) or a Zenodo/DOI URL containing it." };
      return { repoId: numeric };
    }
    case "git": {
      const url = /^(https?:\/\/|git@|ssh:\/\/).+/.test(value) ? value : "";
      if (!url) return { error: "Provide a git repository URL (https://..., ssh://..., git@...)." };
      return { repoId: url };
    }
    default:
      return { error: "Unsupported provider." };
  }
}

export default function useRepositoryField(provider: BinderProvider, defaultValue?: string) {
  const [value, setValue] = useState<string>(defaultValue || "");
  const [error, setError] = useState<string>();
  const [repoId, setRepoId] = useState<string>();

  useEffect(() => {
    if (defaultValue) {
      onBlur({} as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  useEffect(() => {
    onBlur({} as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const validate = useCallback(() => {
    setError(undefined);
    const { repoId, error } = parseRepo(provider, value);
    if (error) return error;
    if (!repoId) return "Enter a value.";
    return undefined;
  }, [provider, value]);

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  const onBlur: FocusEventHandler<HTMLInputElement> = useCallback(
    (_e) => {
      setRepoId(undefined);
      const err = validate();
      if (err) {
        setError(err);
      } else {
        const trimmedValue = normalize(value);
        const parsed = parseRepo(provider, trimmedValue);
        setRepoId(parsed.repoId);
        setValue(trimmedValue);
      }
    },
    [provider, validate, value],
  );

  return useMemo(
    () => ({
      repo: value,
      repoError: error,
      repoId,
      repoFieldProps: {
        value,
        onChange,
        onBlur,
      },
    }),
    [value, error, repoId, onChange, onBlur],
  );
}

