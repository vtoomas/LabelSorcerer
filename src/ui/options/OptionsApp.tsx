import type { CSSProperties, FormEvent, JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import type { DataSource, LabelFormat, LabelLayout, LayoutElement, LayoutVariable } from "../../domain/models";
import { sendMessage, type MessageResponse, type ResolvedVariable } from "../../shared/messaging";
import type { PostPrintWebhookConfig, PrintWebhookMethod } from "../../shared/webhook";
import "./options-shell.css";

type OptionsSection = "layouts" | "dataSources" | "formats" | "importExport" | "settings";
type ToolbarElementType = "text" | "qrcode" | "image" | "shape";

const SNAP_GRID = 4;
const ATTRIBUTE_OPTIONS = ["", "href", "src", "value", "title", "aria-label", "data-id", "data-label", "custom"] as const;

const FALLBACK_FORMATS: LabelFormat[] = [
  {
    id: 1,
    name: "62 x 29 mm",
    widthPx: 620,
    heightPx: 290,
    marginTopPx: 10,
    marginBottomPx: 10,
    marginLeftPx: 10,
    marginRightPx: 10,
    description: "Sample wide label",
  },
  {
    id: 2,
    name: "57 x 32 mm",
    widthPx: 570,
    heightPx: 320,
    marginTopPx: 10,
    marginBottomPx: 10,
    marginLeftPx: 10,
    marginRightPx: 10,
    description: "Compact QR label",
  },
  {
    id: 3,
    name: "100 x 75 mm",
    widthPx: 1000,
    heightPx: 750,
    marginTopPx: 20,
    marginBottomPx: 20,
    marginLeftPx: 20,
    marginRightPx: 20,
    description: "Shipping style",
  },
];

const MOCK_LAYOUTS: LabelLayout[] = [
  {
    id: 1,
    name: "Jira Asset Small Label",
    labelFormatId: 1,
    variables: [
      { key: "asset_name", label: "Asset Name", multiple: false },
      { key: "asset_key", label: "Asset Key", multiple: false },
      { key: "location", label: "Location", multiple: false },
    ],
    elements: [
      {
        id: 100,
        name: "Asset title",
        type: "text",
        positionX: 32,
        positionY: 32,
        width: 360,
        height: 32,
        rotation: 0,
        fontSize: 16,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: {
          variableKey: "asset_name",
          overrideFontSize: 16,
          overridePrefix: "",
          overrideSuffix: "",
          overrideTrimWhitespace: true,
        },
      },
      {
        id: 101,
        name: "Asset key",
        type: "text",
        positionX: 32,
        positionY: 78,
        width: 280,
        height: 26,
        rotation: 0,
        fontSize: 13,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: {
          variableKey: "asset_key",
          overrideFontSize: 13,
          overridePrefix: "Key: ",
          overrideSuffix: "",
          overrideTrimWhitespace: true,
        },
      },
      {
        id: 102,
        name: "Location",
        type: "text",
        positionX: 32,
        positionY: 118,
        width: 320,
        height: 24,
        rotation: 0,
        fontSize: 12,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: {
          variableKey: "location",
          overrideFontSize: 12,
          overridePrefix: "",
          overrideSuffix: "",
          overrideTrimWhitespace: true,
        },
      },
      {
        id: 103,
        name: "QR",
        type: "qrcode",
        positionX: 460,
        positionY: 46,
        width: 96,
        height: 96,
        rotation: 0,
        fontSize: null,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: {
          variableKey: "asset_key",
          overridePrefix: "",
          overrideSuffix: "",
          overrideTrimWhitespace: true,
          overrideFontSize: null,
        },
      },
      {
        id: 104,
        name: "Divider",
        type: "shape",
        positionX: 32,
        positionY: 150,
        width: 524,
        height: 2,
        rotation: 0,
        fontSize: null,
        mode: "static",
        staticContent: null,
      },
    ],
  },
];

const MOCK_DATA_SOURCES: DataSource[] = [
  {
    id: 1,
    name: "Jira Assets Detail View",
    urlPattern: "https://jira.example.com/assets/*",
    defaultLayoutId: 1,
    variableMappings: [
      {
        key: "asset_name",
        cssSelector: ".title h1",
        multiple: false,
        trimWhitespace: true,
        prefix: "",
        suffix: "",
      },
      {
        key: "asset_key",
        cssSelector: ".metadata .key",
        multiple: false,
        trimWhitespace: true,
        prefix: "KEY-",
        suffix: "",
      },
      {
        key: "location",
        cssSelector: ".location-tag",
        multiple: false,
        trimWhitespace: true,
      },
    ],
  },
];

export function OptionsApp(): JSX.Element {
  const [section, setSection] = useState<OptionsSection>("layouts");
  const [formats, setFormats] = useState<LabelFormat[]>(FALLBACK_FORMATS);
  const [formatsStatus, setFormatsStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadFormats = async () => {
      try {
        const response = await sendMessage({ type: "getLabelFormats" });
        if (cancelled) return;
        setFormats(unwrapLabelFormats(response));
      } catch (err) {
        if (cancelled) return;
        setFormatsStatus(err instanceof Error ? err.message : String(err));
        setFormats(FALLBACK_FORMATS);
      }
    };
    void loadFormats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="options-shell">
      <aside className="options-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">LS</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-title">LabelSorcerer</span>
            <span className="sidebar-subtitle">Layouts & mappings</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <SidebarItem label="Layouts" icon="▤" active={section === "layouts"} onClick={() => setSection("layouts")} />
          <SidebarItem
            label="Data Sources"
            icon="⛁"
            active={section === "dataSources"}
            onClick={() => setSection("dataSources")}
          />
          <SidebarItem label="Label Formats" icon="⧉" active={section === "formats"} onClick={() => setSection("formats")} />
          <SidebarItem
            label="Import / Export"
            icon="⇅"
            active={section === "importExport"}
            onClick={() => setSection("importExport")}
          />
          <SidebarItem label="Settings" icon="⚙" active={section === "settings"} onClick={() => setSection("settings")} />
        </nav>
        <footer className="sidebar-footer">
          <span className="sidebar-version-label">Version</span>
          <span className="sidebar-version-value">0.1.0</span>
        </footer>
      </aside>

      <main className="options-main">
        {section === "layouts" && <LayoutsWorkspace formats={formats} />}
        {section === "dataSources" && <DataSourcesWorkspace fallbackLayouts={MOCK_LAYOUTS} />}
        {section === "formats" && <LabelFormatsWorkspace formats={formats} onChange={setFormats} />}
        {section === "importExport" && <ImportExportWorkspace />}
        {section === "settings" && <SettingsWorkspace />}
      </main>
    </div>
  );
}

interface SidebarItemProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ label, icon, active, onClick }: SidebarItemProps): JSX.Element {
  return (
    <button type="button" className={`sidebar-item ${active ? "is-active" : ""}`} onClick={onClick}>
      <span className="sidebar-item-icon" aria-hidden>
        {icon}
      </span>
      <span className="sidebar-item-label">{label}</span>
    </button>
  );
}

interface LayoutsWorkspaceProps {
  formats: LabelFormat[];
}

