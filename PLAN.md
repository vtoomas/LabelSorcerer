
# LabelSorcerer – Development Plan & Architecture Spec

> **Context for AI coding assistant:**
> You are implementing a Chrome MV3 browser extension called **LabelSorcerer**. It reads data from web pages via CSS selectors, maps it into reusable variables, and renders printable label layouts designed by the user. The stack is **Bun + TypeScript + React**.
>
> All data models (interfaces like `LabelLayout`, `LayoutElement`, `LayoutVariable`, `DataSource`, `DataSourceVariableMapping`, etc.) will be provided separately in a `models.ts` file. Assume those are available and correct; focus on architecture, workflows, and module implementations.

---

## 1. Product Overview

**LabelSorcerer** is a browser extension that:

* Lets users design **label layouts** on a canvas (drag/drop/resize elements, text, QR codes, etc.).
* Defines **conceptual variables** (e.g. `asset_name`, `asset_key`) on a layout, which represent fields.
* For each **DataSource** (e.g. different Jira Assets views / web apps), lets users define **how to fetch those variables** from the DOM (CSS selectors, regex, transforms).
* When the user visits a matching URL:

  * Detects the relevant DataSource.
  * Scrapes data, resolves variables.
  * Renders a label preview using a chosen layout.
  * Allows printing (single or multiple labels).

Core idea: **Layouts are reusable across multiple DataSources**. DataSources implement the same `variableKey`s with different selectors.

---

## 2. Goals & Non-Goals

### 2.1 Goals

* MV3-compatible extension using:

  * Background service worker.
  * Content scripts for DOM access.
  * React-based options UI (and optionally popup).
* Clean separation of:

  * **Domain logic** (variables, layouts, evaluation).
  * **UI** (React components).
  * **Browser integration** (MV3, storage, messaging).
* Simple but powerful **selector mapping UI**.
* Printable output that respects label size and margins (from `LabelFormat`).

### 2.2 Non-Goals (for v1)

* No external cloud backend (all local/sync storage).
* No collaborative editing or multi-user sharing.
* No fancy print drivers or direct printer integration; rely on browser `window.print()`.

---

## 3. Extension Architecture

### 3.1 Contexts

1. **Background Service Worker (MV3)**

   * Manages persistent configuration: DataSources, LabelLayouts, LabelFormats.
   * Resolves **which DataSource** matches current tab URL.
   * Handles **messaging** between UI and content scripts.
   * Uses `chrome.storage.sync` and/or `chrome.storage.local`.

2. **Content Script**

   * Runs on matching pages.
   * Evaluates `DataSourceVariableMapping` selectors on the DOM.
   * Sends resolved variables to UI (e.g. popup/options) or back to background if needed.
   * Optionally responsible for in-page overlays / quick preview.

3. **React UI**

   * **Options page**: main configuration & editor.

     * Layout editor (canvas).
     * Variable management.
     * DataSource editor & selector testing.
     * Import/export JSON.
   * **Popup** (optional for v1):

     * Show quick label preview for current page.
     * Print button.
     * DataSource/layout selection.

---

## 4. High-Level Module Structure

Use a structure like:

```text
src/
  manifest.json
  background/
    index.ts
    storageService.ts
    messaging.ts
    dataSourceManager.ts
  content/
    index.ts
    domEvaluator.ts
    messaging.ts
  ui/
    options/
      index.tsx
      App.tsx
      components/
        LayoutList.tsx
        LayoutEditorCanvas.tsx
        VariableList.tsx
        DataSourceList.tsx
        DataSourceEditor.tsx
        SelectorTester.tsx
        PreviewPane.tsx
    popup/
      index.tsx
      PopupApp.tsx
  domain/
    models.ts          // You provide this
    layoutService.ts
    dataSourceService.ts
    evaluationService.ts
    printService.ts
    validation.ts
  shared/
    messagingTypes.ts
    storageTypes.ts
    utils/
      urlPattern.ts
      regexUtils.ts
      domSerialization.ts
```

