import { useMemo, useState } from "react";
import "./popup.css";

const previewFields = [
  { label: "Asset name", value: "At least 50 hallucinated citations…" },
  { label: "Asset key", value: "KEY-4321" },
  { label: "Location", value: "San Francisco HQ" }
];

export function PopupApp() {
  const [loading, setLoading] = useState(false);

  const statusText = useMemo(() => (loading ? "Refreshing…" : "Ready"), [loading]);

  const openOptions = () => {
    chrome.runtime.openOptionsPage?.();
  };

  const refreshPreview = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 900);
  };

  const printLabels = () => {
    // Placeholder for future print implementation.
    window.focus();
  };

  return (
    <div className="popup-card">
      <header className="popup-header">
        <div className="popup-logo">LS</div>
        <div className="popup-title-block">
          <span className="popup-title">LabelSorcerer</span>
          <span className="popup-subtitle">Live label preview</span>
        </div>
      </header>

      <section className="popup-meta">
        <div className="meta-row">
          <span className="meta-label">Active data source</span>
          <span className="meta-value">Jira Assets Detail View</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Layout</span>
          <select className="layout-select" value="Jira Asset Small Label" disabled>
            <option>Jira Asset Small Label</option>
          </select>
        </div>
      </section>

      <section className="popup-preview-section">
        <div className="preview-header">
          <span className="preview-title">Live preview</span>
          <span className="preview-status">{statusText}</span>
        </div>
        <div className="preview-canvas">
          {previewFields.map((field) => (
            <div key={field.label}>
              <div className="preview-field-label">{field.label}</div>
              <div className="preview-field-value">{field.value}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="popup-footer">
        <button
          type="button"
          className="button-secondary"
          onClick={refreshPreview}
          disabled={loading}
        >
          {loading ? "Re-evaluating…" : "Re-evaluate"}
        </button>
        <button type="button" className="button-primary" onClick={printLabels}>
          Print
        </button>
      </footer>

      <button type="button" className="popup-options-link" onClick={openOptions}>
        Open options
      </button>
    </div>
  );
}

