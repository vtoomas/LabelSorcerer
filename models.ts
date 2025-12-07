// Conceptual variable as used by layouts
interface LayoutVariable {
  /** Unique across the whole layout/template. */
  key: string;              // e.g. "asset_name", "asset_key"

  /** Human readable stuff for the editor UI. */
  label: string;            // e.g. "Asset Name"
  description?: string;     // e.g. "Primary display name of the asset"

  /** Whether the layout expects multiple values or just one. */
  multiple: boolean;
}


type ElementType = "text" | "qrcode";
type LayoutElementMode = "static" | "dynamic";

interface LayoutElementDynamicBinding {
  /**
   * Key of the conceptual variable this element should display.
   * Must match one of LayoutLayout.variables[].key
   */
  variableKey: string;

  /** Per-element visual / formatting overrides (presentation only). */
  overridePrefix?: string | null;
  overrideSuffix?: string | null;
  overrideTrimWhitespace?: boolean;
  overrideFontSize?: number | null;
}

interface LayoutElement {
  id: number;
  name: string;
  type: ElementType;

  positionX: number;
  positionY: number;
  width: number;
  height: number;

  rotation: number | null;
  fontSize: number | null;

  mode: LayoutElementMode;

  /** For static text/urls/etc. */
  staticContent?: string | null;

  /** For dynamic content. Only present if mode === "dynamic". */
  dynamicBinding?: LayoutElementDynamicBinding;
}

interface LabelLayout {
  id: number;
  name: string;

  /** What conceptual variables this layout uses */
  variables: LayoutVariable[];

  /** Which label size/margins this design assumes */
  labelFormatId: number;

  elements: LayoutElement[];
}

type LabelFormat = {
  id: number;
  name: string;
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  description: string | null;
};

// How THIS DataSource gets a single variable key from the page.
interface DataSourceVariableMapping {
  /**
   * Must match a LayoutVariable.key.
   * This is the “contract” between layout and DataSource.
   */
  key: string;             // e.g. "asset_name"

  /** DOM selector for this view */
  cssSelector: string;

  /** Are we expecting multiple matches on this page? */
  multiple: boolean;

  /** Raw matches captured for debugging / preview */
  selectorMatches?: string[];

  /** Optional regex post-processing */
  regexPattern?: string | null;
  regexMatchIndex?: number | null;
  regexMatches?: string[];

  /** Transformations */
  prefix?: string | null;
  suffix?: string | null;
  trimWhitespace: boolean;

  /** Final resolved value(s) after DOM + regex + transforms */
  value?: string | string[] | null;
}

/**
 * Per-view data definition:
 * - A URL pattern for when it's active
 * - A set of variable mappings specific to this view
 * - Optionally a default layout to use
 */
interface DataSource {
  id: number;
  name: string;
  urlPattern: string;

  /** Optional: which layout to use by default for this DataSource */
  defaultLayoutId?: number | null;

  /**
   * Mapping from conceptual variable keys to
   * concrete DOM extraction logic on this view.
   */
  variableMappings: DataSourceVariableMapping[];
}

