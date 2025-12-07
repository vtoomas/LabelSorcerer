1. Overall Design Theme

Aesthetic:
Clean, modern, slightly magical but professional.
Think Linear + Notion + tiny bit of Harry Potter UI flavor.

Color palette:

Background: #f6f8fa or #ffffff
Primary: #5b4bcd  (magical purple)
Primary accent: #8b7ffc
Borders: #d8dbe2
Text primary: #1c1c1e
Text secondary: #6b6b6f
Canvas bg: #fafafa (checkerboard light pattern)
Sidebar bg: #f3f1ff


Typography:

Headings: Inter / IBM Plex Sans – bold

Body: Inter / Roboto

Monospace: JetBrains Mono for selectors & regex

Iconography:
Use Lucide icons: wand, magic, crop, ruler, qr-code, square, type, etc.

2. Options Page UI Structure
+----------------------------------------------------------+
| LabelSorcerer ✨                                          |
|----------------------------------------------------------|
| Sidebar (Navigation) | Main workspace area               |
|                      |                                   |
| - Layouts            | [Selected Page]                   |
| - Data Sources       |                                   |
| - Label Formats      |                                   |
| - Import / Export    |                                   |
| - Settings           |                                   |
+----------------------------------------------------------+

2.1 Sidebar

Sidebar width: ~240px
Soft purple background.

-------------------------------------
|   LabelSorcerer ✨ (logo)          |
-------------------------------------
| ◉ Layouts                         |
| ○ Data Sources                    |
| ○ Label Formats                   |
| ○ Import / Export                 |
| ○ Settings                        |
-------------------------------------
|  Footer                          |
|  Version x.y.z                   |
-------------------------------------


Uses icons:

Layouts → layers

Data Sources → database

Formats → ruler

Import/Export → upload/cloud-download

Settings → settings

3. Layouts Page (List View)
---------------------------------------------------------------
| Layouts                                                     |
|-------------------------------------------------------------|
|  + Create Layout                                            |
|                                                             |
|  ┌───────────────────────────────────────────────────────┐  |
|  | • Jira Asset Small Label       [Edit] [Duplicate] [✕] |  |
|  ├───────────────────────────────────────────────────────┤  |
|  | • QR Sticker 25x25             [Edit] [Duplicate] [✕] |  |
|  └───────────────────────────────────────────────────────┘  |
|                                                             |
---------------------------------------------------------------


Card content:

Name

The label format name (smaller text)

Last edited date

Actions on right side


## 4. Layout Editor (The Canvas) – New Mockup

### 4.1 Overall Layout

Three columns, plus an element toolbar above the canvas:

```text
+---------------------------------------------------------------------------------+
| Header:  < Back  |  Layout: Jira Asset Label  |  Format: 62x29mm ▼  |  [Preview]|
+---------------------------------------------------------------------------------+
| Left: Variables      | Middle: Elements Toolbar + Canvas      | Right: Properties|
+---------------------------------------------------------------------------------+
```

More detailed:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
| < Back | Jira Asset Small Label • 62 x 29 mm                     [Preview]     |
├─────────────────────────────────────────────────────────────────────────────────┤
| Variables (left)        | Elements + Canvas (center)         | Properties (right)|
|-------------------------|-------------------------------------|------------------|
| [Variables header]      | [Elements toolbar]                 | [Properties hdr] |
| + Add variable          |  + Text   + QR code  + Image  + Shape               |
|                         |-------------------------------------|                |
|  asset_name   (3 bound) | [Canvas area with grid + label frame]               |
|  asset_key    (2 bound) |   - draggable/resizable elements    |   fields for   |
|  location     (1 bound) |   - click to select                 |   selected el. |
|  ...                    |                                     |                |
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Left Column – Variables Pane

Purpose: manage **conceptual variables** (data fields) used by the layout.

```text
┌───────────────────────────────────┐
| VARIABLES              [ + Add ]  |
|───────────────────────────────────|
| Asset Name                        |
| key: asset_name                   |
| ● bound to 3 elements             |
|                                   |
| Asset Key                         |
| key: asset_key                    |
| ● bound to 2 elements             |
|                                   |
| Location                          |
| key: location                     |
| ● bound to 1 element              |
└───────────────────────────────────┘
```

Interactions:

* **+ Add** opens a small dialog:

  * Key, Label, Multiplicity (single/multiple).
