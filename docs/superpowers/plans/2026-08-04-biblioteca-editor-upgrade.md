# Biblioteca Editor Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the Biblioteca document editor (Word-pastiche) from a light Office clone to a
polished, branded, dark-chrome editor with modern UX features — while preserving the white paper
and the PDF/Word export fidelity contract established in the 2026-07-29 restyle.

**Architecture:** All work concentrates on `src/components/biblioteca/DocumentEditor.jsx` (~733
lines), `src/components/biblioteca/DocumentToolbar.jsx`, and small touches to
`src/pages/BibliotecaPage.jsx` (templates on create). The export pipeline (`html2canvas` PDF
capture of the paper, Word-HTML generator) must remain byte-compatible: **the paper div stays
white with black text — only the chrome around it changes.** Features are additive; no existing
behavior is removed.

**Tech Stack:** React 19, Tailwind CSS v4, TipTap v3 (already installed; Task D adds
`@tiptap/extension-focus`).

**Design decisions (approved by user in chat):**
1. Word's own dark-mode approach: dark ribbon/title-bar/canvas, white paper.
2. Title bar drops Word-blue `#2b579a` for the app's violet→purple gradient brand. The "Abrir en
   Word" button keeps its blue as a deliberate accent.
3. Paper gains depth: `shadow-2xl`, subtle border, minimal rounding. True multi-page pagination is
   OUT OF SCOPE (follow-up; hard in TipTap).
4. Toolbar reorganized into tabs (Inicio / Insertar) — chosen over a slash-menu for lower risk.
   Undo/redo + export actions stay always visible.
5. New features: heading outline panel, document templates, inline title rename, "saved X min ago",
   shortcut tooltips + shortcuts modal, typewriter focus mode, responsive ruler.

**Verification baseline for every task:** no test suite exists. Verify with
`npx eslint <changed files>` (only pre-existing errors allowed — verify against parent commit),
`npm run build`, and browser check when reachable. Export fidelity check for any task touching
DocumentEditor.jsx: confirm the paper div's `bg-white`, forced black text, and the
`html2canvas`/`buildWordHtml` code paths are untouched.

---

### Task A: Dark chrome, violet brand bar, paper depth

**Files:**
- Modify: `src/components/biblioteca/DocumentEditor.jsx`
- Modify: `src/components/biblioteca/DocumentToolbar.jsx`

- [ ] **Step 1: Read both files fully.** Identify: the title bar (currently `#2b579a`), the ribbon
  rows (currently `#f3f3f3`/`#f0f0f0`/`#e8e8e8` grays + `gray-*` Tailwind), the ruler
  (`#d8d8d8` margins), the canvas background behind the paper, the status bar, and the paper div
  itself (bg-white, `printAreaRef`). Map which elements are chrome (convert) vs. paper/export
  content (do NOT touch).
- [ ] **Step 2: Title bar** → replace the Word-blue background with the app brand gradient
  (`bg-gradient-to-r from-violet-600 to-purple-600`), keep all its controls/white text. The
  "Abrir en Word" button keeps its current blue styling.
- [ ] **Step 3: Ribbon/toolbar chrome** → convert to app dark tokens: toolbar surfaces
  `bg-slate-900` (solid, it's fixed chrome) with `border-white/10` separators; buttons
  `text-slate-300 hover:bg-white/10 hover:text-white`, active state `bg-violet-500/20
  text-violet-300`; dropdown menus/portals `bg-slate-900 border border-white/10` with dark items.
  Inputs/selects inside the ribbon → dark input pattern (`bg-white/5 border-white/10 text-white`).
- [ ] **Step 4: Canvas + ruler + status bar** → canvas behind the paper `bg-slate-950`; ruler dark
  (`bg-slate-900`, tick marks/margins in `white/20`-range tones); status bar dark
  (`bg-slate-900 border-t border-white/10 text-slate-400`).
- [ ] **Step 5: Paper depth** → on the paper's wrapper (NOT inside `printAreaRef`'s captured
  content styles): `shadow-2xl shadow-black/50 rounded-sm ring-1 ring-white/10`. Verify the
  `html2canvas` call still captures with `backgroundColor: '#ffffff'` and that no dark class leaks
  into exported output.
- [ ] **Step 6: In-editor banners** (Word-open error banner, find/replace panel — previously left
  light to match the light ribbon) → now convert to dark tokens to match the new dark chrome.
- [ ] **Step 7: Verify** lint (pre-existing only), build, export-fidelity check per baseline above.
- [ ] **Step 8: Commit** — `style(biblioteca-editor): dark chrome with violet brand bar, white paper kept for export fidelity`

### Task B: Toolbar tabs + shortcut tooltips + shortcuts modal

**Files:**
- Modify: `src/components/biblioteca/DocumentToolbar.jsx`
- Possibly modify: `src/components/biblioteca/DocumentEditor.jsx` (if the modal lives there)

- [ ] **Step 1: Read DocumentToolbar.jsx fully.** Inventory every control and assign each to a tab:
  **Inicio** = paragraph style (Normal/T1–T4), font family, font size, bold/italic/underline/
  strike/sub/superscript, text & highlight color, alignment, line spacing, lists, indent/outdent.
  **Insertar** = quote, code block, inline code, link, image, table, horizontal rule, emoji.
  **Always visible** (right side, outside tabs): undo/redo, print, PDF, .doc, Abrir en Word.
