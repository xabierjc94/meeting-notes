# Persistent, Section-Aware App Sidebar — Implementation Plan

> Execute with `claude-mem:do`. Each phase is self-contained: read the cited lines before editing.

**Goal:** One sidebar that stays mounted while navigating between Notas (`/dashboard`), Tareas
(`/tasks`, `/tasks/:projectId`) and Biblioteca (`/biblioteca`). The *frame* never changes (logo +
collapse button, greeting, nav tabs with active state by route, user footer, 72px collapsed rail
persisted in localStorage). Only the *middle section* changes per route: Notas → new note + search +
notes list; Tareas → new project + projects list; Biblioteca → create/import + search + folder tree
+ stats.

**User decision (AskUserQuestion, 2026-10-09):** "Se adapta a la sección" — a single shared frame
whose middle adapts per section (Notion/Linear pattern).

## Architecture (decided by orchestrator)

- **Layout route + Outlet.** A pathless layout route renders `<AppLayout>`; `/dashboard`, `/tasks`,
  `/tasks/:projectId`, `/biblioteca` become its children. Because the layout element stays mounted
  across child-route changes, the frame never remounts (no flicker, no replayed slide-in animation,
  collapse state kept in memory).
- **Portal slots, not lifted state.** The frame exposes two empty DOM nodes through a context:
  `panelEl` (middle section, expanded mode) and `railEl` (section quick-actions, collapsed mode).
  Each page renders its section content into them with `createPortal`. Pages keep owning their state,
  providers and modals; React context and events still flow through the page's React tree (portals
  preserve both). This avoids lifting Biblioteca's ~12 pieces of page-local state.
- **One DOM tree for desktop and mobile.** Below `md` the same `<aside>` becomes a fixed off-canvas
  drawer (`-translate-x-full` ↔ `translate-x-0`) with a backdrop. One tree ⇒ one slot ⇒ fixes the
  current duplicate `id="biblioteca-file-input"` (desktop + mobile copies).
- **Suspense inside the layout.** Pages are `lazy()`. The only Suspense today wraps all `<Routes>`
  (App.jsx L77), so navigating to a not-yet-loaded page would replace the whole layout with
  `LoadingScreen` and the sidebar would vanish. AppLayout must wrap `<Outlet/>` in its own
  `<Suspense>` with an in-content fallback.
- **Providers stay per-route.** NotesProvider stays on `/dashboard`, BibliotecaProvider on
  `/biblioteca`. New `ProjectsProvider` wraps both `/tasks` routes via a pathless nested route.
  Admin routes are untouched (no sidebar).

## Phase 0 — Documentation discovery (DONE, consolidated)

**Allowed APIs (verified in installed packages):**
- react-router-dom **7.14.2** re-exports `react-router` 7.14.2: `Outlet`, `NavLink`, `useLocation`,
  `useMatch`, `useParams`, `useNavigate`, `Link`, `Navigate`, `Routes`, `Route`
  (node_modules/react-router/dist/development/index.d.ts export lists L6, L1390).
  Pathless layout route: `<Route element={<Layout/>}>…children…</Route>`; nested child routes keep
  absolute paths (`path="/dashboard"`) — valid in v7.
- React 19: `createPortal(children, domNode)` from `react-dom` (already used in DatePicker.jsx,
  DocumentToolbar.jsx). Callback ref into state (`ref={setPanelEl}`) to re-render consumers when
  the node mounts.
- Contexts: `useNotes()` (NotesContext.jsx L143, setter is `setActiveNote`, NOT `setActiveNoteId`;
  `createNote()` takes no args); `useBiblioteca()` (BibliotecaContext.jsx L209); `useTasks()`
  (TasksContext.jsx L125, does not throw); `useAuth()` → `{ user, profile, profileLoaded, loading,
  signOut }`.
- projectsApi.js: `getProjects(userId)`, `createProject(userId, data)`, `updateProject(id, data)`,
  `deleteProject(id)`, `getProjectTaskCounts(userId)` → `{ [projectId]: count }` (never throws).
- CSS: `animate-slideInLeft`, `animate-fadeIn`, `animate-scaleIn` in src/index.css L75-78.