function LayoutsWorkspace({ formats }: LayoutsWorkspaceProps): JSX.Element {
  const [layouts, setLayouts] = useState<LabelLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<LabelLayout | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendMessage({ type: "getLayouts" });
        if (cancelled) return;
        setLayouts(unwrapLayouts(response));
      } catch (err) {
        if (cancelled) return;
        setError("Background not reachable. Using mock layouts.");
        setLayouts(MOCK_LAYOUTS);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureId = (layout: LabelLayout): LabelLayout => {
    if (layout.id && layout.id > 0) return layout;
    return { ...layout, id: Date.now() };
  };

  const upsertLayout = (layout: LabelLayout) => {
    setLayouts((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === layout.id);
      if (existingIndex === -1) {
        return [...prev, layout];
      }
      const copy = [...prev];
      copy[existingIndex] = layout;
      return copy;
    });
  };

  const handleSaveLayout = async (draft: LabelLayout) => {
    const layoutToSave = ensureId(draft);
    setStatus(null);
    try {
      const response = await sendMessage({ type: "saveLayout", payload: layoutToSave });
      const saved = unwrapLayoutSaved(response, layoutToSave);
      upsertLayout(saved);
      setStatus("Layout saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Keep local change so the UI can proceed even if background fails
      upsertLayout(layoutToSave);
    } finally {
      setEditingLayout(null);
    }
  };

  const handleDeleteLayout = async (layout: LabelLayout) => {
    const confirmed = window.confirm(`Delete layout "${layout.name}"?`);
    if (!confirmed) return;
    setStatus(null);
    try {
      await sendMessage({ type: "deleteLayout", payload: { id: layout.id } });
      setLayouts((prev) => prev.filter((item) => item.id !== layout.id));
      setStatus("Layout deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDuplicateLayout = (layout: LabelLayout) => {
    const copy = duplicateLayout(layout);
    setEditingLayout(copy);
  };

  const handleCreateLayout = () => {
    const baseFormat = formats[0] ?? FALLBACK_FORMATS[0];
    setEditingLayout(createBlankLayout(baseFormat));
  };

  if (editingLayout) {
    return (
      <LayoutEditorView
        formats={formats}
        initialLayout={editingLayout}
        onSave={handleSaveLayout}
        onCancel={() => setEditingLayout(null)}
        onDelete={() => handleDeleteLayout(editingLayout)}
      />
    );
  }

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Layouts</p>
          <h1>Design once, reuse everywhere</h1>
          <p className="workspace-subtitle">
            Mocked UI for layout design. Create, duplicate, or edit label canvases with conceptual variables.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={handleCreateLayout} disabled={loading}>
          + Create layout
        </button>
      </header>

      <div className="workspace-card">
        {error && <p className="workspace-error">{error}</p>}
        {status && <p className="workspace-status">{status}</p>}
        <LayoutsListView
          layouts={layouts}
          loading={loading}
          onEditLayout={setEditingLayout}
          onDuplicateLayout={handleDuplicateLayout}
          onDeleteLayout={handleDeleteLayout}
        />
      </div>
    </section>
  );
}

interface DataSourcesWorkspaceProps {
  fallbackLayouts: LabelLayout[];
}

function DataSourcesWorkspace({ fallbackLayouts }: DataSourcesWorkspaceProps): JSX.Element {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [layouts, setLayouts] = useState<LabelLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sourcesResponse, layoutsResponse] = await Promise.all([
          sendMessage({ type: "getDataSources" }),
          sendMessage({ type: "getLayouts" }),
        ]);
        if (cancelled) return;
        setSources(unwrapDataSources(sourcesResponse));
        setLayouts(unwrapLayouts(layoutsResponse));
      } catch {
        if (cancelled) return;
        setError("Background not reachable. Using mock data sources.");
        setSources(MOCK_DATA_SOURCES);
        setLayouts(fallbackLayouts);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fallbackLayouts]);

  const ensureId = (source: DataSource): DataSource => {
    if (source.id && source.id > 0) return source;
    return { ...source, id: Date.now() };
  };

  const upsertSource = (source: DataSource) => {
    setSources((prev) => {
      const existing = prev.findIndex((item) => item.id === source.id);
      if (existing === -1) return [...prev, source];
      const copy = [...prev];
      copy[existing] = source;
      return copy;
    });
  };

  const handleSaveSource = async (draft: DataSource) => {
    const toSave = ensureId(draft);
    setStatus(null);
    try {
      const response = await sendMessage({ type: "saveDataSource", payload: toSave as any });
      const saved = unwrapDataSourceSaved(response, toSave);
      upsertSource(saved);
      setStatus("Data source saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      upsertSource(toSave);
    } finally {
      setEditingSource(null);
    }
  };

  const handleDeleteSource = async (source: DataSource) => {
    const confirmed = window.confirm(`Delete data source "${source.name}"?`);
    if (!confirmed) return;
    setStatus(null);
    try {
      await sendMessage({ type: "deleteDataSource", payload: { id: source.id } });
      setSources((prev) => prev.filter((item) => item.id !== source.id));
      setStatus("Data source deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDuplicate = (source: DataSource) => {
    const copy = { ...source, id: 0, name: `${source.name} (copy)` };
    setEditingSource(copy);
  };

  const handleCreate = () => {
    const baseLayout = layouts[0] ?? fallbackLayouts[0];
    const defaultMappings = (baseLayout?.variables ?? []).map((variable) => ({
      key: variable.key,
      cssSelector: "",
      multiple: variable.multiple,
      trimWhitespace: true,
    }));
    setEditingSource({
      id: 0,
      name: "New data source",
      urlPattern: "https://example.com/*",
      defaultLayoutId: baseLayout?.id ?? 1,
      variableMappings: defaultMappings,
    });
  };

  if (editingSource) {
    return (
      <DataSourceEditor
        dataSource={editingSource}
        layouts={layouts.length ? layouts : fallbackLayouts}
        onSave={handleSaveSource}
        onCancel={() => setEditingSource(null)}
        onDelete={() => handleDeleteSource(editingSource)}
      />
    );
  }

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Data sources</p>
          <h1>Connect page data to layouts</h1>
          <p className="workspace-subtitle">
            Map DOM selectors and transforms to conceptual variables. Mocked tester UI; storage is wired to background messaging.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={handleCreate} disabled={loading}>
          + Create data source
        </button>
      </header>

      <div className="workspace-card">
        {error && <p className="workspace-error">{error}</p>}
        {status && <p className="workspace-status">{status}</p>}
        <DataSourcesList
          dataSources={sources}
          layouts={layouts.length ? layouts : fallbackLayouts}
          loading={loading}
          onEdit={setEditingSource}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteSource}
        />
      </div>
    </section>
  );
}

interface LabelFormatsWorkspaceProps {
  formats: LabelFormat[];
  onChange: (formats: LabelFormat[]) => void;
}