---

## 5. Workflows (User Journeys)

### 5.1 Workflow A – Create a Layout and Variables

**Goal:** User defines a flexible label layout that can be reused across different DataSources.

1. User opens **Options page** → `LayoutEditor` section.
2. Click “New layout”:

   * Choose a `LabelFormat` (or define one: width/height/margins in px/mm).
   * Name the layout (e.g. “Jira Asset Small Label”).
3. Define **layout variables**:

   * Add variable:

     * key: `asset_name`
     * label: “Asset Name”
     * multiple: `false`
   * Add `asset_key`, `location`, etc.
4. On the **canvas**:

   * Add text elements; set `mode = "dynamic"`.
   * Bind each element to a `variableKey`:

     * e.g. element1 → `asset_name`
     * element2 → `asset_key`
   * Adjust font size, position, etc.
5. Save layout:

   * The layout is stored without any DataSource-specific details.
   * Only knows `variables` (keys/labels/etc.) and geometric layout.

**Implementation notes:**

* `LayoutEditorCanvas` manipulates `LayoutElement` objects and calls `layoutService.updateLayout(layoutId, updatedLayout)`.
* Variables list is managed via `layoutService.updateLayoutVariables(layoutId, updatedVariables)`.

---

### 5.2 Workflow B – Configure a DataSource for a Given Layout

**Goal:** Map conceptual variables to actual DOM selectors on a specific site/view.

1. User navigates to the **DataSources** section.
2. Click “New DataSource”:

   * Set `name`, `urlPattern` (e.g. `https://jira.example.com/assets/*`).
   * Optionally set `defaultLayoutId`.
3. For each **layout variable key** they want to support:

   * Add `DataSourceVariableMapping` with:

     * key = `asset_name`
     * cssSelector = `.js-header-title h1`
     * multiple = false
     * optional regex pattern, prefix/suffix, trimWhitespace.
4. Provide a **Selector Tester** UI:

   * User enters/test URL (or uses current tab).
   * Content script injects:

     * Run `document.querySelectorAll(cssSelector)` for current mapping.
     * Returns matched text content(s).
   * Show raw matches, post-regex result, final transformed value.
5. Save DataSource:

   * `dataSourceService.saveDataSource(dataSource)` persists to storage.

**Implementation notes:**

* `dataSourceService` exposes APIs like:

  * `getAllDataSources()`
  * `getDataSourceById(id)`
  * `saveDataSource(ds)`
* Content script + messaging pipeline provides a “test selector” RPC-style call.

---

### 5.3 Workflow C – Use LayoutSorcerer on a Page

**Goal:** User opens a Jira Assets view; LabelSorcerer shows a label preview and allows printing.

1. User opens a page whose URL matches a `DataSource.urlPattern`.
2. **Background** resolves the DataSource for this tab.

   * Optionally auto-chooses `defaultLayoutId`.
3. **Content script** is active on this page:

   * Receives message: “Evaluate variables for DataSource X”.
   * For each `DataSourceVariableMapping`:

     * Run CSS selector.
     * Apply regex, prefix/suffix, trim.
     * Return `value` (string or string[]).
4. Background or Popup receives resolved values.
5. **Popup UI** (or an area in Options when “live preview” is open):

   * Fetches selected `LabelLayout`.
   * Combines `Layout` + `resolvedVariables`.
   * Renders preview canvas (same engine as LayoutEditor, but read-only).
6. User clicks “Print”:

   * `printService` generates printable HTML for the label(s), sized using `LabelFormat`.
   * Opens a new window/tab with a print-optimized page.
   * Calls `window.print()`.

**Implementation notes:**

* Use React for print page too, or generate HTML string from TS.
* Consider using a special route (e.g. `print.html`) as a standalone print target for previewed data.

---

### 5.4 Workflow D – Multiple DataSources for the Same Layout (Jira Assets Views)

