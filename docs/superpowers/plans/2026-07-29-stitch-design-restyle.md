# Stitch Design Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin every page of the meeting-notes app to the unified dark near-black + violet/purple
visual language from the 4 genuine Stitch redesigns (Login, Dashboard, Projects Explorer, Editor),
extending the same tokens to Tasks, Register, Biblioteca and Admin, which have no Stitch mockup of
their own.

**Architecture:** Pure presentational change. No routes, contexts, hooks, or Supabase calls are
touched — only `className` strings (and a handful of inline `style` color values that must stay
dynamic, e.g. per-project colors) change. Each task targets one page/feature group, is independently
shippable, and ends with a browser check against the corresponding Stitch screenshot (or, for
pages without a mockup, against the Design Token Mapping below).

**Tech Stack:** React 19, Tailwind CSS v4 (utility classes only, no config changes needed), Vite dev server.

---

## Design Token Mapping

Reference table used by every task below. When a task says "apply the mapping," replace matching
classes with their dark equivalent; leave anything not listed here untouched.

| Purpose | Old (light) | New (dark) |
|---|---|---|
| Page background | `bg-slate-50` | `bg-slate-950` |
| Header/topbar | `bg-white border-b border-slate-200` | `bg-black/20 backdrop-blur-sm border-b border-white/10` |
| Card/panel | `bg-white border border-slate-200` or `border-slate-200/60` | `bg-white/5 border border-white/10` |
| Card hover | `hover:bg-slate-50` | `hover:bg-white/10` |
| Heading text | `text-slate-800`, `text-slate-900` | `text-white` |
| Muted text on card | `text-slate-400`, `text-slate-500` | `text-slate-400` (unchanged, already legible on dark) |
| Borders | `border-slate-200`, `border-slate-200/60`, `border-slate-100` | `border-white/10` |
| Text inputs | `bg-white border border-slate-200 ... focus:ring-violet-500/30 focus:border-violet-400` | `bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-violet-500/50 focus:border-violet-500/50` |
| Segmented control track | `bg-slate-100` | `bg-white/5` |
| Segmented control active pill | `bg-white text-violet-700 shadow-sm` | `bg-white/10 text-white shadow-sm` |
| Modal surface | `bg-white` | `bg-slate-900 border border-white/10` |
| Modal backdrop | `bg-black/40` | unchanged |
| Priority/status badges | `bg-{color}-100 text-{color}-700` | `bg-{color}-500/15 text-{color}-300` |
| Icon tint chips | `bg-{color}-50` | `bg-{color}-500/10` |

---

### Task 1: Login page

**Files:**
- Modify: `src/pages/LoginPage.jsx`

- [ ] **Step 1: Swap the page background from a linear gradient to a solid dark base with glow orbs**

Replace (line 35):
```jsx
<div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900">
```
with:
```jsx
<div className="min-h-screen flex bg-slate-950 relative overflow-hidden">
  <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
  <div className="absolute bottom-0 -right-20 w-[32rem] h-[32rem] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
```
Then add a closing `</div>` is not needed yet — instead wrap the two existing direct children
(the `flex-1 hidden lg:flex ...` showcase div and the `flex-1 flex ...` form div) so they render
above the orbs. Change both of their opening tags to add `relative z-10`:

```jsx
<div className="flex-1 hidden lg:flex items-center justify-center p-12 relative z-10">
```
```jsx
<div className="flex-1 flex items-center justify-center p-6 relative z-10">
```

- [ ] **Step 2: Verify the JSX still balances**

Run: `npx eslint src/pages/LoginPage.jsx`
Expected: no output (no lint errors), confirming the two new `<div>` orb elements and the
`relative z-10` additions didn't break the JSX tree.

- [ ] **Step 3: Verify in browser**