function LabelFormatsWorkspace({ formats, onChange }: LabelFormatsWorkspaceProps): JSX.Element {
  const [editingFormat, setEditingFormat] = useState<LabelFormat | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingFormat(createBlankFormat());
  };

  const handleDuplicate = (format: LabelFormat) => {
    setEditingFormat({ ...format, id: 0, name: `${format.name} (copy)` });
  };

  const handleDelete = (format: LabelFormat) => {
    const confirmed = window.confirm(`Delete format "${format.name}"?`);
    if (!confirmed) return;
    setStatus(null);
    setError(null);
    void sendMessage({ type: "deleteLabelFormat", payload: { id: format.id } })
      .then(() => {
        onChange(formats.filter((entry) => entry.id !== format.id));
        setStatus("Format deleted");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  };

  const handleSave = (format: LabelFormat) => {
    const normalized = format.id > 0 ? format : { ...format, id: Date.now() };
    const existing = formats.findIndex((entry) => entry.id === normalized.id);
    if (existing === -1) {
      onChange([...formats, normalized]);
    } else {
      const copy = [...formats];
      copy[existing] = normalized;
      onChange(copy);
    }
    setStatus(null);
    setError(null);
    void sendMessage({ type: "saveLabelFormat", payload: normalized })
      .then((response) => {
        if (response.type === "labelFormatSaved") {
          const saved = response.payload;
          const nextFormats = formats.some((f) => f.id === saved.id)
            ? formats.map((f) => (f.id === saved.id ? saved : f))
            : [...formats, saved];
          onChange(nextFormats);
          setStatus("Format saved");
        } else if (response.type === "error") {
          setError(response.payload.message);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setEditingFormat(null));
  };

  if (editingFormat) {
    return (
      <LabelFormatEditor
        format={editingFormat}
        onSave={handleSave}
        onCancel={() => setEditingFormat(null)}
        onDelete={() => handleDelete(editingFormat)}
      />
    );
  }

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Label formats</p>
          <h1>Define label sizes & margins</h1>
          <p className="workspace-subtitle">Formats are stored with the extension. Update dimensions and margins as needed.</p>
        </div>
        <button type="button" className="primary-button" onClick={handleCreate}>
          + Create format
        </button>
      </header>
      <div className="workspace-card">
        {error && <p className="workspace-error">{error}</p>}
        {status && <p className="workspace-status">{status}</p>}
        <LabelFormatsList formats={formats} onEdit={setEditingFormat} onDuplicate={handleDuplicate} onDelete={handleDelete} />
      </div>
    </section>
  );
}

interface LabelFormatsListProps {
  formats: LabelFormat[];
  onEdit: (format: LabelFormat) => void;
  onDuplicate: (format: LabelFormat) => void;
  onDelete: (format: LabelFormat) => void;
}

function LabelFormatsList({ formats, onEdit, onDuplicate, onDelete }: LabelFormatsListProps): JSX.Element {
  return (
    <ul className="layout-list">
      {formats.map((format) => (
        <li key={format.id} className="layout-row">
          <div className="layout-row-main">
            <span className="layout-name">{format.name}</span>
            <span className="layout-meta">
              {format.widthPx} × {format.heightPx} px · Margins T{format.marginTopPx} R{format.marginRightPx} B{format.marginBottomPx} L
              {format.marginLeftPx}
            </span>
          </div>
          <div className="layout-row-actions">
            <button type="button" className="ghost-button" onClick={() => onEdit(format)}>
              Edit
            </button>
            <button type="button" className="ghost-button" onClick={() => onDuplicate(format)}>
              Duplicate
            </button>
            <button type="button" className="icon-button" aria-label="Delete format" onClick={() => onDelete(format)}>
              ×
            </button>
          </div>
        </li>
      ))}
      {formats.length === 0 && (
        <li className="layout-row empty-row">
          <div className="layout-row-main">
            <span className="layout-meta">No formats yet. Create one to begin.</span>
          </div>
        </li>
      )}
    </ul>
  );
}

interface LabelFormatEditorProps {
  format: LabelFormat;
  onSave: (format: LabelFormat) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function LabelFormatEditor({ format, onSave, onCancel, onDelete }: LabelFormatEditorProps): JSX.Element {
  const [draft, setDraft] = useState<LabelFormat>(format);

  const handleChange = (field: keyof LabelFormat, value: string | number | null) => {
    setDraft((prev) => ({ ...prev, [field]: value as any }));
  };

  const handleSave = () => {
    const sanitized = { ...draft, name: draft.name.trim() || "Untitled format" };
    onSave(sanitized);
  };

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Label format</p>
          <h1>Edit label dimensions</h1>
          <p className="workspace-subtitle">Widths/heights in px; margins define printable area.</p>
        </div>
        <div className="layout-editor-header-actions">
          <button type="button" className="ghost-button" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save format
          </button>
        </div>
      </header>

      <div className="workspace-card">
        <div className="layout-editor-meta-row">
          <label className="editor-field">
            <span>Name</span>
            <input className="editor-input" type="text" value={draft.name} onChange={(event) => handleChange("name", event.target.value)} />
          </label>
          <label className="editor-field">
            <span>Description</span>
            <input
              className="editor-input"
              type="text"
              value={draft.description ?? ""}
              onChange={(event) => handleChange("description", event.target.value || null)}
            />
          </label>
        </div>

        <div className="properties-grid">
          <label className="editor-field">
            <span>Width (px)</span>
            <input
              className="editor-input"
              type="number"
              value={draft.widthPx}
              onChange={(event) => handleChange("widthPx", Number(event.target.value))}
            />
          </label>
          <label className="editor-field">
            <span>Height (px)</span>
            <input
              className="editor-input"
              type="number"
              value={draft.heightPx}
              onChange={(event) => handleChange("heightPx", Number(event.target.value))}
            />
          </label>
          <label className="editor-field">
            <span>Margin top (px)</span>
            <input
              className="editor-input"
              type="number"
              value={draft.marginTopPx}
              onChange={(event) => handleChange("marginTopPx", Number(event.target.value))}
            />
          </label>
          <label className="editor-field">
            <span>Margin right (px)</span>
            <input
              className="editor-input"
              type="number"
              value={draft.marginRightPx}
              onChange={(event) => handleChange("marginRightPx", Number(event.target.value))}
            />
          </label>
          <label className="editor-field">
            <span>Margin bottom (px)</span>
            <input
              className="editor-input"
              type="number"
              value={draft.marginBottomPx}
              onChange={(event) => handleChange("marginBottomPx", Number(event.target.value))}
            />
          </label>
          <label className="editor-field">
            <span>Margin left (px)</span>
            <input
              className="editor-input"
              type="number"
              value={draft.marginLeftPx}
              onChange={(event) => handleChange("marginLeftPx", Number(event.target.value))}
            />
          </label>
        </div>

        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save format
          </button>
        </div>
      </div>
    </section>
  );
}



interface DataSourcesListProps {
  dataSources: DataSource[];
  layouts: LabelLayout[];
  loading: boolean;
  onEdit: (source: DataSource) => void;
  onDuplicate: (source: DataSource) => void;
  onDelete: (source: DataSource) => void;
}

function DataSourcesList({ dataSources, layouts, loading, onEdit, onDuplicate, onDelete }: DataSourcesListProps): JSX.Element {
  const layoutName = (id?: number | null) => layouts.find((layout) => layout.id === id)?.name ?? "No layout";
  return (
    <ul className="layout-list">
      {dataSources.map((source) => (
        <li key={source.id} className="layout-row">
          <div className="layout-row-main">
            <span className="layout-name">{source.name}</span>
            <span className="layout-meta">
              Pattern: {source.urlPattern} · Default layout: {layoutName(source.defaultLayoutId)}
            </span>
          </div>
          <div className="layout-row-actions">
            <button type="button" className="ghost-button" onClick={() => onEdit(source)} disabled={loading}>
              Edit
            </button>
            <button type="button" className="ghost-button" onClick={() => onDuplicate(source)} disabled={loading}>
              Duplicate
            </button>
            <button type="button" className="icon-button" aria-label="Delete data source" onClick={() => onDelete(source)} disabled={loading}>
              ×
            </button>
          </div>
        </li>
      ))}
      {dataSources.length === 0 && !loading && (
        <li className="layout-row empty-row">
          <div className="layout-row-main">
            <span className="layout-meta">No data sources yet. Create one to bind selectors to variables.</span>
          </div>
        </li>
      )}
    </ul>
  );
}

interface LayoutsListViewProps {
  layouts: LabelLayout[];
  loading: boolean;
  onEditLayout: (layout: LabelLayout) => void;
  onDuplicateLayout: (layout: LabelLayout) => void;
  onDeleteLayout: (layout: LabelLayout) => void;
}

function LayoutsListView({ layouts, loading, onEditLayout, onDuplicateLayout, onDeleteLayout }: LayoutsListViewProps): JSX.Element {
  return (
    <ul className="layout-list">
      {layouts.map((layout) => (
        <li key={layout.id} className="layout-row">
          <div className="layout-row-main">
            <span className="layout-name">{layout.name}</span>
            <span className="layout-meta">Format #{layout.labelFormatId}</span>
          </div>
          <div className="layout-row-actions">
            <button type="button" className="ghost-button" onClick={() => onEditLayout(layout)} disabled={loading}>
              Edit
            </button>
            <button type="button" className="ghost-button" onClick={() => onDuplicateLayout(layout)} disabled={loading}>
              Duplicate
            </button>
            <button type="button" className="icon-button" aria-label="Delete layout" onClick={() => onDeleteLayout(layout)} disabled={loading}>
              ×
            </button>
          </div>
        </li>
      ))}
      {layouts.length === 0 && !loading && (
        <li className="layout-row empty-row">
          <div className="layout-row-main">
            <span className="layout-meta">No layouts yet. Create your first layout to begin.</span>
          </div>
        </li>
      )}
    </ul>
  );
}

interface LayoutEditorViewProps {
  formats: LabelFormat[];
  initialLayout: LabelLayout;
  onSave: (layout: LabelLayout) => Promise<void> | void;
  onCancel: () => void;
  onDelete: () => void;
}

function LayoutEditorView({ formats, initialLayout, onSave, onCancel, onDelete }: LayoutEditorViewProps): JSX.Element {
  const [draft, setDraft] = useState<LabelLayout>(() => cloneLayout(initialLayout));
  const [selectedElementId, setSelectedElementId] = useState<number | null>(
    initialLayout.elements.length > 0 ? initialLayout.elements[0].id : null,
  );
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [editingVariable, setEditingVariable] = useState<LayoutVariable | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(cloneLayout(initialLayout));
    setSelectedElementId(initialLayout.elements[0]?.id ?? null);
  }, [initialLayout]);

  const selectedElement = useMemo(
    () => draft.elements.find((element) => element.id === selectedElementId) ?? null,
    [draft.elements, selectedElementId],
  );

  const usageCounts = useMemo(() => countVariableUsage(draft), [draft]);

  const activeFormat = useMemo(
    () => formats.find((format) => format.id === draft.labelFormatId) ?? formats[0],
    [draft.labelFormatId, formats],
  );

  const handleFieldChange = (field: keyof LabelLayout, value: string | number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddElement = (type: ToolbarElementType) => {
    const element = createElement(type, draft, activeFormat);
    setDraft((prev) => ({ ...prev, elements: [...prev.elements, element] }));
    setSelectedElementId(element.id);
  };

  const handleUpdateElement = (id: number, updater: (element: LayoutElement) => LayoutElement) => {
    setDraft((prev) => ({
      ...prev,
      elements: prev.elements.map((element) => (element.id === id ? updater(element) : element)),
    }));
  };

  const handleRemoveElement = (id: number) => {
    setDraft((prev) => ({ ...prev, elements: prev.elements.filter((element) => element.id !== id) }));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleVariableSave = (variable: LayoutVariable, originalKey?: string) => {
    setDraft((prev) => {
      const exists = prev.variables.some((item) => item.key === (originalKey ?? variable.key));
      const updatedVariables = exists
        ? prev.variables.map((item) => (item.key === (originalKey ?? variable.key) ? variable : item))
        : [...prev.variables, variable];

      const updatedElements = prev.elements.map((element) => {
        if (!element.dynamicBinding) return element;
        if (originalKey && element.dynamicBinding.variableKey === originalKey) {
          return {
            ...element,
            dynamicBinding: { ...element.dynamicBinding, variableKey: variable.key },
          };
        }
        return element;
      });

      return { ...prev, variables: updatedVariables, elements: updatedElements };
    });
    setShowVariableDialog(false);
    setEditingVariable(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const sanitized: LabelLayout = { ...draft, name: draft.name.trim() || "Untitled layout" };
      await onSave(sanitized);
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariableClick = () => {
    setEditingVariable(null);
    setShowVariableDialog(true);
  };

  const handleRemoveVariable = (variable: LayoutVariable) => {
    const confirmed = window.confirm(`Remove variable "${variable.label}"? Elements bound to it will be cleared.`);
    if (!confirmed) return;
    setDraft((prev) => {
      const filteredVariables = prev.variables.filter((item) => item.key !== variable.key);
      const updatedElements = prev.elements.map((element) => {
        if (element.dynamicBinding?.variableKey === variable.key) {
          return { ...element, mode: "static", dynamicBinding: undefined };
        }
        return element;
      });
      return { ...prev, variables: filteredVariables, elements: updatedElements };
    });
  };

  const handleEditVariableClick = (variable: LayoutVariable) => {
    setEditingVariable(variable);
    setShowVariableDialog(true);
  };

  const layerOptions = draft.elements.map((element) => ({ id: element.id, label: element.name }));

  return (
    <section className="layout-editor">
      <header className="layout-editor-header">
        <div className="layout-editor-title">
          <button type="button" className="ghost-button" onClick={onCancel}>
            ← Back
          </button>
          <h1>Layout editor</h1>
          <p className="workspace-subtitle">Follows the spec: three columns, toolbar, and property panel.</p>
        </div>
        <div className="layout-editor-header-actions">
          <button type="button" className="ghost-button" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={saving}>
            Save layout
          </button>
        </div>
      </header>

      <div className="layout-editor-meta-row">
        <label className="editor-field">
          <span>Layout name</span>
          <input
            className="editor-input"
            type="text"
            value={draft.name}
            onChange={(event) => handleFieldChange("name", event.target.value)}
            placeholder="Jira Asset Label"
          />
        </label>
        <label className="editor-field">
          <span>Format</span>
          <select
            className="editor-input"
            value={draft.labelFormatId}
            onChange={(event) => handleFieldChange("labelFormatId", Number(event.target.value))}
          >
            {formats.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
        </label>
        <div className="editor-field">
          <span>Layers</span>
          <select
            className="editor-input"
            value={selectedElementId ?? ""}
            onChange={(event) => setSelectedElementId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">Select element</option>
            {layerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="layout-editor-grid">
        <div className="layout-editor-column variables-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Variables</p>
              <h3 className="layout-editor-section-title">Conceptual fields</h3>
            </div>
            <button type="button" className="ghost-button" onClick={handleAddVariableClick}>
              + Add
            </button>
          </div>
          <p className="layout-editor-helper">
            Define the data fields your label needs. Each variable can bind to one or more elements.
          </p>
          <ul className="layout-editor-variable-list">
            {draft.variables.map((variable) => (
              <li key={variable.key} className="layout-editor-variable-row">
                <div className="variable-row-meta">
                  <div>
                    <div className="variable-label">{variable.label}</div>
                    <div className="variable-key">key: {variable.key}</div>
                  </div>
                  <div className="variable-actions">
                    <span className="variable-usage">{usageCounts[variable.key] ?? 0} elements</span>
                    <div className="variable-action-buttons">
                      <button type="button" className="icon-button" onClick={() => handleEditVariableClick(variable)} aria-label="Edit variable">
                        ✎
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleRemoveVariable(variable)}
                        aria-label="Remove variable"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {draft.variables.length === 0 && <li className="variable-empty">No variables yet.</li>}
          </ul>
        </div>

        <div className="layout-editor-column canvas-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Elements</p>
              <h3 className="layout-editor-section-title">Canvas</h3>
            </div>
            <div className="canvas-toolbar">
              <button type="button" className="ghost-button" onClick={() => handleAddElement("text")}>
                + Text
              </button>
              <button type="button" className="ghost-button" onClick={() => handleAddElement("qrcode")}>
                + QR code
              </button>
              <button type="button" className="ghost-button" onClick={() => handleAddElement("image")}>
                + Image
              </button>
              <button type="button" className="ghost-button" onClick={() => handleAddElement("shape")}>
                + Shape
              </button>
              <label className="snap-toggle">
                <input type="checkbox" checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} /> Snap
              </label>
            </div>
          </div>
          <CanvasPreview
            layout={draft}
            format={activeFormat}
            selectedElementId={selectedElementId}
            snapEnabled={snapEnabled}
            onSelect={setSelectedElementId}
            onMove={(id, nextX, nextY) =>
              handleUpdateElement(id, (element) => ({
                ...element,
                positionX: nextX,
                positionY: nextY,
              }))
            }
          />
        </div>

        <div className="layout-editor-column properties-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Properties</p>
              <h3 className="layout-editor-section-title">Element details</h3>
            </div>
          </div>
          {!selectedElement && <p className="layout-editor-helper">Select an element to edit its properties.</p>}
          {selectedElement && (
            <PropertiesPanel
              element={selectedElement}
              variables={draft.variables}
              snapEnabled={snapEnabled}
              onUpdate={(updater) => handleUpdateElement(selectedElement.id, updater)}
              onRemove={() => handleRemoveElement(selectedElement.id)}
            />
          )}
        </div>
      </div>

      {error && <p className="workspace-error">{error}</p>}

      {showVariableDialog && (
        <VariableDialog
          variable={editingVariable}
          onCancel={() => {
            setShowVariableDialog(false);
            setEditingVariable(null);
          }}
          onSave={(variable) => handleVariableSave(variable, editingVariable?.key)}
        />
      )}
    </section>
  );
}

interface DataSourceEditorProps {
  dataSource: DataSource;
  layouts: LabelLayout[];
  onSave: (dataSource: DataSource) => Promise<void> | void;
  onCancel: () => void;
  onDelete: () => void;
}

function DataSourceEditor({ dataSource, layouts, onSave, onCancel, onDelete }: DataSourceEditorProps): JSX.Element {
  const [draft, setDraft] = useState<DataSource>(() => ({ ...dataSource, variableMappings: dataSource.variableMappings.map((m) => ({ ...m })) }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ResolvedVariable>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});

  const selectedLayout = useMemo(
    () => layouts.find((layout) => layout.id === draft.defaultLayoutId) ?? layouts[0],
    [draft.defaultLayoutId, layouts],
  );

  useEffect(() => {
    if (!selectedLayout) return;
    setDraft((prev) => ensureMappingsForLayout(prev, selectedLayout));
  }, [selectedLayout]);

  const handleMappingChange = (key: string, updater: (mapping: DataSource["variableMappings"][number]) => DataSource["variableMappings"][number]) => {
    setDraft((prev) => ({
      ...prev,
      variableMappings: prev.variableMappings.map((mapping) => (mapping.key === key ? updater(mapping) : mapping)),
    }));
  };

  const handleTestMapping = async (key: string) => {
    const mapping = draft.variableMappings.find((entry) => entry.key === key);
    if (!mapping) return;
    setTestingKey(key);
    setTestErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    try {
      const response = await sendMessage({ type: "testMappings", payload: { mappings: [mapping] } });
      if (response.type === "evaluationResult") {
        const first = response.payload.resolved[0];
        if (first) {
          setTestResults((prev) => ({ ...prev, [key]: first }));
        }
      } else if (response.type === "error") {
        setTestErrors((prev) => ({ ...prev, [key]: response.payload.message }));
      }
    } catch (err) {
      setTestErrors((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setTestingKey(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim() || "Untitled data source" });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="layout-editor">
      <header className="layout-editor-header">
        <div className="layout-editor-title">
          <button type="button" className="ghost-button" onClick={onCancel}>
            ← Back
          </button>
          <h1>Data source</h1>
          <p className="workspace-subtitle">Assign selectors and transforms for each layout variable.</p>
        </div>
        <div className="layout-editor-header-actions">
          <button type="button" className="ghost-button" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={saving}>
            Save data source
          </button>
        </div>
      </header>

      <div className="layout-editor-meta-row">
        <label className="editor-field">
          <span>Name</span>
          <input
            className="editor-input"
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Jira Assets Detail View"
          />
        </label>
        <label className="editor-field">
          <span>URL pattern</span>
          <input
            className="editor-input"
            type="text"
            value={draft.urlPattern}
            onChange={(event) => setDraft((prev) => ({ ...prev, urlPattern: event.target.value }))}
            placeholder="https://jira.example.com/assets/*"
          />
        </label>
        <label className="editor-field">
          <span>Default layout</span>
          <select
            className="editor-input"
            value={draft.defaultLayoutId ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, defaultLayoutId: Number(event.target.value) }))}
          >
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="layout-editor-grid" style={{ gridTemplateColumns: "320px minmax(540px, 1fr)" }}>
        <div className="layout-editor-column variables-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Variables</p>
              <h3 className="layout-editor-section-title">Required by layout</h3>
            </div>
          </div>
          <p className="layout-editor-helper">
            Variables come from the selected layout. Each needs a selector mapping on the right.
          </p>
          <ul className="layout-editor-variable-list">
            {(selectedLayout?.variables ?? []).map((variable) => (
              <li key={variable.key} className="layout-editor-variable-row">
                <div className="variable-row-meta">
                  <div>
                    <div className="variable-label">{variable.label}</div>
                    <div className="variable-key">key: {variable.key}</div>
                  </div>
                  <div className="variable-actions">
                    <span className="variable-usage">{variable.multiple ? "multiple" : "single"}</span>
                  </div>
                </div>
              </li>
            ))}
            {!selectedLayout && <li className="variable-empty">No layout selected.</li>}
          </ul>
        </div>

        <div className="layout-editor-column properties-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mappings</p>
              <h3 className="layout-editor-section-title">Selector & transforms</h3>
            </div>
          </div>
          <div className="mapping-stack">
            {(selectedLayout?.variables ?? []).map((variable) => {
              const mapping =
                draft.variableMappings.find((entry) => entry.key === variable.key) ??
                createEmptyMapping(variable.key, variable.multiple);
              return (
                <div key={variable.key} className="mapping-card">
                  <div className="mapping-card-header">
                    <div>
                      <div className="mapping-title">{variable.label}</div>
                      <div className="mapping-key">key: {variable.key}</div>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleTestMapping(variable.key)}
                      disabled={testingKey === variable.key}
                    >
                      {testingKey === variable.key ? "Testing..." : "Test selector"}
                    </button>
                  </div>
                  <div className="properties-grid">
                    <label className="editor-field">
                      <span>CSS selector</span>
                      <input
                        className="editor-input"
                        type="text"
                        value={mapping.cssSelector}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, cssSelector: event.target.value }))
                        }
                        placeholder=".header h1"
                      />
                    </label>
                    <label className="editor-field">
                      <span>Attribute</span>
                      <select
                        className="editor-input"
                        value={resolveAttributeOption(mapping.attributeName)}
                        onChange={(event) => {
                          const value = event.target.value;
                          handleMappingChange(variable.key, (prev) => ({
                            ...prev,
                            attributeName:
                              value === "custom"
                                ? prev.attributeName && resolveAttributeOption(prev.attributeName) === "custom"
                                  ? prev.attributeName
                                  : "custom"
                                : value || null,
                          }));
                        }}
                      >
                        {ATTRIBUTE_OPTIONS.map((option) => (
                          <option key={option || "none"} value={option}>
                            {option === "" ? "textContent (default)" : option}
                          </option>
                        ))}
                      </select>
                    </label>
                    {resolveAttributeOption(mapping.attributeName) === "custom" && (
                      <label className="editor-field">
                        <span>Custom attribute</span>
                        <input
                          className="editor-input"
                          type="text"
                          value={resolveAttributeOption(mapping.attributeName) === "custom" ? mapping.attributeName ?? "" : ""}
                          onChange={(event) =>
                            handleMappingChange(variable.key, (prev) => ({ ...prev, attributeName: event.target.value }))
                          }
                          placeholder="data-custom"
                        />
                      </label>
                    )}
                    <label className="editor-field">
                      <span>Regex pattern</span>
                      <input
                        className="editor-input"
                        type="text"
                        value={mapping.regexPattern ?? ""}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, regexPattern: event.target.value || null }))
                        }
                        placeholder="(.*)"
                      />
                    </label>
                    <label className="editor-field">
                      <span>Regex index</span>
                      <input
                        className="editor-input"
                        type="number"
                        value={mapping.regexMatchIndex ?? 0}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, regexMatchIndex: Number(event.target.value) }))
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>Prefix</span>
                      <input
                        className="editor-input"
                        type="text"
                        value={mapping.prefix ?? ""}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, prefix: event.target.value || null }))
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>Suffix</span>
                      <input
                        className="editor-input"
                        type="text"
                        value={mapping.suffix ?? ""}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, suffix: event.target.value || null }))
                        }
                      />
                    </label>
                    <label className="editor-field checkbox-field">
                      <input
                        type="checkbox"
                        checked={Boolean(mapping.trimWhitespace)}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, trimWhitespace: event.target.checked }))
                        }
                      />
                      <span>Trim whitespace</span>
                    </label>
                    <label className="editor-field checkbox-field">
                      <input
                        type="checkbox"
                        checked={Boolean(mapping.multiple)}
                        onChange={(event) =>
                          handleMappingChange(variable.key, (prev) => ({ ...prev, multiple: event.target.checked }))
                        }
                      />
                      <span>Expect multiple values</span>
                    </label>
                  </div>
                  <MappingTestResult result={testResults[variable.key]} error={testErrors[variable.key]} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p className="workspace-error">{error}</p>}
    </section>
  );
}