**Goal:** Same layout used for multiple Jira Assets views with different DOM.

1. User has layout `Jira Asset Small Label` with variables:

   * `asset_name`, `asset_key`, `location`.
2. There are 2 DataSources:

   * `DataSource A` for “list view”:

     * `asset_name` selector: `.list .asset-name`
     * `asset_key` selector: `.list .asset-key`
   * `DataSource B` for “detail view”:

     * `asset_name` selector: `.detail-header h1`
     * `asset_key` selector: `#asset-key`
3. On each page:

   * The correct DataSource is selected by `urlPattern`.
   * The same layout is chosen (default or via popup).
   * Variables are resolved from the DataSource’s mapping.
   * The layout renders identically, fed by different sources.

---

## 6. Implementation Details per Module

### 6.1 Domain Services (`src/domain`)

**`layoutService.ts`**

* Responsibilities:

  * CRUD for `LabelLayout`s and `LabelFormat`s.
  * Utilities for:

    * Adding/removing/updating `LayoutElement`s.
    * Adding/removing/updating `LayoutVariable`s.
* Example methods (signatures only, implementation required):

  * `getLayouts(): Promise<LabelLayout[]>`
  * `getLayoutById(id: number): Promise<LabelLayout | undefined>`
  * `saveLayout(layout: LabelLayout): Promise<void>`
  * `deleteLayout(id: number): Promise<void>`

**`dataSourceService.ts`**

* Responsibilities:

  * CRUD for `DataSource`s.
  * Resolve DataSource for URL.
* Methods:

  * `getDataSources(): Promise<DataSource[]>`
  * `getDataSourceById(id: number): Promise<DataSource | undefined>`
  * `saveDataSource(ds: DataSource): Promise<void>`
  * `findMatchingDataSource(url: string): Promise<DataSource | undefined>`

**`evaluationService.ts`**

* Responsibilities:

  * Coordinate evaluation of variables for a DataSource:

    * On the content script side: run DOM queries.
    * On the UI/background side: map layout variables → resolved values.
* Methods (conceptual):

  * `evaluateMappingsInDom(mappings: DataSourceVariableMapping[]): ResolvedVariables`
  * `buildRenderContext(layout: LabelLayout, mappings: DataSourceVariableMapping[]): LayoutRenderContext`

**`printService.ts`**

* Responsibilities:

  * Given `LabelLayout`, `LabelFormat`, and resolved variables, produce print-ready markup.
* Methods:

  * `generatePrintHtml(layout: LabelLayout, format: LabelFormat, resolvedVariables: ResolvedVariables): string`
  * Possibly a React component used in a dedicated `print.html`.

**`validation.ts`**

* Responsibilities:

  * Validate that layout variables and DataSource variable mappings are consistent.
* Methods:

  * `validateLayoutAgainstDataSource(layout: LabelLayout, ds: DataSource): ValidationResult`

    * e.g. missing variable keys, extra mappings, etc.

---

### 6.2 Background (`src/background`)

**`index.ts`**

* Set up:

  * Listeners for `chrome.runtime.onMessage`.
  * Listeners for `chrome.tabs.onUpdated` to detect matching DataSources.
* Handle messages:

  * From popup or options:

    * “getLayouts”, “getDataSources”, “saveLayout”, etc.
  * From content script:

    * “evaluationResult” messages.
* Delegate business logic to `layoutService`, `dataSourceService`, `evaluationService`.

**`storageService.ts`**

* Wraps `chrome.storage.sync` / `chrome.storage.local`.
* Provides typed helpers:

  * `getConfig(): Promise<ConfigFile>`
  * `saveConfig(config: ConfigFile): Promise<void>`

**`dataSourceManager.ts`**

* Knows:

  * Which DataSource is currently active for each tab.
* Can respond to requests:

  * “getActiveDataSourceForTab(tabId)” etc.

---

### 6.3 Content Script (`src/content`)

**`index.ts`**

