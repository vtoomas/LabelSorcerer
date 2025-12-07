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
    let cancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [layoutResponse, contextResponse] = await Promise.all([
          sendMessage({ type: "getLayouts" }),
          sendMessage({ type: "getActiveTabContext" }),
        ]);

        if (cancelled) return;
        if (layoutResponse.type === "layouts") {
          setLayouts(layoutResponse.payload);
          setSelectedLayoutId(layoutResponse.payload[0]?.id ?? null);
        }

        if (contextResponse.type === "activeContext") {
          setDataSourceId(contextResponse.payload.dataSourceId ?? null);
          setDataSourceName(contextResponse.payload.dataSourceName ?? "No match");
          if (contextResponse.payload.defaultLayoutId) {
            setSelectedLayoutId(contextResponse.payload.defaultLayoutId);
          }

          if (contextResponse.payload.dataSourceId !== null && contextResponse.payload.dataSourceId !== undefined) {
            await evaluate(contextResponse.payload.dataSourceId);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openOptions = (): void => {
    chrome.runtime.openOptionsPage?.();
  };

  const evaluate = async (sourceId: number) => {
    setLoading(true);
    setError(null);
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
    if (dataSourceId === null) {
      setError("No matching data source for this page.");
      return;
    }
    void evaluate(dataSourceId);
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
            onChange={(event) => setSelectedLayoutId(Number(event.target.value))}
          >
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