Start the Vite dev server, navigate to `/login`, and confirm: background is solid near-black with
two soft purple/violet blurred glow shapes (no visible diagonal gradient band), the glass card and
left-side copy are unchanged and fully legible, no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.jsx
git commit -m "style(login): replace gradient background with dark base and glow orbs"
```

---

### Task 2: Dashboard page

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

The sidebar (`SidebarContent`) is already dark and stays as-is. The two things that change are the
main container background and the `EmptyState` (today fully light).

- [ ] **Step 1: Darken the root container**

Replace (line 238):
```jsx
<div className="flex h-dvh bg-slate-50 overflow-hidden">
```
with:
```jsx
<div className="flex h-dvh bg-slate-950 overflow-hidden">
```

- [ ] **Step 2: Darken the mobile top bar**

Replace (line 260):
```jsx
<header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
```
with:
```jsx
<header className="md:hidden flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 shrink-0">
```

Replace (line 263):
```jsx
className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
```
with:
```jsx
className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 transition-colors"
```

Replace (line 276):
```jsx
<span className="font-bold text-slate-800 text-sm">MeetingNotes</span>
```
with:
```jsx
<span className="font-bold text-white text-sm">MeetingNotes</span>
```

- [ ] **Step 3: Rewrite `EmptyState` for the dark theme**

Replace the entire `EmptyState` function body (lines 306–381) with:

```jsx
function EmptyState({ stats, onCreateNote }) {
  return (
    <div className="flex items-center justify-center h-full relative overflow-hidden bg-slate-950">
      {/* Decorative elements - hidden on mobile */}
      <div className="hidden sm:block absolute top-16 right-24 w-24 h-24 bg-violet-600/10 rounded-3xl rotate-12 animate-float pointer-events-none" />
      <div className="hidden sm:block absolute bottom-24 left-20 w-16 h-16 bg-purple-600/10 rounded-2xl -rotate-12 animate-float-delay pointer-events-none" />
      <div className="hidden sm:block absolute top-1/4 left-1/3 w-8 h-8 bg-violet-500/10 rounded-full animate-float-slow pointer-events-none" />
      <div className="hidden sm:block absolute bottom-1/3 right-1/3 w-12 h-12 bg-indigo-500/10 rounded-xl rotate-45 animate-pulse-glow pointer-events-none" />

      <div className="text-center relative z-10 animate-scaleIn max-w-md px-6">
        {/* Hero icon */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 rounded-3xl sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-violet-900/40 border border-white/10 animate-float">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-2 -right-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg border border-white/10 animate-float-delay">
            <span className="text-xs font-bold text-violet-300">{stats.total} notas</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Tus reuniones, organizadas</h1>
        <p className="text-slate-400 text-sm mb-6 sm:mb-8 leading-relaxed">
          Selecciona una nota del menú o crea una nueva para empezar.
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/10 hover:border-violet-400/30 transition-all duration-300">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{stats.today}</p>
            <p className="text-xs text-slate-400 mt-0.5">Hoy</p>
          </div>
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/10 hover:border-violet-400/30 transition-all duration-300">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{stats.recent}</p>
            <p className="text-xs text-slate-400 mt-0.5">Semana</p>
          </div>
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/10 hover:border-violet-400/30 transition-all duration-300">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-500/10 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total</p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onCreateNote}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                     text-white transition-all duration-300 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear primera nota
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify lint**

Run: `npx eslint src/pages/DashboardPage.jsx`
Expected: no output.

- [ ] **Step 5: Verify in browser**

Navigate to `/dashboard` (logged in, with zero notes to see `EmptyState`, and with at least one
note to see `NoteEditor` still rendering — its own light theme is addressed in Task 5). Confirm:
sidebar and main area now form one continuous dark surface, stat cards and hero icon are legible,
no console errors. Then open a note and confirm `NoteEditor` still renders (it will still look
light until Task 5 — that's expected at this point).

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "style(dashboard): darken main container and EmptyState to match sidebar theme"
```

---

### Task 3: Projects page

**Files:**
- Modify: `src/pages/ProjectsPage.jsx`

- [ ] **Step 1: Add a top navigation bar in place of the back-button header**

Replace the `<header>` block (lines 207–242) with:

```jsx
<header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 py-3 shrink-0">
  <div className="flex items-center gap-2 sm:gap-4">
    <div className="flex items-center gap-2.5 shrink-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <span className="font-bold text-white text-sm sm:text-base hidden sm:inline">MeetingNotes</span>
    </div>

    <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
      <Link to="/tasks" className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-white/10 shrink-0">Proyectos</Link>
      <Link to="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0">Notas</Link>
      <Link to="/biblioteca" className="px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0">Biblioteca</Link>
    </nav>

    <button
      onClick={() => setShowModal(true)}
      className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20 shrink-0"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span className="hidden sm:inline">Nuevo proyecto</span>
    </button>
  </div>
</header>
```

This drops the back-arrow (the top nav now covers that navigation role) and the project-count
subtitle (redundant with the "Tareas" nav concept). `Tareas` is intentionally omitted from the nav
since there's no project-less `/tasks` list distinct from this page itself — `Proyectos` IS that
page, shown active.

- [ ] **Step 2: Move the color accent from card-top to card-left-border**

In `ProjectCard`, replace (line 104):
```jsx
<div className="group relative flex flex-col bg-white/6 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/10 transition-all duration-200">
  <div className="h-1.5 w-full" style={{ backgroundColor: project.color }} />
```
with:
```jsx
<div
  className="group relative flex flex-col bg-white/6 backdrop-blur-md border border-white/10 border-l-4 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/10 transition-all duration-200"
  style={{ borderLeftColor: project.color }}
>
```
(the old top-bar `<div>` is removed entirely — the color now comes from the card's own left border).

- [ ] **Step 3: Verify lint**

Run: `npx eslint src/pages/ProjectsPage.jsx`
Expected: no output.

- [ ] **Step 4: Verify in browser**

Navigate to `/tasks` (the Projects list route). Confirm: top nav bar with logo + Proyectos/Notas/Biblioteca
links replaces the old back-button header, project cards show a colored left edge instead of a
colored top bar, background is the existing dark gradient, clicking "Notas"/"Biblioteca" navigates
correctly, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProjectsPage.jsx
git commit -m "style(projects): add top nav bar and move card color accent to left border"
```

---

### Task 4: Tasks page (List / Kanban / Gestión views)

**Files:**
- Modify: `src/pages/TasksPage.jsx`
- Modify: `src/components/tasks/ListView.jsx`
- Modify: `src/components/tasks/KanbanBoard.jsx`
- Modify: `src/components/tasks/KanbanColumn.jsx`
- Modify: `src/components/tasks/TaskCard.jsx`
- Modify: `src/components/tasks/TaskModal.jsx`
- Modify: `src/components/gestion/GestionPanel.jsx`
- Modify: `src/components/gestion/GestionCards.jsx`
- Modify: `src/components/gestion/GestionTable.jsx`
- Modify: `src/components/gestion/GestionSettings.jsx`
- Modify: `src/components/gestion/PersonnelModal.jsx`

This page today mixes a light List/Gestión view with an already-dark Kanban view. The goal is one
consistent dark theme across all three, using the Design Token Mapping table.

- [ ] **Step 1: `TasksPage.jsx` — darken the shell and header**

Replace (line 37 and line 53), both instances of:
```jsx
bg-slate-50
```
with `bg-slate-950`.

Replace (line 54):
```jsx
<header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 shrink-0">
```
with:
```jsx
<header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 py-3 shrink-0">
```

Replace (line 58):
```jsx
className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-all shrink-0"
```
with:
```jsx
className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all shrink-0"
```

Replace (line 75):
```jsx
<h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
```
with `text-white` instead of `text-slate-800`.

Replace (line 87), the view-switch segmented control track:
```jsx
<div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
```
with:
```jsx
<div className="flex bg-white/5 rounded-xl p-1 shrink-0">
```

For each of the three view-switch buttons (lines 90-92, 101-103, 112-114), replace the active/inactive
class expression:
```jsx
view === 'kanban' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
```
with:
```jsx
view === 'kanban' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
```
(same pattern for the `'list'` and `'gestion'` buttons, substituting the matching `view === '...'`).

Replace (line 127):
```jsx
className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all"
```
with:
```jsx
className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 border border-white/10 text-slate-300 rounded-xl text-sm font-semibold hover:bg-white/10 active:scale-95 transition-all"
```

Replace the "Nueva columna" modal (lines 164-186):
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowNewColumn(false)}>
  <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
    <h3 className="text-sm font-semibold text-slate-800 mb-3">Nueva columna</h3>
    <form onSubmit={handleAddColumn} className="flex flex-col gap-3">
      <input
        type="text"
        value={newColName}
        onChange={e => setNewColName(e.target.value)}
        placeholder="Nombre de la columna..."
        autoFocus
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={savingCol || !newColName.trim()} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
          {savingCol ? 'Creando...' : 'Crear'}
        </button>
        <button type="button" onClick={() => { setShowNewColumn(false); setNewColName('') }} className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  </div>
</div>
```
with:
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowNewColumn(false)}>
  <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
    <h3 className="text-sm font-semibold text-white mb-3">Nueva columna</h3>
    <form onSubmit={handleAddColumn} className="flex flex-col gap-3">
      <input
        type="text"
        value={newColName}
        onChange={e => setNewColName(e.target.value)}
        placeholder="Nombre de la columna..."
        autoFocus
        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={savingCol || !newColName.trim()} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
          {savingCol ? 'Creando...' : 'Crear'}
        </button>
        <button type="button" onClick={() => { setShowNewColumn(false); setNewColName('') }} className="flex-1 py-3 border border-white/10 text-slate-300 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 2: `ListView.jsx` — darken search bar, progress bar, column groups and rows**

Replace (line 138-144), the search input:
```jsx
className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
```
with:
```jsx
className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
```
Also change the search icon color on line 135 from `text-slate-400` to `text-slate-500`, and the
progress-bar track on line 148 from `bg-slate-100` to `bg-white/10`.

Replace (line 167), each column group container:
```jsx
<div key={col.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
```
with:
```jsx
<div key={col.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
```

Replace (line 171), the column header button:
```jsx
className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
```
with:
```jsx
className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/10 active:bg-white/15 transition-colors"
```
and (line 174) `text-slate-700` → `text-white`, (line 175) `text-slate-400 ... bg-slate-100` →
`text-slate-400 ... bg-white/10`.

Replace (line 186), the task-row container border:
```jsx
<div className="border-t border-slate-100 px-1 py-1">
```
with `border-t border-white/10`.

In `TaskRow` (lines 22-88): replace (line 29):
```jsx
className="flex items-center gap-3 px-3 sm:px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl cursor-pointer group transition-colors"
```
with:
```jsx
className="flex items-center gap-3 px-3 sm:px-4 py-3.5 hover:bg-white/10 active:bg-white/15 rounded-xl cursor-pointer group transition-colors"
```
Replace (line 50-51), the task title text color:
```jsx
${isDone ? 'line-through text-slate-400' : 'text-slate-700 group-hover:text-violet-700'}`}
```
with:
```jsx
${isDone ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-violet-300'}`}
```
Replace `PRIORITY_CONFIG` (lines 5-10) with the dark badge variants from the mapping table:
```jsx
const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    class: 'bg-emerald-500/15 text-emerald-300' },
  medium: { label: 'Media',   class: 'bg-amber-500/15 text-amber-300' },
  high:   { label: 'Alta',    class: 'bg-orange-500/15 text-orange-300' },
  urgent: { label: 'Urgente', class: 'bg-red-500/15 text-red-300' },
}
```
Replace the two `bg-violet-50 text-violet-600` tag chips (lines 63, 71) with `bg-violet-500/15 text-violet-300`.

- [ ] **Step 3: `KanbanBoard.jsx` and `KanbanColumn.jsx` — audit for any remaining light classes**

These two files already render the dark Kanban board visible in the reference screenshot. Read
both files and grep for the light-theme patterns from the mapping table (`bg-white`, `bg-slate-50`,
`bg-slate-100`, `border-slate-`, `text-slate-700`, `text-slate-800`) that are NOT already guarded
behind a dynamic/inline `style` (per-column custom colors must stay dynamic). Apply the mapping
table to any match found. If no matches are found, leave the files untouched and note that in the
commit message.

- [ ] **Step 4: `TaskCard.jsx` and `TaskModal.jsx` — apply the mapping table**

Read both files and replace every light-theme class from the mapping table with its dark
equivalent (card backgrounds, borders, modal surface `bg-white` → `bg-slate-900 border
border-white/10`, input fields, priority badges reusing the `PRIORITY_CONFIG` dark values from
Step 2 if duplicated locally).

- [ ] **Step 5: `GestionPanel.jsx`, `GestionCards.jsx`, `GestionTable.jsx`, `GestionSettings.jsx`, `PersonnelModal.jsx` — apply the mapping table**

Read all five files and replace every light-theme class from the mapping table with its dark
equivalent: page/panel backgrounds (`bg-slate-50`/`bg-white` → `bg-slate-950`/`bg-white/5`), the
"Sin candidatos" empty state icon chip and text, the `Tabla`/`Tarjetas` and `Filtros` toggle
buttons, the `+ Nuevo candidato` button (keep its violet gradient), table headers/rows/borders, and
the `PersonnelModal` form surface and inputs.

- [ ] **Step 6: Verify lint**

Run:
```bash
npx eslint src/pages/TasksPage.jsx src/components/tasks/ListView.jsx src/components/tasks/KanbanBoard.jsx src/components/tasks/KanbanColumn.jsx src/components/tasks/TaskCard.jsx src/components/tasks/TaskModal.jsx src/components/gestion/GestionPanel.jsx src/components/gestion/GestionCards.jsx src/components/gestion/GestionTable.jsx src/components/gestion/GestionSettings.jsx src/components/gestion/PersonnelModal.jsx
```
Expected: no output.

- [ ] **Step 7: Verify in browser**

Navigate to `/tasks/:projectId` for a project with tasks. Switch between Tablero, Lista and Gestión
— confirm all three now share the same dark background/card/border treatment, drag-and-drop on the
Kanban board still works, opening a task (`TaskModal`) and a candidate (`PersonnelModal`) shows a
dark modal surface, priority badges are legible, no console errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/TasksPage.jsx src/components/tasks/ src/components/gestion/
git commit -m "style(tasks): unify List/Kanban/Gestión views under the dark theme"
```

---

### Task 5: Editor (NoteEditor + EditorToolbar)

**Files:**
- Modify: `src/components/editor/NoteEditor.jsx`
- Modify: `src/components/editor/EditorToolbar.jsx`

- [ ] **Step 1: Darken the error state background**

In `NoteEditor.jsx`, replace (line 40):
```jsx
<div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
```
with:
```jsx
<div className="flex items-center justify-center h-full bg-slate-950">
```

- [ ] **Step 2: Darken the top bar (title + save indicator + date picker)**

Replace (line 115):
```jsx
<div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
```
with:
```jsx
<div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
```

Replace (line 127-129), the title textarea classes:
```jsx
className="w-full text-xl sm:text-[1.75rem] font-bold text-slate-900 bg-transparent
           border-none outline-none resize-none leading-tight
           placeholder-slate-200 transition-colors duration-200"
```
with:
```jsx
className="w-full text-xl sm:text-[1.75rem] font-bold text-white bg-transparent
           border-none outline-none resize-none leading-tight
           placeholder-white/20 transition-colors duration-200"
```

- [ ] **Step 3: Darken the editor content area and prose theme**

Replace (line 149):
```jsx
<div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8">
```
with:
```jsx
<div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8 bg-slate-950 min-h-[calc(100%-6rem)]">
```

Replace (line 154), the `prose prose-slate` class on `EditorContent`:
```jsx
className="prose prose-slate prose-sm max-w-none min-h-[400px]
           focus:outline-none
           [&_.tiptap]:outline-none
           [&_.tiptap_p.is-editor-empty:first-child::before]:text-slate-300
           [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
           [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
           [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
           [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
```
with:
```jsx
className="prose prose-invert prose-sm max-w-none min-h-[400px]
           focus:outline-none
           [&_.tiptap]:outline-none
           [&_.tiptap_p.is-editor-empty:first-child::before]:text-white/30
           [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
           [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
           [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
           [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
```
(`prose-slate` → `prose-invert` is Tailwind Typography's built-in dark variant — this alone
recolors all headings/paragraphs/lists generated by TipTap without per-tag overrides.)

- [ ] **Step 4: Darken the skeleton loader**

Replace `EditorSkeleton` (lines 196-213) with:
```jsx
function EditorSkeleton() {
  return (
    <div className="animate-pulse bg-slate-950 h-full">
      <div className="sticky top-0 bg-slate-950 border-b border-white/10 px-4 sm:px-10 py-3 sm:py-4">
        <div className="h-8 sm:h-10 bg-white/5 rounded-xl w-2/3 mb-3" />
        <div className="h-8 sm:h-9 bg-white/5 rounded-xl w-1/4" />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8">
        <div className="h-10 bg-white/5 rounded-xl mb-6" />
        <div className="space-y-3">
          <div className="h-4 bg-white/5 rounded-lg w-full" />
          <div className="h-4 bg-white/5 rounded-lg w-5/6" />
          <div className="h-4 bg-white/5 rounded-lg w-4/6" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Darken the toolbar**

In `EditorToolbar.jsx`, replace (line 5):
```jsx
<div className="flex items-center gap-0.5 px-2 py-1.5 mb-4 border border-slate-200/60 rounded-xl bg-white/80 backdrop-blur-sm flex-wrap overflow-x-auto shadow-sm">
```
with:
```jsx
<div className="flex items-center gap-0.5 px-2 py-1.5 mb-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm flex-wrap overflow-x-auto">
```

Replace `ToolbarButton` (lines 106-125) with:
```jsx
function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs font-medium
        transition-all duration-150
        ${active
          ? 'bg-violet-500/20 text-violet-300'
          : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  )
}
```

Replace `Divider` (line 127-129):
```jsx
function Divider() {
  return <div className="w-px h-5 bg-white/10 mx-0.5" />
}
```

- [ ] **Step 6: Verify lint**

Run: `npx eslint src/components/editor/NoteEditor.jsx src/components/editor/EditorToolbar.jsx`
Expected: no output.

- [ ] **Step 7: Verify in browser**

Navigate to `/dashboard`, open an existing note (or create one). Confirm: editor canvas, top bar,
toolbar and TipTap content are all dark, save indicator dots (emerald/amber/red) are still visible
against the dark background, typing/formatting still works (bold/italic/lists/undo), no console errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/editor/NoteEditor.jsx src/components/editor/EditorToolbar.jsx
git commit -m "style(editor): darken canvas, toolbar and prose theme to match app-wide dark theme"
```

---

### Task 6: Register page

**Files:**
- Modify: `src/pages/RegisterPage.jsx`

- [ ] **Step 1: Apply the same background treatment as Login**

Replace (line 92):
```jsx
<div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900">
```
with:
```jsx
<div className="min-h-screen flex bg-slate-950 relative overflow-hidden">
  <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
  <div className="absolute bottom-0 -left-20 w-[32rem] h-[32rem] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
```
(orbs mirrored left/right vs. Login so the two auth pages don't look identical). Add `relative z-10`
to the two `flex-1` children exactly as in Task 1, Step 1.

- [ ] **Step 2: Verify lint**

Run: `npx eslint src/pages/RegisterPage.jsx`
Expected: no output.

- [ ] **Step 3: Verify in browser**

Navigate to `/register`, confirm the same solid dark + glow-orb background, the password
requirements checklist (emerald/violet accents) still reads correctly against the dark card, no
console errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RegisterPage.jsx
git commit -m "style(register): match Login's dark background with glow orbs"
```

---

### Task 7: Biblioteca page

**Files:**
- Modify: `src/pages/BibliotecaPage.jsx`
- Modify: `src/components/biblioteca/DocumentCard.jsx`
- Modify: `src/components/biblioteca/DocumentGridCard.jsx`
- Modify: `src/components/biblioteca/DocumentEditor.jsx`
- Modify: `src/components/biblioteca/DocumentToolbar.jsx`
- Modify: `src/components/biblioteca/DocumentPreviewModal.jsx`
- Modify: `src/components/biblioteca/DocumentViewModal.jsx`

No Stitch mockup exists for this page — apply the Design Token Mapping table directly.

- [ ] **Step 1: Read `BibliotecaPage.jsx` in full and list every distinct light-theme class**

Since this file is 738 lines, read it completely before editing (don't rely on partial reads) so
no light-theme instance is missed: page background, header/toolbar, folder/document grid or list
surfaces, search input, any dropdown/menu, empty states.

- [ ] **Step 2: Apply the mapping table to `BibliotecaPage.jsx`**

Replace every match of the mapping table's "Old (light)" column with its "New (dark)" equivalent.
Keep any per-document dynamic `style={{ backgroundColor: ... }}` (e.g. a document's own accent
color) untouched — only static Tailwind utility classes change.

- [ ] **Step 3: Apply the mapping table to the six `components/biblioteca/*.jsx` files**

Read each file fully, then replace matches of the mapping table the same way: card surfaces in
`DocumentCard.jsx`/`DocumentGridCard.jsx`, the toolbar in `DocumentToolbar.jsx`, and the two modals
(`DocumentPreviewModal.jsx`, `DocumentViewModal.jsx` — modal surface `bg-white` → `bg-slate-900
border border-white/10`, per the mapping table). For `DocumentEditor.jsx`, apply the same
`prose-slate` → `prose-invert` swap used in Task 5 if it renders TipTap/rich-text content, plus the
mapping table for its own chrome.

- [ ] **Step 4: Verify lint**

Run:
```bash
npx eslint src/pages/BibliotecaPage.jsx src/components/biblioteca/
```
Expected: no output.

- [ ] **Step 5: Verify in browser**

Navigate to `/biblioteca`. Confirm: page background, cards/list rows, toolbar and any open modal
all match the dark theme used elsewhere, document preview/edit still opens and closes correctly,
no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/BibliotecaPage.jsx src/components/biblioteca/
git commit -m "style(biblioteca): apply the app-wide dark theme tokens"
```

---

### Task 8: Admin pages

**Files:**
- Modify: `src/pages/admin/AdminDashboard.jsx`
- Modify: `src/pages/admin/UsersPanel.jsx`
- Modify: `src/pages/admin/ActivityLog.jsx`

No Stitch mockup exists for these — apply the Design Token Mapping table directly.

- [ ] **Step 1: Read all three files fully**

`AdminDashboard.jsx` (167 lines), `UsersPanel.jsx` (398 lines), `ActivityLog.jsx` (106 lines).

- [ ] **Step 2: Apply the mapping table to each file**

Replace every match of the mapping table's "Old (light)" column with its "New (dark)" equivalent:
page backgrounds, stat/summary cards on `AdminDashboard`, the users table and any role-change
controls on `UsersPanel`, and the activity list/timeline on `ActivityLog`. Keep any status-color
logic (e.g. role badges, activity type colors) but convert their light `-100/-700` pairs to the
`-500/15` / `-300` dark pairs from the mapping table.

- [ ] **Step 3: Verify lint**

Run:
```bash
npx eslint src/pages/admin/
```
Expected: no output.

- [ ] **Step 4: Verify in browser**

Log in as a superadmin/admin user, navigate to `/admin`, `/admin/users`, and `/admin/activity`.
Confirm all three pages match the dark theme, tables/lists are legible, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/
git commit -m "style(admin): apply the app-wide dark theme tokens"
```

---

## Deviation from spec

The design spec's Login section mentioned adding a "¿Olvidaste tu contraseña?" (forgot password)
link. There is no password-reset route or Supabase call implemented anywhere in this app, and the
spec explicitly puts logic/route changes out of scope. Adding a link with no destination would be
a dead end, so **this item is dropped from Task 1**. If a working password-reset flow is wanted,
it should be scoped as its own follow-up feature (new route + Supabase `resetPasswordForEmail` call
+ confirmation page), not bundled into a visual reskin.