* Entry point injected into matching pages via manifest.
* Sets up `chrome.runtime.onMessage` listener for:

  * “evaluateMappings” → run `domEvaluator.evaluateMappings(mappings)`.
  * “testSelector” for selector test UI.

**`domEvaluator.ts`**

* Implements DOM querying and text extraction.
* For each mapping:

  * Use `document.querySelectorAll(cssSelector)`.
  * Collect `textContent` or `innerText`.
  * Apply regex using helper from `regexUtils`.
  * Return an updated `DataSourceVariableMapping` with `selectorMatches`, `regexMatches`, and `value`.

---

### 6.4 React UI – Options (`src/ui/options`)

**`App.tsx`**

* Router/tabs:

  * “Layouts”
  * “DataSources”
  * “Formats”
  * “Import/Export”
* Uses services via background messaging.

**Key components:**

* `LayoutList`:

  * List, create, rename, delete layouts.

* `LayoutEditorCanvas`:

  * Drag/drop elements on label canvas.
  * Bind each element to `LayoutVariable` via dropdown.
  * Supports resizing, rotation, snapping, etc (can be basic v1).

* `VariableList`:

  * Manage `LayoutVariable`s (key, label, multiple).

* `DataSourceList`:

  * List, create, delete DataSources.

* `DataSourceEditor`:

  * Edit `urlPattern`.
  * Map layout variables (`key`) to CSS selectors & transforms.

* `SelectorTester`:

  * For a selected mapping:

    * “Test on current tab” → calls background → content → returns sample values.

* `PreviewPane`:

  * Render preview of layout using:

    * Real data (if selector test on current tab).
    * Or sample values.

---

### 6.5 React UI – Popup (`src/ui/popup`)

**`PopupApp.tsx`**

* Shows for current tab:

  * Active DataSource (or “none”).
  * Selected Layout (from those compatible with that DataSource).
  * Preview of label(s) using resolved variables.
* Buttons:

  * “Re-evaluate” (ask content script to re-scrape the page).
  * “Print” (open print page with resolved context).

---

## 7. Testing Strategy

* **Unit tests (Bun test runner)**

  * `layoutService`:

    * CRUD operations, invariants.
  * `evaluationService`:

    * Given mocked `DataSourceVariableMapping` + fake DOM snapshot, compute correct `value`.
  * `validation.ts`:

    * Layout/DataSource compatibility tests.

* **Integration tests**

  * Simulate background–content–UI messaging flows.
  * Test selector evaluation with jsdom (if feasible).

* **Manual testing**

  * Test with:

    * Simple static HTML page.
    * Jira Assets-like layout.
  * Check print output across browsers if relevant.

---

## 8. Roadmap / Phases

**Phase 0 – Project Setup**

* Bun + TS + React setup with MV3 scaffold.
* ESLint/Prettier, basic build pipeline.

**Phase 1 – Domain & Storage**

* Implement models stub imports from `models.ts`.
* Implement `storageService`, `layoutService`, `dataSourceService` with in-memory then storage.

**Phase 2 – Options UI (Layouts & Formats)**

* Layout list & editor.
* LabelFormat definition.
* Canvas basics (drag, resize static & dynamic elements).

**Phase 3 – DataSource & Selector Tester**

* DataSource CRUD.
* Selector test flow (options → background → content → back).
* Evaluate mappings in content.

**Phase 4 – Runtime Evaluation & Popup**

* Background tab update listener resolves DataSource.
* Content script evaluation on demand.
* Popup shows preview, print call.

**Phase 5 – Printing & Polish**

* Print-ready HTML/CSS.
* JSON import/export.
* Error handling & validation (missing variables, bad selectors, etc.).
* Undo/redo in layout editor (optional v1.1).

---

That’s the full development plan for LabelSorcerer.

You can now:

* Drop this into your coding assistant as context.
* Add `models.ts` with the interfaces we discussed earlier.
* Start asking for concrete implementations file by file (e.g. “Implement storageService.ts as per spec”).