* Each variable row:

  * Click “Edit” (small icon) to change label/key.
  * Shows how many elements currently use it (`3 elements` badge).

*(Optional v2 enhancement: drag variable from this pane onto canvas to create a new dynamic element bound to it.)*

---

### 4.3 Middle Column – Elements Toolbar + Canvas

#### 4.3.1 Elements Toolbar

Right above the canvas:

```text
┌────────────────────────────────────────────────────────────────┐
| ELEMENTS                                                       |
| [ + Text ] [ + QR code ] [ + Image ] [ + Shape ▼ ]    [ Snap: ☐ ]|
└────────────────────────────────────────────────────────────────┘
```

Behavior:

* **+ Text**

  * Adds a centered text box on the canvas.
  * Mode: static, default text “New text”.
* **+ QR code**

  * Adds a square QR placeholder.
* **+ Image**

  * Adds an image placeholder rectangle.
* **+ Shape ▼**

  * Dropdown: Rectangle / Line / Circle, etc.
* **Snap: ☐**

  * Toggle snapping to a 4px or 8px grid.

#### 4.3.2 Canvas Area

```text
┌─────────────────────────────────────────────┐
| [light grid background]                    |
|                                            |
|    ┌─────────────────────────────────┐     |
|    |  Label surface (white)         |     |
|    | ┌─────────────────────────────┐ |    |
|    | | dashed inner margin frame   | |    |
|    | |                             | |    |
|    | | [Asset Name text element]   | |    |
|    | | [Asset Key text element]    | |    |
|    | |                 [ QR ]      | |    |
|    | └─────────────────────────────┘ |    |
|    └─────────────────────────────────┘    |
|                                            |
└─────────────────────────────────────────────┘
```

Behavior:

* Elements show as boxes with:

  * A faint border
  * Text / “[ QR ]” / “[ IMG ]” content
* **Click to select**:

  * Selected element gets a purple outline + resize handles.
* **Drag & resize**:

  * Click+drag to move.
  * Drag handles on corners/edges to resize.
* Keyboard:

  * Arrow keys nudge position (1px).
  * Shift+Arrow for bigger steps (e.g., 5px).

*(Under the hood in React, the elements array comes from your `LabelLayout`, and pointer events update x/y/width/height.)*

---

### 4.4 Right Column – Properties Pane

Shows details for the **currently selected element**.

```text
┌────────────────────────────────────────────┐
| PROPERTIES                     Element     |
|────────────────────────────────────────────|
| Name                                   ▽   |
| [ Asset Name Text          ]                |
|                                            |
| Type: [ Text ▼ ] (read only or limited)    |
| Mode: (• Dynamic)   (○ Static)             |
|                                            |
| Variable (if Dynamic):                     |
| [ asset_name ▼ ]                           |
|                                            |
| Position                                   |
|  X: [  40 ]    Y: [  24 ]                  |
| Size                                       |
|  W: [ 180 ]   H: [  22 ]                   |
|                                            |
| Typography                                 |
|  Font size: [ 12  ] pt                     |
|  [ ] Bold    [ ] Italic                    |
|                                            |
| Text Overrides                             |
|  Prefix: [            ]                    |
|  Suffix: [            ]                    |
|  [✓] Trim whitespace                       |
|                                            |
| Advanced                                   |
|  [ More settings… ]                        |
└────────────────────────────────────────────┘
```

Behavior:

* **Mode switch**:

  * Static → hides variable dropdown, shows “Text content” field instead.
  * Dynamic → shows variable dropdown, hides static text field.
* Changing position/size in inputs updates the canvas.
* Variable dropdown is populated from the **Variables pane**’s list.

---

### 4.5 Optional: Mini “Layers” Dropdown

If layout gets complex, add a small “Layers” control above properties:

```text
Layers: [ Asset Name Text ▾ ]
```

Dropdown lists all elements by name and type, so you can quickly select one without hunting on the canvas.

---

### 4.6 Interaction Summary

* **Add elements**: via toolbar buttons.
* **Bind to data**: select element → switch to Dynamic → pick variable.
* **Adjust layout**: drag on canvas or edit numeric fields.
* **Manage fields**: use Variables pane on the left.