**Anti-patterns to avoid:**
- Do NOT move NotesProvider/BibliotecaProvider into AppLayout (would fetch everything everywhere and
  `useBiblioteca()` throws outside its provider — not needed with portals).
- Do NOT render the section content twice (desktop + mobile). One aside, one slot.
- Do NOT use `document.getElementById` for slots; use the context-provided nodes.
- Do NOT touch the white paper / export pipeline in DocumentEditor.jsx or DocumentToolbar.jsx.
- Do NOT add a keyboard shortcut (Ctrl+B = bold in editors; Ctrl+\ = clear formatting).
- Keep localStorage key `dashboard-sidebar-collapsed` (users' existing preference), try/catch every
  access.

**Current code map:**
- DashboardPage.jsx: helpers `getGreeting` L8-13, `getInitials` L15-18, `SIDEBAR_COLLAPSED_KEY` L20,
  `ICONS` L22-31, `Icon` L33-39, `readCollapsed` L41-43, `SidebarRail` L45-107, `SidebarContent`
  L109-273 (frame: brand+collapse L117-137, greeting L139-142, nav L144-164, footer L245-270;
  section: new note L166-180, search L183-200, list L202-243), page state L276-282, aside L344-361,
  mobile overlay L363-378, mobile header L382-413.
- BibliotecaPage.jsx: `Sidebar` L300-499 (frame parts: brand L316-325, greeting L327-328, nav
  L330-344, footer ~L478-497; section: action buttons + hidden file input L346-389, search
  ~L392-416, folder tree ~L419-463, stats ~L466-476), page state L633-643, handlers L645-742,
  `sidebarEl` L759-778, aside L830, mobile overlay L832-838, mobile header L843-859 (uses
  `setSidebarOpen` also at L668, L710).
- ProjectsPage.jsx: `PROJECT_COLORS` L7-10, `ProjectModal` L12-100, `ProjectCard` L102-148,
  fetch/save L159-199, root L207, header with top nav L208-236.
- TasksPage.jsx: `TasksContent` L11-190 (header L54-148, back Link L56-63), default export L192-211
  (project from `location.state` or fetch; **stale-project bug** if `projectId` changes while
  mounted — becomes reachable once the sidebar lists projects).
- App.jsx: ProtectedRoute L49-54 (children-based), Suspense L77, routes L82-109.

---

## Phase 1 — AppLayout frame + route restructure + migrate Notas

**Create `src/components/layout/AppSidebarContext.jsx`:**
- `AppSidebarContext` + `useAppSidebar()` (throw outside provider) exposing
  `{ panelEl, railEl, collapsed, setCollapsed, openMobile, closeMobile }`.

**Create `src/components/layout/AppLayout.jsx`** (copy frame markup from DashboardPage
`SidebarContent` L117-164 + L245-270 and `SidebarRail` L45-107; helpers L8-43):
- State: `collapsed` (useState(readCollapsed), persisted setter), `mobileOpen`,
  `panelEl`/`railEl` via `useState(null)` + callback refs.
- Close mobile drawer on route change: `useEffect(() => setMobileOpen(false), [location.pathname])`.
- Root: `<div className="flex h-dvh bg-slate-950 overflow-hidden">`.
- Backdrop (mobile only, when open): `fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden`.
- `<aside>`: mobile `fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-300
  ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`; desktop `md:static md:translate-x-0
  md:z-auto md:transition-[width] ${collapsed ? 'md:w-[72px]' : 'md:w-80'}`; `shrink-0
  overflow-hidden border-r border-white/5`. Inner content keeps fixed width (clipped during the
  width animation — same technique as commit 49900ce).
- Expanded frame (desktop not collapsed, and always on mobile): brand + button «
  (desktop: collapse; mobile: close drawer — two buttons with `hidden md:flex` / `md:hidden`),
  greeting line, nav tabs built with **`NavLink`** to `/dashboard`, `/tasks`, `/biblioteca`
  (`/tasks` must be active for `/tasks/:id` too — NavLink default prefix matching does this; set
  `end` only on none), then `<div ref={setPanelEl} className="flex-1 min-h-0 flex flex-col" />`,
  then user footer (avatar initials, name, email, sign out via `useAuth().signOut`).
- Collapsed rail (desktop only): logo, » expand, nav icons (NavLink, active = `bg-white/10
  text-white`), divider, `<div ref={setRailEl} className="flex flex-col items-center gap-2" />`,
  footer avatar + sign out. When collapsed, the panel node must still exist? **No** — render the
  panel slot only in expanded mode and the rail slot only in collapsed mode; pages render portals
  conditionally on the node being non-null, so they naturally switch.
- `<main className="flex-1 flex flex-col min-w-0 overflow-hidden">` containing
  `<Suspense fallback={<spinner centered>}><Outlet/></Suspense>`.
- Provider wraps everything: `<AppSidebarContext.Provider value={…}>`.

**Edit `src/App.jsx`** (routes L82-109):
```jsx
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<NotesProvider><DashboardPage /></NotesProvider>} />
  <Route path="/biblioteca" element={<BibliotecaProvider><BibliotecaPage /></BibliotecaProvider>} />
  <Route path="/tasks" element={<ProjectsPage />} />
  <Route path="/tasks/:projectId" element={<TasksPage />} />
</Route>
```
(ProjectsProvider wrapper is added in Phase 3.) AppLayout imported eagerly (not lazy) so the frame
is available immediately.

**Migrate `src/pages/DashboardPage.jsx`:**
- Remove: frame helpers that moved (keep `getGreeting` only if still used — it won't be), `SidebarRail`,
  frame parts of `SidebarContent`, collapse state, `sidebarOpen`, desktop aside, mobile overlay.
- Keep a `NotesSidebarSection` (new-note button + search + notes list from L166-243) rendered with
  `createPortal(…, panelEl)`; and rail quick actions (new note "+" and search icon from L73-86)
  with `createPortal(…, railEl)`. Search icon: `setCollapsed(false)` + local `focusSearch` →
  `autoFocus` on the input.
- Section subtitle "¿Qué vas a documentar hoy?" goes at the top of the section content.
- Mobile header hamburger → `openMobile()`. After `createNote` → `closeMobile()`.
- Root of page becomes the old `<main>` content only (header + content area), sized `flex-1
  flex flex-col min-h-0`.

**Verification:**
- `npx eslint src/App.jsx src/components/layout src/pages/DashboardPage.jsx` → 0 errors.
- `npm run build` → success.
- grep: no `SidebarRail`/`sidebarOpen` left in DashboardPage.jsx.
- Browser (user logged in on localhost:5173): sidebar shows on /dashboard, collapse/expand works and
  persists after reload, mobile (resize_window mobile) hamburger opens drawer, backdrop closes it.
- Biblioteca and Tareas still render (they will show the frame with an empty middle until Phases
  2-3; Biblioteca will temporarily show its own old sidebar too — acceptable mid-plan, fixed next).

## Phase 2 — Migrate Biblioteca

**Edit `src/pages/BibliotecaPage.jsx`:**
- Rename `Sidebar` → `BibliotecaSidebarSection`; delete its frame parts (brand, greeting, nav,
  footer — see code map) and the props only they used (`greeting`, `userName`, `user`,
  `handleSignOut`). Keep subtitle "Tu biblioteca", action buttons, hidden file input, search,
  folder tree, stats. Keep emerald accents inside the section (section identity).
- Render it with `createPortal(<BibliotecaSidebarSection …/>, panelEl)` (when `panelEl`).
  Rail quick actions via `railEl`: "Nuevo documento" (`handleCreateDoc`) and "Importar"
  (`<label htmlFor="biblioteca-file-input">`) — BUT the input lives in the panel section, which is
  unmounted in collapsed mode. Therefore move the hidden `<input id="biblioteca-file-input">` out of
  the section into the page body (rendered once, always) and keep the `<label htmlFor>` in the
  section/rail. DocumentsGrid `onImport` (`getElementById(...).click()`, L880) keeps working.
- Remove `sidebarOpen` state, desktop aside L830, mobile overlay L832-838; replace
  `setSidebarOpen(false)` (L668, L710) with `closeMobile()`; hamburger → `openMobile()`.
- Remove dead `const activeDoc` (L757) and now-unused helpers/imports.
- Root `<div className="flex h-dvh …">` (L781) becomes `flex-1 flex flex-col min-h-0` content root;
  modals stay where they are.

**Verification:** eslint (only pre-existing errors — compare with `git show HEAD:…`), build;
grep exactly one `id="biblioteca-file-input"`; browser: folder click filters grid, search filters,
"Nuevo documento" opens TemplateModal, import opens preview modal (also from collapsed rail and from
the empty-state Importar button), editor still opens with white paper.

## Phase 3 — Tareas: ProjectsProvider, shared ProjectModal, projects section

**Create `src/context/ProjectsContext.jsx`:** copy fetch/save/delete logic from ProjectsPage.jsx
L151-199 into `ProjectsProvider` (`projects`, `taskCounts`, `loading`, `refresh`, `addProject(data)`,
`editProject(id, data)`, `removeProject(id)`) using only the projectsApi functions listed in Phase 0;
`useProjects()` throws outside provider.

**Create `src/components/tasks/ProjectModal.jsx`:** move `PROJECT_COLORS` + `ProjectModal`
(ProjectsPage.jsx L7-100) verbatim, export default.

**Create `src/components/tasks/ProjectsSidebarSection.jsx`:** subtitle "Tus proyectos",
"Nuevo proyecto" button (opens its own ProjectModal; on save `addProject` then `navigate` to
`/tasks/${created.id}` with `state={{ project: created }}`), list of projects as `NavLink` to
`/tasks/:id` (color dot from `project.color`, name truncate, task count from `taskCounts`, active
`bg-white/10 text-white`), loading skeleton, empty state.

**Edit `src/App.jsx`:** wrap the two tasks routes in a pathless route
`<Route element={<ProjectsProvider><Outlet /></ProjectsProvider>}>`.

**Edit `src/pages/ProjectsPage.jsx`:** use `useProjects()` instead of local fetch state; import
ProjectModal from the new file; portal `ProjectsSidebarSection` into `panelEl` and a "+"
quick action into `railEl`; header: remove logo + top nav (L211-224), keep title "Proyectos" and
"Nuevo proyecto" button, add mobile hamburger (`md:hidden`, `openMobile()`); root (L207) becomes
`flex-1 flex flex-col min-h-0` and drops its own gradient background (canvas is the layout's
`bg-slate-950`).

**Edit `src/pages/TasksPage.jsx`:** portal the same `ProjectsSidebarSection`; derive the project as
`projects.find(p => p.id === projectId) ?? fetchedProject` and reset the fetch when `projectId`
changes (fixes stale-project bug); add `key={projectId}` on `<TasksProvider>` so view state and
data reset when switching projects from the sidebar; header keeps back link + controls, add mobile
hamburger; loading root `h-dvh` (L37) and root (L53) become `flex-1 … min-h-0`.

**Verification:** eslint, build; browser: /tasks lists projects in sidebar, clicking a project
opens its board and the sidebar item is highlighted, switching projects from the sidebar shows the
right board/title, "Nuevo proyecto" from the board page creates and navigates, kanban drag & drop
still works, back link works.

## Phase 4 — Final verification

- `npx eslint src` — compare error list with `git stash`/HEAD baseline: no new errors.
- `npm run build`.
- grep anti-patterns: no `id="biblioteca-file-input"` duplicates; no `useNotes(`/`useBiblioteca(`
  in `src/components/layout`; no remaining top nav links `to="/dashboard"` in ProjectsPage/TasksPage
  headers; admin routes unchanged (`git diff src/pages/admin src/components/admin` empty).
- Browser pass (user logged in): navigate Notas → Tareas → proyecto → Biblioteca → Notas and confirm
  the frame never disappears or replays its animation; collapse on one section persists on the
  others; mobile drawer on each section; console has no errors.
- Commit per phase (feat(layout)/refactor(…) messages), push at the end (Coolify auto-deploys on
  push — verified 2026-10-09).
