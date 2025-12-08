import { useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LabelFormat, LabelLayout } from "../../domain/models";
import { sendMessage, type ResolvedVariable } from "../../shared/messaging";
import { LabelCanvasDisplay } from "../shared/LabelCanvasDisplay";
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
    if (!activeLayout) {
      setError("No layout selected to print.");
      return;
    }
    const format = activeFormat;
    const html = buildPrintableHtml(activeLayout, format, resolvedMap);
    const height = 600;
    const width = 800;
    const printWindow = window.open("", "_blank", `width=${width + 60},height=${height + 60}`);
    if (!printWindow) {
      setError("Unable to open print window.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    const closeLater = () => {
      // printWindow.close();
    };
    printWindow.addEventListener("afterprint", closeLater, { once: true });
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
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
      <LabelCanvasDisplay
        layout={layout}
        format={format}
        resolvedMap={resolvedMap}
        scale={scale}
      />
    </div>
  );
}

function buildPrintableHtml(layout: LabelLayout, format: LabelFormat | null, resolvedMap: Record<string, string>): string {
  const canvasMarkup = renderToStaticMarkup(
    <LabelCanvasDisplay layout={layout} format={format} resolvedMap={resolvedMap} scale={1} />,
  );
  const width = format?.widthPx ?? 600;
  const height = format?.heightPx ?? 320;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print preview</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f6f8fa;
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .canvas-wrapper {
      width: ${width}px;
      height: ${height}px;
    }
    @media print {
      body {
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  <div class="canvas-wrapper">
    ${canvasMarkup}
  </div>
</body>
</html>`;
}
