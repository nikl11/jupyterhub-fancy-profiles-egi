import * as React from "react";
import { ImageBuilder } from "./ImageBuilder";

type Profile = {
  slug: string;
  display_name?: string;
  description?: string;
  default?: boolean;
};

type Props = {
  profileList: Profile[];
};

function ProfileCards(props: {
  profileList: Profile[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  const { profileList, selectedSlug, onSelect } = props;

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h2 className="h4 mb-0">Environment</h2>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Select an environment profile.
            </div>
          </div>
          <span className="badge text-bg-secondary">Preview</span>
        </div>

        <div className="d-grid gap-2">
          {profileList.map((p) => {
            const title = p.display_name ?? p.slug;
            const desc = p.description ?? "";
            const active = p.slug === selectedSlug;

            return (
              <label
                key={p.slug}
                htmlFor={`profile-${p.slug}`}
                className={`border rounded p-3 ${active ? "border-primary" : ""}`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold">{title}</div>
                    {desc ? (
                      <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                        {desc}
                      </div>
                    ) : null}
                  </div>

                  <input
                    id={`profile-${p.slug}`}
                    type="radio"
                    name="select-profile"
                    value={p.slug}
                    checked={active}
                    onChange={() => onSelect(p.slug)}
                  />
                </div>
              </label>
            );
          })}
        </div>

        {/* This is the field that actually gets submitted by JupyterHub spawn form */}
        <input type="hidden" name="profile" value={selectedSlug} />
      </div>
    </div>
  );
}

function OptionsPreview(props: { selectedSlug: string }) {
  const { selectedSlug } = props;

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="h5 mb-2">Options</h3>
        <div className="text-muted" style={{ fontSize: "0.95rem" }}>
          Visual-only placeholders. We will wire real functionality later.
        </div>

        <div className="mt-3">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <span className="badge text-bg-primary">Selected profile</span>
            <code>{selectedSlug}</code>
          </div>

          <div className="mt-3">
            <ImageBuilder />
          </div>

          <div className="mt-3 p-2 border rounded bg-body-tertiary">
            <div className="fw-semibold">Build & launch</div>
            <div className="text-muted" style={{ fontSize: "0.95rem" }}>
              Buttons below are visual-only for now.
            </div>
            <div className="d-flex gap-2 mt-2 flex-wrap">
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                Build image
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                Open logs
              </button>
            </div>
          </div>
        </div>

        <button className="btn btn-jupyter form-control mt-3" type="submit">
          Start
        </button>
      </div>
    </div>
  );
}

export function App(props: Props) {
  const list = props.profileList ?? [];
  const initial =
    list.find((p) => p.default === true)?.slug ?? list[0]?.slug ?? "default";

  const [selectedSlug, setSelectedSlug] = React.useState<string>(initial);

  return (
    <div>
      <ProfileCards
        profileList={list.length ? list : [{ slug: "default", display_name: "Default", default: true }]}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
      />
      <OptionsPreview selectedSlug={selectedSlug} />
    </div>
  );
}