- [ ] **Step 2: Implement tab state** (local `useState`, default "Inicio") with two tab buttons
  styled like the app's segmented controls (`bg-white/10 text-white` active pill on `bg-white/5`
  track). Render only the active tab's control group. Keyboard shortcuts keep working regardless of
  active tab (they're TipTap-level, not toolbar-level — verify none are wired through hidden
  buttons).
- [ ] **Step 3: Shortcut tooltips** — every button's `title` attribute includes its shortcut where
  one exists (e.g. "Negrita (Ctrl+B)"). Audit TipTap StarterKit defaults for the real bindings.
- [ ] **Step 4: Shortcuts modal** — a `?` button in the always-visible group opens a dark modal
  (`bg-slate-900 border border-white/10`) listing shortcuts grouped by category (Formato, Párrafo,
  Insertar, General). Closes on Escape/backdrop click.
- [ ] **Step 5: Verify** lint, build; confirm every control from Step 1's inventory is still
  reachable (nothing dropped in the reshuffle).
- [ ] **Step 6: Commit** — `feat(biblioteca-editor): tabbed toolbar with shortcut tooltips and shortcuts modal`

### Task C: Inline rename, saved-ago, outline panel

**Files:**
- Modify: `src/components/biblioteca/DocumentEditor.jsx`
- Read (do not modify unless a rename API is missing): `src/context/BibliotecaContext.jsx`

- [ ] **Step 1: Inline title rename** — the document title in the top bar ("Sin título") becomes
  click-to-edit: clicking swaps to a text input (dark input pattern, autofocus, select-all);
  Enter/blur saves via the existing document-update path in BibliotecaContext; Escape cancels.
  If no title-update function exists in the context, add a minimal one mirroring the existing
  update pattern (state + Supabase update) — no new API shapes.
- [ ] **Step 2: Saved-ago indicator** — track `lastSavedAt` timestamp on successful save; render
  next to the existing "Guardado" state: "Guardado · hace 2 min" (Spanish relative time: "ahora
  mismo", "hace X min", "hace X h"). Refresh the label on a 60s interval; clean up the interval on
  unmount.
- [ ] **Step 3: Outline panel** — a toggle button in the title bar opens a right-side panel
  (`bg-slate-900 border-l border-white/10`, ~16rem wide, collapsible) listing all headings
  (T1–T4) in document order, indented by level, extracted from the TipTap doc (listen to editor
  updates, debounce regeneration). Clicking a heading scrolls it into view
  (`scrollIntoView({behavior:'smooth', block:'start'})` on the corresponding DOM node — resolve via
  TipTap position → DOM). Empty state: "Sin encabezados todavía".
- [ ] **Step 4: Verify** lint, build; outline updates as headings are added/removed; rename persists
  across editor close/reopen (check via context state).
- [ ] **Step 5: Commit** — `feat(biblioteca-editor): inline rename, saved-ago indicator and heading outline panel`

### Task D: Templates, typewriter focus mode, responsive ruler

**Files:**
- Modify: `src/pages/BibliotecaPage.jsx` (template picker on create)
- Modify: `src/components/biblioteca/DocumentEditor.jsx` (focus mode, ruler)
- Modify: `package.json` (add `@tiptap/extension-focus` matching the installed TipTap major version)

- [ ] **Step 1: Templates** — clicking "Nuevo documento" opens a small dark modal with 3 cards:
  **En blanco**, **Acta de reunión** (headings: Asistentes, Orden del día, Acuerdos, Próximos
  pasos — with task-list under Acuerdos if the task-list extension is active in this editor, else
  bullet list), **Propuesta** (Resumen, Contexto, Propuesta, Presupuesto, Siguientes pasos). Each
  template is a TipTap JSON document seeded at creation via the existing create-document path.
  En blanco behaves exactly like today's creation.
- [ ] **Step 2: Focus mode** — `npm install @tiptap/extension-focus` (v3, matching installed
  TipTap). Register it on the Biblioteca editor. When the existing "Enfocar" mode is active, apply
  CSS so non-focused top-level blocks dim to ~35% opacity with a smooth transition (using the
  extension's `has-focus` class); when Enfocar is off, no dimming. Do not alter what Enfocar
  already does beyond adding the dimming.
- [ ] **Step 3: Responsive ruler** — hide the ruler below the `md` breakpoint (`hidden md:flex` or
  equivalent on its container).
- [ ] **Step 4: Verify** lint, build; `package-lock.json` updated; templates produce valid
  documents that save/export correctly; focus dimming never appears in PDF export (it's
  editor-only CSS — confirm the exported capture is unaffected).
- [ ] **Step 5: Commit** — `feat(biblioteca): document templates, typewriter focus mode and responsive ruler`

---

## Out of scope (documented follow-ups)

- True multi-page WYSIWYG pagination (page breaks) — significant TipTap work.
- Slash-command menu — tabs chosen instead; revisit if requested.
- Draggable/functional ruler margins.
- `ConfirmDialog.jsx` and `AdminLayout.jsx` dark reskin — pre-existing follow-ups from the
  2026-07-29 restyle, unrelated to this plan.
