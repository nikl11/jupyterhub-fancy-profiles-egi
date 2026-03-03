export const GLOBAL_CSS = `
/* Hide legacy submit blocks that cause double Start/Launch in some templates */
.feedback-container,
#spawn-form .feedback-container,
#spawn-form .form-actions {
  display: none !important;
}

.fp-page { max-width: 980px; margin: 0 auto; padding: 16px; }
.fp-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.fp-title { margin: 0; font-size: 22px; font-weight: 700; }
.fp-subtitle { color: rgba(0,0,0,.7); }

.fp-card { border: 1px solid rgba(0,0,0,.12); border-radius: 10px; padding: 14px; background: #fff; }
.fp-row { display: grid; grid-template-columns: 220px 1fr; gap: 12px; align-items: start; margin: 10px 0; }
.fp-label { padding-top: 6px; }
.fp-control { min-width: 0; }

.fp-help { margin-top: 6px; }
.fp-divider { height: 1px; background: rgba(0,0,0,.12); margin: 14px 0; }

.fp-launch { display: flex; justify-content: flex-end; margin-top: 14px; }
.fp-launch-btn { padding: 10px 16px; border-radius: 10px; font-weight: 700; }

.fp-binder { margin-top: 6px; }
.fp-builder { margin-top: 8px; }
.fp-build-btn { padding: 10px 14px; border-radius: 10px; font-weight: 700; }
.fp-error { color: #b00020; }

.fp-terminal { width: 100%; height: 320px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,.12); }
.fp-built { margin-top: 12px; }
.fp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }

/* Theme switch: controlled by html.jhfp-theme-egi / html.jhfp-theme-eosc */
html.jhfp-theme-egi .btn-jupyter { background: #f37726; border-color: #f37726; color: #fff; }
html.jhfp-theme-eosc .btn-jupyter { background: #1f6feb; border-color: #1f6feb; color: #fff; }

.btn-jupyter:hover { filter: brightness(0.95); }
`;

