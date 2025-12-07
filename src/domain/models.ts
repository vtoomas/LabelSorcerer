export interface LayoutVariable {
  /** Unique across the whole layout/template. */
  key: string;

  /** Human readable stuff for the editor UI. */
  label: string;
  description?: string;

  /** Whether the layout expects multiple values or just one. */
  multiple: boolean;
}

export type ElementType = "text" | "qrcode" | "image" | "shape";
export type LayoutElementMode = "static" | "dynamic";

export interface LayoutElementDynamicBinding {
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

export interface LayoutElement {
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

export interface LabelLayout {
  id: number;
  name: string;

  /** What conceptual variables this layout uses */
  variables: LayoutVariable[];

  /** Which label size/margins this design assumes */
  labelFormatId: number;

  elements: LayoutElement[];
}

export type LabelFormat = {
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

export interface DataSourceVariableMapping {
  /** Must match a LayoutVariable.key. */
  key: string;

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
  /** Optional attribute to read instead of textContent */
  attributeName?: string | null;

  /** Final resolved value(s) after DOM + regex + transforms */
  value?: string | string[] | null;
}

export interface DataSource {
  id: number;
  name: string;
  urlPattern: string;
  defaultLayoutId?: number | null;
  variableMappings: DataSourceVariableMapping[];
}