interface CanvasPreviewProps {
  layout: LabelLayout;
  format?: LabelFormat;
  selectedElementId: number | null;
  onSelect: (id: number) => void;
  snapEnabled: boolean;
  onMove: (id: number, nextX: number, nextY: number) => void;
}

function CanvasPreview({ layout, format, selectedElementId, onSelect, snapEnabled, onMove }: CanvasPreviewProps): JSX.Element {
  const canvasWidth = format?.widthPx ?? 600;
  const canvasHeight = format?.heightPx ?? 320;
  const maxCanvasWidth = 720;
  const scale = Math.min(1, maxCanvasWidth / canvasWidth);
  const stageWidth = canvasWidth * scale;
  const stageHeight = canvasHeight * scale;
  const [drag, setDrag] = useState<{ id: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!drag) return;
      event.preventDefault();
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      const nextX = snapEnabled ? applySnap(drag.originX + dx) : drag.originX + dx;
      const nextY = snapEnabled ? applySnap(drag.originY + dy) : drag.originY + dy;
      onMove(drag.id, Math.max(0, nextX), Math.max(0, nextY));
    };
    const handleUp = () => setDrag(null);

    if (drag) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
    }
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, onMove, scale, snapEnabled]);

  return (
    <div
      className="layout-canvas-surface"
      style={{ width: stageWidth, height: stageHeight, margin: "0 auto" }}
      aria-label="Label canvas"
    >
      <div className="layout-canvas-inner" style={{ width: stageWidth, height: stageHeight }}>
        {layout.elements.map((element) => {
          const style: CSSProperties = {
            left: element.positionX * scale,
            top: element.positionY * scale,
            width: element.width * scale,
            height: element.height * scale,
            fontSize: element.fontSize ? element.fontSize * scale : undefined,
          };
          return (
              <button
                key={element.id}
                type="button"
                className={`layout-canvas-element ${selectedElementId === element.id ? "is-selected" : ""}`}
                style={style}
                onPointerDown={(event) => {
                  event.preventDefault();
                  onSelect(element.id);
                  setDrag({
                    id: element.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: element.positionX,
                    originY: element.positionY,
                  });
                }}
              >
                <span className="element-label">{element.name}</span>
                <span className="element-meta">
                  {element.type === "text" ? element.dynamicBinding?.variableKey || "static" : element.type}
                </span>
              </button>
            );
          })}
        </div>
      </div>
  );
}