5. DataSources Page (List View)
---------------------------------------------------------------
| Data Sources                                                |
|-------------------------------------------------------------|
|  + Create Data Source                                       |
|                                                             |
|  ┌────────────────────────────────────────────────────────┐ |
|  | Jira Assets Detail View    Pattern: .../asset/*        | |
|  | Layouts: Jira Asset Label (default)                   | |
|  | [Edit] [Duplicate] [✕]                                 | |
|  └────────────────────────────────────────────────────────┘ |
|                                                             |
---------------------------------------------------------------

6. DataSource Editor
┌──────────────────────────────────────────────────────────────┐
| Header: < Back | DataSource: Jira Assets Detail View          |
| URL Pattern:  https://jira.example.com/assets/*               |
| Default Layout:  Jira Asset Small Label ▼                     |
├──────────────────────────────────────────────────────────────┤
| Left Pane (Variables from Layout) | Right Pane (Selector UI) |
|-----------------------------------|---------------------------|
| Variables required by layout:     | Selector & Transform      |
|  asset_name                       | --------------------------|
|  asset_key                        | cssSelector: ".header h1" |
|  location                         | multiple: [ ]             |
|                                   | regex: "(.*)"             |
|                                   | regex index: 0            |
|                                   | prefix: ""                |
|                                   | suffix: ""                |
|                                   | trim: ✓                   |
|                                   |                           |
|                                   | [Test Selector]           |
|                                   | Matches:                  |
|                                   | - "Router 1234"           |
└──────────────────────────────────────────────────────────────┘

7. Selector Tester Modal
┌──────────────────────────────────┐
| Test Selector – asset_name       |
|----------------------------------|
| CSS Selector: .header h1         |
| URL: [Use current tab]           |
|----------------------------------|
| Raw matches:                     |
|   <h1>Router 1234</h1>           |
| Regex applied: "Router 1234"     |
| Final value: "Router 1234"       |
|----------------------------------|
| [Apply to Mapping] [Close]       |
└──────────────────────────────────┘

8. Popup UI (When visiting a page)

Small, clean, practical.

┌────────────────────────────────────────┐
| LabelSorcerer ✨                        |
|----------------------------------------|
| Active DataSource:                     |
|   Jira Assets Detail View              |
| Layout: [ Jira Asset Small Label ▼ ]   |
|----------------------------------------|
| Live Preview                           |
| ┌────────────────────────────────────┐ |
| |  [Label rendered here]            | |
| └────────────────────────────────────┘ |
|----------------------------------------|
| [Re-evaluate] [Print]                  |
└────────────────────────────────────────┘


Preview is a miniature version of the canvas rendering.

9. Print Preview Page

Centered, print-friendly, white background.

┌─────────────────────────────────────────┐
| [LabelSorcerer Print Preview]           |
|-----------------------------------------|
|  <Canvas-sized label on actual scale>   |
|-----------------------------------------|
| [Print]                                 |
└─────────────────────────────────────────┘


Styling ensures:

Margins match LabelFormat

Actual pixel → mm conversion correct

All borders/tools hidden in print mode

10. Content Script Overlay (Optional)

When user tests selectors, you can highlight matched elements:

+--------------------------------------------------------------+
| Browser page content                                         |
|                                                              |
|   +------------------------------------------------------+   |
|   |  Highlight overlay with purple glow around element   |   |
|   +------------------------------------------------------+   |
|                                                              |
| Small bubble tooltip:                                        |
|   Matches variable: asset_name                               |
|   Text: "Router 1234"                                        |
+--------------------------------------------------------------+

11. Micro-interactions (Polish)

Elements on the canvas “snap” with a faint purple glow.

Variable list shows a small badge indicating how many elements reference one.

Hovering selector test results briefly highlights matches on the page.

Smooth transitions between tabs and panels.

Use subtle magic sparkles animation only on the Logo/Brand (not in editor).

12. Icon & Branding Mockup

LabelSorcerer Logo Inspiration:

✨ A small purple wand streaking sparkles forming a label outline ✨


Simplified form:

A square label shape with dashed border

A wand icon overlapping, casting a small sparkle

Gradient purple #5b4bcd → #8b7ffc

13. Tone & Personality

Throughout UI:

Friendly but professional microcopy

Occasional magical references (“Cast Preview”, “Summon Variables”) only in optional tooltips, not core buttons

Clear separation: fun brand + professional workflow