import { useEffect, useMemo, useState } from "react";
import type { LabelLayout } from "../../domain/models";
import { sendMessage, type ResolvedVariable } from "../../shared/messaging";
import "./popup.css";

export function PopupApp(): JSX.Element {
  const [layouts, setLayouts] = useState<LabelLayout[]>([]);
  const [resolved, setResolved] = useState<ResolvedVariable[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [dataSourceName, setDataSourceName] = useState<string>("–");
  const [dataSourceId, setDataSourceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusText = useMemo(() => {
    if (loading) return "Refreshing…";
    if (dataSourceId === null) return "No matching data source for this page";
    return "Ready";
  }, [loading, dataSourceId]);

  useEffect(() => {
    void refreshContextAndEvaluate();
  }, []);

  const openOptions = (): void => {
    chrome.runtime.openOptionsPage?.();
  };

  const evaluate = async (sourceId: number) => {
    setLoading(true);
    setError(null);
    setResolved([]);
    try {
      const response = await sendMessage({ type: "evaluateDataSource", payload: { dataSourceId: sourceId } });
      if (response.type === "evaluationResult") {
        setResolved(response.payload.resolved);
      } else if (response.type === "error") {
        setError(response.payload.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshPreview = () => {
    void refreshContextAndEvaluate();
  };

  const refreshContextAndEvaluate = async () => {
    setLoading(true);
    setError(null);
    setResolved([]);
    try {
      const [layoutResponse, contextResponse] = await Promise.all([
        sendMessage({ type: "getLayouts" }),
        sendMessage({ type: "getActiveTabContext" })
      ]);

      if (layoutResponse.type === "layouts") {
        setLayouts(layoutResponse.payload);
        setSelectedLayoutId((prev) => {
          if (prev && layoutResponse.payload.some((layout) => layout.id === prev)) return prev;
          return layoutResponse.payload[0]?.id ?? null;
        });
      }

      if (contextResponse.type === "activeContext") {
        const context = contextResponse.payload;
        setDataSourceId(context.dataSourceId ?? null);
        setDataSourceName(context.dataSourceName ?? "No match");
        if (context.defaultLayoutId) {
          setSelectedLayoutId(context.defaultLayoutId);
        }
        if (context.dataSourceId !== null && context.dataSourceId !== undefined) {
          await evaluate(context.dataSourceId);
          return;
        }
        setLoading(false);
      } else if (contextResponse.type === "error") {
        setError(contextResponse.payload.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const printLabels = () => {
    window.print();
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
          <span className="meta-value">{dataSourceName}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Layout</span>
          <select
            className="layout-select"
            value={selectedLayoutId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedLayoutId(value ? Number(value) : null);
            }}
            disabled={layouts.length === 0}
          >
            {layouts.length === 0 && <option value="">No layouts found</option>}
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="popup-preview-section">
        <div className="preview-header">
          <span className="preview-title">Live preview</span>
          <span className="preview-status">{statusText}</span>
        </div>
        {error && <p className="preview-error">{error}</p>}
        <div className="preview-canvas">
          {resolved.length === 0 && !error && <div className="preview-placeholder">No values resolved yet.</div>}
          {resolved.map((field) => (
            <div key={field.key}>
              <div className="preview-field-label">{field.key}</div>
              <div className="preview-field-value">{field.value || "—"}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="popup-footer">
        <button type="button" className="button-secondary" onClick={refreshPreview} disabled={loading}>
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