interface PropertiesPanelProps {
  element: LayoutElement;
  variables: LayoutVariable[];
  snapEnabled: boolean;
  onUpdate: (updater: (element: LayoutElement) => LayoutElement) => void;
  onRemove: () => void;
}

function PropertiesPanel({ element, variables, snapEnabled, onUpdate, onRemove }: PropertiesPanelProps): JSX.Element {
  const isText = element.type === "text";
  const isDynamic = element.mode === "dynamic";

  const handleNumberChange = (field: keyof LayoutElement, value: number) => {
    onUpdate((prev) => ({ ...prev, [field]: snapEnabled ? applySnap(value) : value }));
  };

  const handleModeChange = (mode: "dynamic" | "static") => {
    onUpdate((prev) => ({
      ...prev,
      mode,
      dynamicBinding: mode === "dynamic" ? prev.dynamicBinding ?? { variableKey: variables[0]?.key ?? "" } : undefined,
      staticContent: mode === "static" ? prev.staticContent ?? "Text" : prev.staticContent,
    }));
  };

  return (
    <div className="properties-grid">
      <label className="editor-field">
        <span>Name</span>
        <input
          className="editor-input"
          type="text"
          value={element.name}
          onChange={(event) => onUpdate((prev) => ({ ...prev, name: event.target.value }))}
        />
      </label>

      <div className="editor-field">
        <span>Mode</span>
        <div className="mode-toggle">
          <button
            type="button"
            className={`ghost-button ${isDynamic ? "is-active" : ""}`}
            onClick={() => handleModeChange("dynamic")}
          >
            Dynamic
          </button>
          <button
            type="button"
            className={`ghost-button ${!isDynamic ? "is-active" : ""}`}
            onClick={() => handleModeChange("static")}
          >
            Static
          </button>
        </div>
      </div>

      {isDynamic && (
        <label className="editor-field">
          <span>Variable</span>
          <select
            className="editor-input"
            value={element.dynamicBinding?.variableKey ?? ""}
            onChange={(event) =>
              onUpdate((prev) => ({
                ...prev,
                dynamicBinding: {
                  ...(prev.dynamicBinding ?? { variableKey: "" }),
                  variableKey: event.target.value,
                },
              }))
            }
          >
            {variables.map((variable) => (
              <option key={variable.key} value={variable.key}>
                {variable.label} ({variable.key})
              </option>
            ))}
          </select>
        </label>
      )}

      {!isDynamic && (
        <label className="editor-field">
          <span>Static content</span>
          <input
            className="editor-input"
            type="text"
            value={element.staticContent ?? ""}
            onChange={(event) => onUpdate((prev) => ({ ...prev, staticContent: event.target.value }))}
          />
        </label>
      )}

      <div className="properties-grid">
        <label className="editor-field">
          <span>X</span>
          <input
            className="editor-input"
            type="number"
            value={element.positionX}
            onChange={(event) => handleNumberChange("positionX", Number(event.target.value))}
          />
        </label>
        <label className="editor-field">
          <span>Y</span>
          <input
            className="editor-input"
            type="number"
            value={element.positionY}
            onChange={(event) => handleNumberChange("positionY", Number(event.target.value))}
          />
        </label>
        <label className="editor-field">
          <span>Width</span>
          <input
            className="editor-input"
            type="number"
            value={element.width}
            onChange={(event) => handleNumberChange("width", Number(event.target.value))}
          />
        </label>
        <label className="editor-field">
          <span>Height</span>
          <input
            className="editor-input"
            type="number"
            value={element.height}
            onChange={(event) => handleNumberChange("height", Number(event.target.value))}
          />
        </label>
      </div>

      {isText && (
        <label className="editor-field">
          <span>Font size</span>
          <input
            className="editor-input"
            type="number"
            value={element.fontSize ?? 14}
            onChange={(event) => onUpdate((prev) => ({ ...prev, fontSize: Number(event.target.value) }))}
          />
        </label>
      )}

      {isDynamic && (
        <>
          <label className="editor-field">
            <span>Prefix</span>
            <input
              className="editor-input"
              type="text"
              value={element.dynamicBinding?.overridePrefix ?? ""}
              onChange={(event) =>
                onUpdate((prev) => ({
                  ...prev,
                  dynamicBinding: {
                    ...(prev.dynamicBinding ?? { variableKey: variables[0]?.key ?? "" }),
                    overridePrefix: event.target.value,
                  },
                }))
              }
            />
          </label>
          <label className="editor-field">
            <span>Suffix</span>
            <input
              className="editor-input"
              type="text"
              value={element.dynamicBinding?.overrideSuffix ?? ""}
              onChange={(event) =>
                onUpdate((prev) => ({
                  ...prev,
                  dynamicBinding: {
                    ...(prev.dynamicBinding ?? { variableKey: variables[0]?.key ?? "" }),
                    overrideSuffix: event.target.value,
                  },
                }))
              }
            />
          </label>
          <label className="editor-field checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(element.dynamicBinding?.overrideTrimWhitespace)}
              onChange={(event) =>
                onUpdate((prev) => ({
                  ...prev,
                  dynamicBinding: {
                    ...(prev.dynamicBinding ?? { variableKey: variables[0]?.key ?? "" }),
                    overrideTrimWhitespace: event.target.checked,
                  },
                }))
              }
            />
            <span>Trim whitespace</span>
          </label>
        </>
      )}

      <div className="properties-footer">
        <button type="button" className="ghost-button" onClick={onRemove}>
          Remove element
        </button>
      </div>
    </div>
  );
}

