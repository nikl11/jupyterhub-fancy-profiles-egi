export const GLOBAL_CSS = `
/* Prevent double submit buttons: hide legacy JupyterHub feedback block */
.feedback-container {
  display: none !important;
}

/* Theme variables */
html.jhfp-theme-egi {
  --jhfp-primary: #f37726;   /* orange */
  --jhfp-primary-hover: #d9651c;
  --jhfp-accent: #ffeddc;
}

html.jhfp-theme-eosc {
  --jhfp-primary: #1f6feb;   /* blue */
  --jhfp-primary-hover: #1858bd;
  --jhfp-accent: #e7f0ff;
}

/* Page layout */
.jhfp-page {
  margin-top: 0.5rem;
}

.jhfp-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.jhfp-title {
  margin: 0;
  font-weight: 700;
}

.jhfp-card {
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 12px;
  padding: 1rem;
  background: var(--bs-body-bg, #fff);
}

.jhfp-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 1rem;
}

@media (max-width: 992px) {
  .jhfp-grid {
    grid-template-columns: 1fr;
  }
}

/* Mode switch */
.jhfp-mode {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.jhfp-mode button {
  border-radius: 999px;
}

.jhfp-mode button.active {
  background: var(--jhfp-accent);
  border-color: rgba(0,0,0,0.12);
}

/* Profile list */
.jhfp-profile-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.jhfp-profile-item {
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 10px;
  padding: 0.75rem;
  cursor: pointer;
  background: var(--bs-body-bg, #fff);
}

.jhfp-profile-item:hover {
  border-color: rgba(0,0,0,0.22);
}

.jhfp-profile-item.active {
  border-color: var(--jhfp-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--jhfp-primary) 20%, transparent);
}

.jhfp-profile-name {
  margin: 0;
  font-weight: 700;
  font-size: 1.05rem;
}

.jhfp-profile-desc {
  margin: 0.15rem 0 0;
  opacity: 0.8;
  font-size: 0.95rem;
}

/* Primary button */
.jhfp-primary-btn {
  background: var(--jhfp-primary) !important;
  border-color: var(--jhfp-primary) !important;
  color: #fff !important;
  font-weight: 700;
}

.jhfp-primary-btn:hover {
  background: var(--jhfp-primary-hover) !important;
  border-color: var(--jhfp-primary-hover) !important;
}

.jhfp-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
`;
