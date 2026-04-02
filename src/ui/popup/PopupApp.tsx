import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LabelFormat, LabelLayout } from "../../domain/models";
import { sendMessage, type ResolvedVariable } from "../../shared/messaging";
import { LabelCanvasDisplay } from "../shared/LabelCanvasDisplay";
import type { PostPrintWebhookConfig } from "../../shared/webhook";
import { buildPrintWebhookPayload, createSamplePrintWebhookPayload, sendPrintWebhook } from "../../shared/webhook";
import { registerPrintWindowAfterPrint } from "./printWindowBehavior";
import "./popup.css";

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function PopupApp(): JSX.Element {
  const [layouts, setLayouts] = useState<LabelLayout[]>([]);
  const [formats, setFormats] = useState<LabelFormat[]>([]);
  const [resolved, setResolved] = useState<ResolvedVariable[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [stackedLayoutIds, setStackedLayoutIds] = useState<number[]>([]);
  const [storedLayoutIds, setStoredLayoutIds] = useState<number[]>([]);
  const [userLayoutOverride, setUserLayoutOverride] = useState(false);
  const [dataSourceName, setDataSourceName] = useState<string>("-");
  const [dataSourceId, setDataSourceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printWebhookConfig, setPrintWebhookConfig] = useState<PostPrintWebhookConfig | null>(null);
  const [closePrintWindowAfterPrint, setClosePrintWindowAfterPrint] = useState(true);

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
  const effectiveStackIds = stackedLayoutIds.length
    ? stackedLayoutIds
    : activeLayout
      ? [activeLayout.id]
      : [];
  const stackedLayouts = useMemo(
    () => effectiveStackIds
      .map((id) => layouts.find((layout) => layout.id === id))
      .filter((layout): layout is LabelLayout => Boolean(layout)),
    [layouts, effectiveStackIds],
  );
  const stackedFormats = useMemo(() => {
    const fallback = formats[0] ?? null;
    return stackedLayouts.map((layout) => formats.find((format) => format.id === layout.labelFormatId) ?? fallback);
  }, [formats, stackedLayouts]);
  const availableLayoutsToStack = useMemo(
    () => layouts.filter((layout) => !effectiveStackIds.includes(layout.id)),
    [layouts, effectiveStackIds],
  );
  const layoutLookup = useMemo(() => {
    const map: Record<number, LabelLayout> = {};
    for (const layout of layouts) {
      map[layout.id] = layout;
    }
    return map;
  }, [layouts]);
  const storedLayoutNames = storedLayoutIds.map((id) => layoutLookup[id]?.name ?? `Layout ${id}`);
  const storedStackLabel = storedLayoutNames.join(" + ");
  const isStoredStackActive = storedLayoutIds.length > 0 && arraysEqual(storedLayoutIds, stackedLayoutIds);
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

  useEffect(() => {
    if (!dataSourceId || stackedLayoutIds.length === 0) {
      return;
    }
    if (arraysEqual(stackedLayoutIds, storedLayoutIds)) {
      return;
    }
    const layoutIds = [...stackedLayoutIds];
    const payload = { dataSourceId, layoutIds };
    void sendMessage({ type: "saveLayoutStack", payload })
      .then((response) => {
        if (response.type === "layoutStackSaved") {
          setStoredLayoutIds(layoutIds);
        }
      })
      .catch((error) => {
        console.error("Failed to save layout stack", error);
      });
  }, [dataSourceId, stackedLayoutIds, storedLayoutIds]);

  useEffect(() => {
    let cancelled = false;
    const loadWebhookSettings = async () => {
      try {
        const response = await sendMessage({ type: "getPrintWebhookSettings" });
        if (cancelled) return;
        if (response.type === "printWebhookSettings") {
          setPrintWebhookConfig(response.payload);
        }
      } catch (err) {
        console.error("Failed to load print webhook settings", err);
      }
    };

    void loadWebhookSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPrintBehaviorSettings = async () => {
      try {
        const response = await sendMessage({ type: "getPrintBehaviorSettings" });
        if (cancelled) return;
        if (response.type === "printBehaviorSettings") {
          setClosePrintWindowAfterPrint(response.payload.closePrintWindowAfterPrint);
        }
      } catch (err) {
        console.error("Failed to load print behavior settings", err);
      }
    };

    void loadPrintBehaviorSettings();
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

  const applyPersistedStack = (stackIds: number[]): void => {
    setStoredLayoutIds(stackIds);
    if (stackIds.length === 0) {
      return;
    }
    setStackedLayoutIds(stackIds);
    if (!userLayoutOverride) {
      setSelectedLayoutId((prev) => {
        if (prev && prev === stackIds[0]) return prev;
        return stackIds[0];
      });
    }
  };

  const fetchStoredLayoutStack = async (sourceId: number, availableLayoutIds: number[]): Promise<void> => {
    try {
      const response = await sendMessage({ type: "getLayoutStack", payload: { dataSourceId: sourceId } });
      if (response.type === "layoutStack") {
        const filtered = response.payload.layoutIds.filter((id) => availableLayoutIds.includes(id));
        applyPersistedStack(filtered);
      }
    } catch (err) {
      console.error("Failed to load stored layout stack", err);
    }
  };

  const refreshPreview = () => {
    void refreshContextAndEvaluate();
  };

  const addLayoutToStack = (layoutId: number) => {
    setStackedLayoutIds((prev) => (prev.includes(layoutId) ? prev : [...prev, layoutId]));
    setUserLayoutOverride(true);
  };

  const removeLayoutFromStack = (layoutId: number) => {
    setStackedLayoutIds((prev) => {
      const next = prev.filter((id) => id !== layoutId);
      if (next.length > 0) return next;
      if (selectedLayoutId !== null) return [selectedLayoutId];
      return prev;
    });
    setUserLayoutOverride(true);
  };

  const handleStackAddChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const layoutId = Number(event.target.value);
    if (layoutId && !stackedLayoutIds.includes(layoutId)) {
      addLayoutToStack(layoutId);
    }
    event.target.value = "";
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
        const availableLayoutIds = layoutResponse.type === "layouts"
          ? layoutResponse.payload.map((layout) => layout.id)
          : layouts.map((layout) => layout.id);
        const persistedStack = context.layoutStack?.filter((id) => availableLayoutIds.includes(id)) ?? [];
        if (persistedStack.length > 0) {
          applyPersistedStack(persistedStack);
        } else {
          setStoredLayoutIds([]);
          const fallbackStack = context.defaultLayoutId && availableLayoutIds.includes(context.defaultLayoutId)
            ? [context.defaultLayoutId]
            : availableLayoutIds.length
              ? [availableLayoutIds[0]]
              : [];
          if (fallbackStack.length > 0) {
            setStackedLayoutIds(fallbackStack);
            if (!userLayoutOverride) {
              setSelectedLayoutId((prev) => {
                if (prev && prev === fallbackStack[0]) return prev;
                return fallbackStack[0];
              });
            }
          }
          if (context.dataSourceId !== null && context.dataSourceId !== undefined) {
            await fetchStoredLayoutStack(context.dataSourceId, availableLayoutIds);
          }
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
    if (stackedLayouts.length === 0) {
      setError("No layout selected to print.");
      return;
    }
    const printableStack = stackedLayouts.map((layout, index) => ({
      layout,
      format: stackedFormats[index] ?? null,
    }));
    const html = buildPrintableHtml(printableStack, resolvedMap);
    const maxWidth = printableStack.reduce(
      (max, entry) => Math.max(max, entry.format?.widthPx ?? 600),
      0,
    );
    const totalHeight = printableStack.reduce(
      (sum, entry) => sum + (entry.format?.heightPx ?? 320),
      0,
    );
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      setError("Unable to open print window.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    const payload = buildPrintWebhookPayload(activeLayout, activeFormat, resolvedMap, dataSourceId ?? null, dataSourceName);
    registerPrintWindowAfterPrint(printWindow, {
      closePrintWindowAfterPrint,
      onAfterPrint: () => sendPrintWebhook(payload, printWebhookConfig),
    });
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
              const layoutId = value ? Number(value) : null;
              setSelectedLayoutId(layoutId);
              setStackedLayoutIds(layoutId !== null ? [layoutId] : []);
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
        <div className="stacked-layout-controls">
          <div className="stacked-layout-badges">
            {stackedLayouts.map((layout, index) => (
              <span key={`${layout.id}-${index}`} className="stacked-layout-chip">
                {layout.name}
                {index > 0 && (
                  <button
                    type="button"
                    className="stacked-layout-chip-remove"
                    onClick={() => removeLayoutFromStack(layout.id)}
                    aria-label="Remove layout from stack"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {availableLayoutsToStack.length > 0 && (
            <select className="stacked-layout-picker" value="" onChange={handleStackAddChange}>
              <option value="">Add layout to stack</option>
              {availableLayoutsToStack.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          )}
          {storedLayoutIds.length > 0 && (
            <p className={`stored-stack-note ${isStoredStackActive ? "stored-stack-note-active" : ""}`}>
              {isStoredStackActive ? "Stored combination in use:" : "Stored combination:"} {storedStackLabel}
            </p>
          )}
        </div>
      </section>

      <section className="popup-preview-section">
        <div className="preview-header">
          <span className="preview-title">Live preview</span>
          <span className="preview-status">{statusText}</span>
        </div>
        {error && <p className="preview-error">{error}</p>}
        <StackedPreview layouts={stackedLayouts} formats={stackedFormats} resolvedMap={resolvedMap} />
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

interface StackedPreviewProps {
  layouts: LabelLayout[];
  formats: (LabelFormat | null)[];
  resolvedMap: Record<string, string>;
}

function StackedPreview({ layouts, formats, resolvedMap }: StackedPreviewProps): JSX.Element {
  if (layouts.length === 0) {
    return <div className="preview-placeholder">No layout selected.</div>;
  }
  const widths = layouts.map((layout, index) => formats[index]?.widthPx ?? 600);
  const heights = layouts.map((layout, index) => formats[index]?.heightPx ?? 320);
  const maxWidth = widths.length > 0 ? Math.max(...widths) : 0;
  const totalHeight = heights.reduce((sum, value) => sum + value, 0);
  const maxPreviewWidth = 260;
  const scale = Math.min(1, maxPreviewWidth / Math.max(maxWidth, 1));
  return (
    <div className="preview-canvas-frame stacked-preview-frame" style={{ width: maxWidth * scale }}>
      <div
        className="stacked-preview-column"
        style={{ width: maxWidth * scale, height: totalHeight * scale }}
      >
        {layouts.map((layout, index) => {
          const format = formats[index];
          const width = format?.widthPx ?? maxWidth;
          const height = format?.heightPx ?? 320;
          return (
            <div
              key={`${layout.id}-${index}`}
              className="stacked-preview-cell"
              style={{ width: width * scale, height: height * scale }}
            >
              <LabelCanvasDisplay
                layout={layout}
                format={format}
                resolvedMap={resolvedMap}
                scale={scale}
                softCutsY={layout.softCutsY ?? []}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PrintableStackEntry = {
  layout: LabelLayout;
  format: LabelFormat | null;
};

function buildPrintableHtml(
  stack: PrintableStackEntry[],
  resolvedMap: Record<string, string>,
): string {
  if (stack.length === 0) {
    return "<!DOCTYPE html><html><body><div>No layout selected.</div></body></html>";
  }
  const maxWidth = stack.reduce((max, entry) => Math.max(max, entry.format?.widthPx ?? 600), 0);
  const totalHeight = stack.reduce(
    (sum, entry) => sum + (entry.format?.heightPx ?? 320),
    0,
  );
  const canvasSections = stack
    .map((entry) => {
      const width = entry.format?.widthPx ?? maxWidth;
      const height = entry.format?.heightPx ?? 320;
      const canvasMarkup = renderToStaticMarkup(
        <div className="label-print-root" style={{ width: `${width}px`, height: `${height}px` }}>
          <LabelCanvasDisplay
            layout={entry.layout}
            format={entry.format}
            resolvedMap={resolvedMap}
            scale={1}
            softCutsY={entry.layout.softCutsY ?? []}
          />
        </div>,
      );
      return `<div class="label-print-block" style="width:${width}px;height:${height}px">${canvasMarkup}</div>`;
    })
    .join("");
  const styles = buildPrintPageStyles(maxWidth, totalHeight);
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>LabelSorcerer Print</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="label-print-stack">
          ${canvasSections}
        </div>
      </body>
    </html>
  `;
}

function buildPrintPageStyles(width: number, height: number): string {
  return `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
    }
    .label-print-stack {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .label-print-block {
      flex: none;
      page-break-after: always;
    }
    .label-print-root {
      display: inline-flex;
      outline: none;
    }
    @page {
      size: ${width}px ${height}px;
      margin: 0;
    }
  `;
}