interface VariableDialogProps {
  variable: LayoutVariable | null;
  onSave: (variable: LayoutVariable) => void;
  onCancel: () => void;
}

function VariableDialog({ variable, onSave, onCancel }: VariableDialogProps): JSX.Element {
  const [key, setKey] = useState(variable?.key ?? "");
  const [label, setLabel] = useState(variable?.label ?? "");
  const [multiple, setMultiple] = useState(variable?.multiple ?? false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ key: key.trim(), label: label.trim() || key.trim() || "New variable", multiple });
  };

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h3>{variable ? "Edit variable" : "Add variable"}</h3>
        <label className="editor-field">
          <span>Key</span>
          <input className="editor-input" type="text" value={key} onChange={(event) => setKey(event.target.value)} required />
        </label>
        <label className="editor-field">
          <span>Label</span>
          <input className="editor-input" type="text" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="editor-field checkbox-field">
          <input type="checkbox" checked={multiple} onChange={(event) => setMultiple(event.target.checked)} />
          <span>Allow multiple values</span>
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

interface MappingTestResultProps {
  result?: ResolvedVariable;
  error?: string | null;
}

function MappingTestResult({ result, error }: MappingTestResultProps): JSX.Element {
  if (error) {
    return <div className="mapping-hint error">Test failed: {error}</div>;
  }
  if (!result) {
    return <div className="mapping-hint">No test run yet.</div>;
  }
  const matches = result.selectorMatches ?? [];
  return (
    <div className="mapping-hint">
      Status: {result.status} · Value: <strong>{result.value}</strong> · Matches: {matches.length}
      {matches.length > 0 && (
        <div className="mapping-matches">
          {matches.slice(0, 3).map((match, index) => (
            <span key={index} className="match-chip">
              {match}
            </span>
          ))}
          {matches.length > 3 && <span className="match-chip more">+{matches.length - 3} more</span>}
        </div>
      )}
    </div>
  );
}

