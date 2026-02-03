import { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from "react";

type ProviderId = "gh" | "gl" | "gist" | "zenodo" | "git" | string;

function normalizeInput(value: string) {
  return value.trim();
}

function tryUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function extractRepoId(provider: ProviderId, rawValue: string) {
  const value = normalizeInput(rawValue);
  if (!value) return undefined;

  // GitHub: org/repo or github.com/org/repo
  if (provider === "gh") {
    const direct = /^[^/]+\/[^/]+$/.exec(value);
    if (direct) return direct[0];

    const url = tryUrl(value);
    if (url && /(^|\.)github\.com$/i.test(url.hostname)) {
      const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    }
    return undefined;
  }

  // GitLab: group[/subgroup]/repo or any gitlab URL (we keep full path)
  if (provider === "gl") {
    if (!value.includes("://")) {
      const parts = value.split("/").filter(Boolean);
      if (parts.length >= 2) return parts.join("/");
    }

    const url = tryUrl(value);
    if (url) {
      const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      if (parts.length >= 2) return parts.join("/");
    }
    return undefined;
  }

  // Gist: user/gistid or gist.github.com/user/gistid (or gistid)
  if (provider === "gist") {
    const direct = /^[^/]+\/[^/]+$/.exec(value);
    if (direct) return direct[0];

    const url = tryUrl(value);
    if (url && /(^|\.)gist\.github\.com$/i.test(url.hostname)) {
      const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
      if (parts.length === 1) return parts[0];
    }
    return undefined;
  }

  // Zenodo: record id or DOI or zenodo URL
  if (provider === "zenodo") {
    const url = tryUrl(value);
    if (url && /(^|\.)zenodo\.org$/i.test(url.hostname)) {
      const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      // /record/<id> or /records/<id>
      if (parts.length >= 2 && (parts[0] === "record" || parts[0] === "records")) {
        return parts[1];
      }
      return parts.join("/");
    }

    const doiUrl = /^https?:\/\/doi\.org\/(.+)$/i.exec(value);
    if (doiUrl) return doiUrl[1];

    return value;
  }

  // Generic git URL mode: accept whatever user typed (validated elsewhere by repo2docker)
  if (provider === "git") {
    return value;
  }

  // Fallback: just return trimmed value
  return value;
}

export default function useRepositoryField(provider: ProviderId, defaultValue: string) {
  const [value, setValue] = useState<string>(defaultValue || "");
  const [error, setError] = useState<string>();
  const [repoId, setRepoId] = useState<string>();

  const requiredMessage = useMemo(() => {
    switch (provider) {
      case "gh":
        return "Provide the repository as 'org/repo' or a GitHub URL.";
      case "gl":
        return "Provide the repository as 'group/repo' (subgroups allowed) or a GitLab URL.";
      case "gist":
        return "Provide the gist as 'user/gistid' or a Gist URL.";
      case "zenodo":
        return "Provide a Zenodo record id or DOI.";
      case "git":
        return "Provide a git URL (https://..., ssh://..., git@...).";
      default:
        return "Provide a repository identifier.";
    }
  }, [provider]);

  const validate = () => {
    setError(undefined);
    const extracted = extractRepoId(provider, value);
    if (!extracted) return requiredMessage;
    return undefined;
  };

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  const onBlur = useCallback(() => {
    setRepoId(undefined);
    const err = validate();
    if (err) {
      setError(err);
    } else {
      const trimmedValue = value.trim();
      const extracted = extractRepoId(provider, trimmedValue);
      setRepoId(extracted);
      setValue(trimmedValue);
    }
  }, [value, provider, requiredMessage]);

  useEffect(() => {
    if (defaultValue) onBlur();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue, provider]);

  return {
    repo: value,
    repoError: error,
    repoId,
    repoFieldProps: {
      value,
      onChange,
      onBlur,
    },
  };
}
