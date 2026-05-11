import * as React from "react";
import { ImageBuilder } from "./ImageBuilder";

type Props = {
  profileSlug: string;
  // We keep config loosely typed because upstream profile_options can vary.
  config?: Record<string, unknown>;
};

export function ProfileOptions(props: Props) {
  const { profileSlug, config } = props;

  // Visual-only scaffolding: we render ImageBuilder always, then show a small debug block
  // for profile_options to confirm wiring during iteration.
  return (
    <div className="mt-3">
      <ImageBuilder />

      <div className="card">
        <div className="card-body">
          <h3 className="h5 mb-2">Profile options</h3>
          <div className="text-muted" style={{ fontSize: "0.95rem" }}>
            Visual-only placeholder. We will map real Binder options later.
          </div>

          <div className="mt-3">
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <span className="badge text-bg-primary">Selected</span>
              <code>{profileSlug}</code>
            </div>

            <details className="mt-2">
              <summary className="text-muted">Raw profile_options (debug)</summary>
              <pre className="mt-2 mb-0 p-2 border rounded bg-body-tertiary" style={{ maxHeight: 240, overflow: "auto" }}>
                {JSON.stringify(config ?? {}, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