function ensureMappingsForLayout(dataSource: DataSource, layout: LabelLayout): DataSource {
  const existing = new Map(dataSource.variableMappings.map((mapping) => [mapping.key, mapping]));
  const updatedMappings = layout.variables.map((variable) => {
    const current = existing.get(variable.key);
    if (current) {
      return { ...current, multiple: variable.multiple };
    }
    return createEmptyMapping(variable.key, variable.multiple);
  });
  return { ...dataSource, variableMappings: updatedMappings };
}

function createEmptyMapping(key: string, multiple: boolean): DataSource["variableMappings"][number] {
  return {
    key,
    cssSelector: "",
    multiple,
    trimWhitespace: true,
    attributeName: null,
    regexPattern: null,
    regexMatchIndex: 0,
    prefix: null,
    suffix: null,
  };
}

function resolveAttributeOption(attributeName?: string | null): (typeof ATTRIBUTE_OPTIONS)[number] {
  if (!attributeName || attributeName === "textContent") return "";
  const normalized = attributeName.trim();
  return ATTRIBUTE_OPTIONS.includes(normalized as (typeof ATTRIBUTE_OPTIONS)[number]) ? (normalized as (typeof ATTRIBUTE_OPTIONS)[number]) : "custom";
}

function unwrapLayouts(response: MessageResponse): LabelLayout[] {
  if (response.type === "layouts") {
    return response.payload;
  }
  if (response.type === "error") {
    throw new Error(response.payload.message);
  }
  throw new Error("Unexpected response when loading layouts");
}

function unwrapLayoutSaved(response: MessageResponse, fallback: LabelLayout): LabelLayout {
  if (response.type === "layoutSaved") {
    return response.payload;
  }
  if (response.type === "error") {
    throw new Error(response.payload.message);
  }
  return fallback;
}

function unwrapDataSources(response: MessageResponse): DataSource[] {
  if (response.type === "dataSources") {
    return response.payload;
  }
  if (response.type === "error") {
    throw new Error(response.payload.message);
  }
  throw new Error("Unexpected response when loading data sources");
}

function unwrapDataSourceSaved(response: MessageResponse, fallback: DataSource): DataSource {
  if (response.type === "dataSourceSaved") {
    return response.payload;
  }
  if (response.type === "error") {
    throw new Error(response.payload.message);
  }
  return fallback;
}

function unwrapLabelFormats(response: MessageResponse): LabelFormat[] {
  if (response.type === "labelFormats") {
    return response.payload;
  }
  if (response.type === "error") {
    throw new Error(response.payload.message);
  }
  throw new Error("Unexpected response when loading label formats");
}

function cloneLayout(layout: LabelLayout): LabelLayout {
  return {
    ...layout,
    variables: layout.variables.map((variable) => ({ ...variable })),
    elements: layout.elements.map((element) => ({
      ...element,
      dynamicBinding: element.dynamicBinding ? { ...element.dynamicBinding } : undefined,
    })),
  };
}

function createBlankLayout(format: LabelFormat): LabelLayout {
  return {
    id: 0,
    name: "New layout",
    labelFormatId: format.id,
    variables: [
      { key: "title", label: "Title", multiple: false },
      { key: "subtitle", label: "Subtitle", multiple: false },
    ],
    elements: [
      {
        id: Date.now(),
        name: "Title",
        type: "text",
        positionX: 24,
        positionY: 24,
        width: 320,
        height: 32,
        rotation: 0,
        fontSize: 16,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: {
          variableKey: "title",
          overridePrefix: "",
          overrideSuffix: "",
          overrideTrimWhitespace: true,
          overrideFontSize: 16,
        },
      },
      {
        id: Date.now() + 1,
        name: "Subtitle",
        type: "text",
        positionX: 24,
        positionY: 70,
        width: 260,
        height: 26,
        rotation: 0,
        fontSize: 13,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: {
          variableKey: "subtitle",
          overridePrefix: "",
          overrideSuffix: "",
          overrideTrimWhitespace: true,
          overrideFontSize: 13,
        },
      },
    ],
  };
}

function duplicateLayout(layout: LabelLayout): LabelLayout {
  const copy = cloneLayout(layout);
  copy.id = 0;
  copy.name = `${layout.name} (copy)`;
  copy.elements = copy.elements.map((element, index) => ({ ...element, id: Date.now() + index }));
  return copy;
}

