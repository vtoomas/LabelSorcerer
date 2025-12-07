import { useEffect, useState } from "react";
import type { DataSource, LabelLayout } from "../../domain/models";
import { sendMessage, type MessageResponse, type StatusPayload } from "../../shared/messaging";
import "./OptionsApp.css";

const HERO_STEPS = [
  {
    title: "Layouts",
    description: "Define conceptual variables, format, and canvas elements for every label."
  },
  {
    title: "DataSources",
    description: "Map the variables to CSS selectors, regex, and transforms for each web view."
  },
  {
    title: "Preview & Print",
    description: "Review resolved data in the popup and generate print-ready output."
  }
];

function unwrapPayload<T extends MessageResponse["type"]>(
  response: MessageResponse,
  expected: T
): Extract<MessageResponse, { type: T }>["payload"] {
  if (response.type === expected) {
    return response.payload as Extract<MessageResponse, { type: T }>["payload"];
  }

  if (response.type === "error") {
    throw new Error(response.payload.message);
  }

  throw new Error(`Unexpected response type: ${response.type}`);
}

export function OptionsApp() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [layouts, setLayouts] = useState<LabelLayout[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const responses = await Promise.all([
        sendMessage({ type: "getStatus" }),
        sendMessage({ type: "getLayouts" }),
        sendMessage({ type: "getDataSources" })
      ]);

      setStatus(unwrapPayload(responses[0], "status"));
      setLayouts(unwrapPayload(responses[1], "layouts"));
      setDataSources(unwrapPayload(responses[2], "dataSources"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="options-app">
      <section className="hero section">
        <div>
          <p className="eyebrow">LabelSorcerer</p>
          <h1>Design once, reuse everywhere.</h1>
        </div>
        <p className="hero-subhead">
          Phase 0 is ready; configure layouts, map data sources, then preview from the popup.
        </p>
      </section>

      {error && (
        <section className="section error-banner">
          <p>{error}</p>
        </section>
      )}

      <section className="section grid">
        <article className="card">
          <header>
            <div>
              <p className="eyebrow">Background</p>
              <h2>Status</h2>
            </div>
            <button type="button" onClick={() => void loadData()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </header>
          <div className="card-content">
            <p className="hint">{status?.message ?? "Fetching service worker health…"}</p>
            <dl>
              <div>
                <dt>Version</dt>
                <dd>{status?.version ?? "—"}</dd>
              </div>
              <div>
                <dt>Layouts</dt>
                <dd>{status?.layoutCount ?? 0}</dd>
              </div>
              <div>
                <dt>DataSources</dt>
                <dd>{status?.dataSourceCount ?? 0}</dd>
              </div>
              <div>
                <dt>Last check</dt>
                <dd>{status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : "—"}</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="card">
          <header>
            <div>
              <p className="eyebrow">Workflows</p>
              <h2>Roadmap</h2>
            </div>
          </header>
          <div className="card-content">
            <ol>
              {HERO_STEPS.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Layouts</p>
            <h2>Canvas configurations</h2>
          </div>
          <p className="hint">
            These layouts are mocked for Phase 0 but mirror the LabelLayout shape you'll build against.
          </p>
        </div>
        <ul className="item-list">
          {layouts.map((layout) => (
            <li key={layout.id}>
              <div>
                <strong>{layout.name}</strong>
                <p>
                  {layout.variables.length} variable{layout.variables.length === 1 ? "" : "s"} ·{" "}
                  {layout.elements.length} element{layout.elements.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="chip">Format #{layout.labelFormatId}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DataSources</p>
            <h2>Selector mappings</h2>
          </div>
          <p className="hint">Each entry defines selectors that feed the layout variables.</p>
        </div>
        <ul className="item-list">
          {dataSources.map((ds) => (
            <li key={ds.id}>
              <div>
                <strong>{ds.name}</strong>
                <p>{ds.urlPattern}</p>
              </div>
              <span className="chip">{ds.variableMappings.length} selectors</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
