import { useEffect, useMemo, useState } from "react";
import { QRCode } from "react-qr-code";
import type { LabelFormat, LabelLayout } from "../../domain/models";
import { sendMessage, type ResolvedVariable } from "../../shared/messaging";
import "./popup.css";

export function PopupApp(): JSX.Element {
  const [layouts, setLayouts] = useState<LabelLayout[]>([]);
  const [formats, setFormats] = useState<LabelFormat[]>([]);
  const [resolved, setResolved] = useState<ResolvedVariable[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [userLayoutOverride, setUserLayoutOverride] = useState(false);
  const [dataSourceName, setDataSourceName] = useState<string>("–");
  const [dataSourceId, setDataSourceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusText = useMemo(() => {
    if (loading) return "Refreshing…";
    if (dataSourceId === null) return "No matching data source for this page";
    return "Ready";
  }, [loading, dataSourceId]);

  const activeLayout = useMemo(
    () => layouts.find((layout) => layout.id === selectedLayoutId) ?? layouts[0] ?? null,
    [layouts, selectedLayoutId],
  );
  const activeFormat = useMemo(
    () => formats.find((format) => format.id === activeLayout?.labelFormatId) ?? formats[0] ?? null,
    [formats, activeLayout],
  );
  const resolvedMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of resolved) {
      map[item.key] = typeof item.value === "string" ? item.value : Array.isArray(item.value) ? item.value.join(", ") : "";
    }
    return map;
  }, [resolved]);

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
      const [layoutResponse, formatResponse, contextResponse] = await Promise.all([
        sendMessage({ type: "getLayouts" }),
        sendMessage({ type: "getLabelFormats" }),
        sendMessage({ type: "getActiveTabContext" })
      ]);

      if (layoutResponse.type === "layouts") {
        setLayouts(layoutResponse.payload);
        setSelectedLayoutId((prev) => {
          if (prev && layoutResponse.payload.some((layout) => layout.id === prev)) return prev;
          return layoutResponse.payload[0]?.id ?? null;
        });
      }

      if (formatResponse.type === "labelFormats") {
        setFormats(formatResponse.payload);
      }

      if (contextResponse.type === "activeContext") {
        const context = contextResponse.payload;
        setDataSourceId(context.dataSourceId ?? null);
        setDataSourceName(context.dataSourceName ?? "No match");
        if (context.defaultLayoutId && !userLayoutOverride) {
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
              setUserLayoutOverride(true);
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
        <PreviewCanvas layout={activeLayout} format={activeFormat} resolvedMap={resolvedMap} />
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

interface PreviewCanvasProps {
  layout: LabelLayout | null;
  format: LabelFormat | null;
  resolvedMap: Record<string, string>;
}

function PreviewCanvas({ layout, format, resolvedMap }: PreviewCanvasProps): JSX.Element {
  if (!layout) {
    return <div className="preview-placeholder">No layout selected.</div>;
  }

  const width = format?.widthPx ?? 600;
  const height = format?.heightPx ?? 320;
  const maxWidth = 260;
  const scale = Math.min(1, maxWidth / width);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return (
    <div className="preview-canvas-frame" style={{ width: scaledWidth }}>
      <div className="preview-canvas" style={{ width: scaledWidth, height: scaledHeight }}>
        {layout.elements.map((element) => {
          const style: React.CSSProperties = {
            left: element.positionX * scale,
            top: element.positionY * scale,
            width: element.width * scale,
            height: element.height * scale,
            fontSize: element.fontSize ? element.fontSize * scale : undefined,
          };
          if (element.type === "qrcode") {
            const qrValue =
              element.mode === "dynamic"
                ? resolvedMap[element.dynamicBinding?.variableKey ?? ""] ?? ""
                : element.staticContent ?? element.name;
            return (
              <div key={element.id} className="preview-element" style={style}>
                <QrPreview value={qrValue} size={Math.min(style.width as number, style.height as number)} />
              </div>
            );
          } else {
            const content =
              element.mode === "dynamic"
                ? resolvedMap[element.dynamicBinding?.variableKey ?? ""] ?? ""
                : element.staticContent ?? element.name;
            return (
              <div key={element.id} className="preview-element" style={style}>
                <div className="preview-element-value">{content || "—"}</div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

interface QrPreviewProps {
  value: string;
  size: number;
}

function QrPreview({ value, size }: QrPreviewProps): JSX.Element {
  const safeValue = value || " ";
  const dimension = Math.max(48, Math.floor(size));
  return (
    <div className="preview-qr-wrapper" style={{ width: dimension, height: dimension }}>
      <QRCode value={safeValue} size={dimension} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