function countVariableUsage(layout: LabelLayout): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of layout.elements) {
    const key = element.dynamicBinding?.variableKey;
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function createElement(type: ToolbarElementType, layout: LabelLayout, format?: LabelFormat): LayoutElement {
  const variableKey = layout.variables[0]?.key ?? "title";
  const now = Date.now();
  const baseX = Math.max(16, (format?.widthPx ?? 600) / 2 - 80);
  const baseY = 32;
  if (type === "text") {
    return {
      id: now,
      name: "Text",
      type: "text",
      positionX: baseX,
      positionY: baseY,
      width: 200,
      height: 32,
      rotation: 0,
      fontSize: 14,
      mode: "dynamic",
      staticContent: null,
      dynamicBinding: {
        variableKey,
        overridePrefix: "",
        overrideSuffix: "",
        overrideTrimWhitespace: true,
        overrideFontSize: 14,
      },
    };
  }
  if (type === "qrcode") {
    return {
      id: now,
      name: "QR code",
      type: "qrcode",
      positionX: baseX,
      positionY: baseY,
      width: 96,
      height: 96,
      rotation: 0,
      fontSize: null,
      mode: "dynamic",
      staticContent: null,
      dynamicBinding: {
        variableKey,
        overridePrefix: "",
        overrideSuffix: "",
        overrideTrimWhitespace: true,
        overrideFontSize: null,
      },
    };
  }
  if (type === "image") {
    return {
      id: now,
      name: "Image",
      type: "image",
      positionX: baseX,
      positionY: baseY,
      width: 140,
      height: 90,
      rotation: 0,
      fontSize: null,
      mode: "static",
      staticContent: "Image placeholder",
    };
  }
  return {
    id: now,
    name: "Shape",
    type: "shape",
    positionX: baseX,
    positionY: baseY,
    width: 160,
    height: 4,
    rotation: 0,
    fontSize: null,
    mode: "static",
    staticContent: null,
  };
}

function applySnap(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

function createBlankFormat(): LabelFormat {
  return {
    id: 0,
    name: "New format",
    widthPx: 600,
    heightPx: 320,
    marginTopPx: 10,
    marginRightPx: 10,
    marginBottomPx: 10,
    marginLeftPx: 10,
    description: "Custom size",
  };
}

function ImportExportWorkspace(): JSX.Element {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const [formatsResp, layoutsResp, dataSourcesResp] = await Promise.all([
        sendMessage({ type: "getLabelFormats" }),
        sendMessage({ type: "getLayouts" }),
        sendMessage({ type: "getDataSources" }),
      ]);
      const json = JSON.stringify(
        {
          labelFormats: unwrapLabelFormats(formatsResp),
          layouts: unwrapLayouts(layoutsResp),
          dataSources: unwrapDataSources(dataSourcesResp),
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      );
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "labelsorcerer-export.json";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Exported configuration.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<{
        labelFormats: LabelFormat[];
        layouts: LabelLayout[];
        dataSources: DataSource[];
      }>;
      const formats = parsed.labelFormats ?? [];
      const layouts = parsed.layouts ?? [];
      const dataSources = parsed.dataSources ?? [];

      for (const format of formats) {
        await sendMessage({ type: "saveLabelFormat", payload: format });
      }
      for (const layout of layouts) {
        await sendMessage({ type: "saveLayout", payload: layout });
      }
      for (const source of dataSources) {
        await sendMessage({ type: "saveDataSource", payload: source });
      }

      setStatus("Imported formats, layouts, and data sources.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Import / Export</p>
          <h1>Move configs between machines</h1>
          <p className="workspace-subtitle">Export all label formats, layouts, and data sources as JSON or import from a file.</p>
        </div>
      </header>
      <div className="workspace-card">
        {error && <p className="workspace-error">{error}</p>}
        {status && <p className="workspace-status">{status}</p>}
        <div className="layout-editor-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="layout-editor-column">
            <h3 className="layout-editor-section-title">Export</h3>
            <p className="layout-editor-helper">Download a JSON file containing formats, layouts, and data sources.</p>
            <button type="button" className="primary-button" onClick={handleExport} disabled={busy}>
              Export JSON
            </button>
          </div>
          <div className="layout-editor-column">
            <h3 className="layout-editor-section-title">Import</h3>
            <p className="layout-editor-helper">Import a JSON file exported from LabelSorcerer.</p>
            <input type="file" accept="application/json" onChange={handleImport} disabled={busy} />
            <p className="layout-editor-helper">Import will merge into existing items; duplicates may be overwritten by matching IDs.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsWorkspace(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<PrintWebhookMethod>("GET");
  const [body, setBody] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendMessage({ type: "getPrintWebhookSettings" });
        if (cancelled) return;
        if (response.type === "printWebhookSettings") {
          const payload = response.payload;
          setUrl(payload?.url ?? "");
          setMethod(payload?.method ?? "GET");
          setBody(payload?.body ?? "");
        } else if (response.type === "error") {
          setError(response.payload.message);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async (payload: PostPrintWebhookConfig | null, successMessage: string) => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const response = await sendMessage({ type: "savePrintWebhookSettings", payload });
      if (response.type === "printWebhookSettings") {
        const saved = response.payload;
        setUrl(saved?.url ?? "");
        setMethod(saved?.method ?? "GET");
        setBody(saved?.body ?? "");
        setStatus(successMessage);
      } else if (response.type === "error") {
        setError(response.payload.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUrl = url.trim();
    const payload: PostPrintWebhookConfig | null = trimmedUrl
      ? { url: trimmedUrl, method, body: method === "POST" ? body : undefined }
      : null;
    void saveSettings(payload, trimmedUrl ? "Webhook settings saved." : "Webhook disabled.");
  };

  const handleClear = () => {
    setUrl("");
    setMethod("GET");
    setBody("");
    void saveSettings(null, "Webhook disabled.");
  };

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Post-print webhook</h1>
          <p className="workspace-subtitle">
            Send the rendered elements to an external service after every print job.
          </p>
        </div>
      </header>
      <div className="workspace-card">
        {error && <p className="workspace-error">{error}</p>}
        {status && <p className="workspace-status">{status}</p>}
        {loading ? (
          <p className="workspace-status">Loading webhook settings…</p>
        ) : (
          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field">
              <span>Webhook URL</span>
              <input
                className="editor-input"
                type="url"
                placeholder="https://example.com/webhook"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={saving}
              />
              <small className="settings-helper">Leave empty to disable the webhook.</small>
            </label>

            <div className="settings-field">
              <span>HTTP method</span>
              <div className="settings-methods">
                <label>
                  <input
                    type="radio"
                    name="webhook-method"
                    value="GET"
                    checked={method === "GET"}
                    onChange={() => setMethod("GET")}
                    disabled={saving}
                  />
                GET (payload is added to the "payload" query parameter)
                </label>
                <label>
                  <input
                    type="radio"
                    name="webhook-method"
                    value="POST"
                    checked={method === "POST"}
                    onChange={() => setMethod("POST")}
                    disabled={saving}
                  />
                  POST
                </label>
              </div>
            </div>

            {method === "POST" && (
              <label className="settings-field">
                <span>POST body template</span>
                <textarea
                  className="editor-input"
                  placeholder='Use {{payload}} to insert the rendered data'
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={saving}
                />
                <small className="settings-helper">
                Use <code>{"{{payload}}"}</code> or drill into the structure (for example <code>{"{{payload.resolvedVariables.objectId}}"}</code>).
                </small>
              </label>
            )}

            <div className="settings-actions">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? "Saving…" : "Save webhook"}
              </button>
              <button type="button" className="ghost-button" onClick={handleClear} disabled={saving}>
                Disable webhook
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
