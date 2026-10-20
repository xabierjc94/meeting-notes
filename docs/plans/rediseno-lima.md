# Plan de rediseño de MeetingNotes: negro neutro + lima

Inspiración: shot de Dribbble *"Task Management Web App UI – Kanban Board, Timeline, Calendar"* (Vislume Studio).
Decisiones de Javi (20/10/2026):

- **Alcance:** toda la app, por fases. Cada fase se despliega y se revisa antes de empezar la siguiente.
- **Acento:** lima sobre negro neutro. El violeta desaparece.
- **Vistas nuevas:** Calendario y Timeline entran en la fase de Tareas.

Cada fase es autocontenida: se puede ejecutar en una conversación nueva leyendo solo esta fase, la **Fase 0** y la sección *Reglas para todas las fases*.

---

## Fase 0: Descubrimiento (hecho)

### Versiones y configuración reales

| Pieza | Valor | Dónde |
|---|---|---|
| Tailwind | 4.2.4 (PostCSS, `@tailwindcss/postcss`) | `package.json` |
| Tipografía (prose) | `@tailwindcss/typography` 0.5.19, cargado con `@plugin` | `src/index.css:2` |
| Tokens actuales | bloque `@theme` con `--font-sans: 'Inter'` y la escala `--color-violet-50…900` | `src/index.css:6-18` |
| Fuente | Inter 300-800 desde Google Fonts (`<link>`) | `index.html:35-37` |
| Color del navegador móvil | `<meta name="theme-color" content="#7c3aed">` (violeta) | `index.html:10` |
| React / Vite / dnd-kit | 19.2.5 / 8.0.10 / 6.3.1 | `node_modules` |
| Vistas de Tareas | `const [view, setView] = useState('kanban')` con `'kanban' \| 'list' \| 'gestion'`; selector en `TasksPage.jsx:117-141` y render en `:183-185` | `src/pages/TasksPage.jsx` |
| Modal de tarea | `TaskModal({ task, defaultColumnId, defaultTitle, onClose })` | `src/components/tasks/TaskModal.jsx:15` |
| Campos de tarea | `due_date` (date), `created_at`, `priority`, `tags[]`, `column_id`, `position`, `recurrence`, `recurrence_parent`, `notes`. **No hay fecha de inicio.** | `tasks-migration.sql`, `recurring-tasks-migration.sql` |

> El inventario de colores por archivo (cuántos `violet-`, `slate-`, degradados y `blur` hay en cada archivo) está en el **Anexo A**.

### APIs permitidas (verificadas)

- **Tailwind v4 `@theme`:** cada variable `--color-NOMBRE` genera las utilidades `bg-NOMBRE`, `text-NOMBRE`, `border-NOMBRE`, etc. Ejemplo real: `node_modules/tailwindcss/theme.css` (`@theme default { --font-sans: … }`). Redefinir una variable existente (por ejemplo `--color-slate-900`) cambia esa utilidad en toda la app.
- **No existe `tailwind.config.js`** en v4 y no hay que crearlo.
- **`@custom-variant`** y **`@plugin`** son las directivas de v4.
- **React DOM:** `createPortal` y `flushSync` (ya se usan en `ConfirmDialog` y `NoteEditor`).
- **React Router 7:** `useSearchParams` (para guardar la vista en la URL), `NavLink`, `Link`.
- **dnd-kit:** `DndContext`, `useDraggable`, `useDroppable` y `PointerSensor`/`KeyboardSensor`, el mismo paquete que ya usa `KanbanBoard.jsx`.
- **Helmet:** `react-helmet-async` (ya instalado).

### Antipatrones prohibidos

- Instalar librerías de UI o de calendario (shadcn, headlessui, FullCalendar, react-big-calendar, dayjs, date-fns). Las fechas se calculan a mano en `src/lib/dates.js`.
- Texto blanco sobre lima (contraste ≈ 1,3:1). Sobre lima, el texto siempre va en `accent-ink` (casi negro).
- Volver a meter degradados (`bg-gradient-to-*`), `backdrop-blur` decorativo u orbes `blur-3xl`.
- Tocar contextos, API o esquema. Las únicas excepciones permitidas, todas de UI, son:
  - una prop nueva `defaultDueDate` en `TaskModal`;
  - guardar la vista de Tareas en `?vista=` de la URL;
  - mover tareas en el calendario con el `editTask` que ya existe.
- Quitar `.stretched-link`, el anillo `:focus-visible`, los `aria-*` o los botones de 40 px en móvil, que se consiguieron en los lotes 1 a 4.

---

## Reglas para todas las fases

1. **Antes de tocar nada:** lista de archivos de la fase y una explicación a Javi, en español y didáctica, siguiendo su `CLAUDE.md`.
2. **Al terminar, verificación:**
   - Lint comparado con HEAD (`git show HEAD:f | npx eslint --stdin --stdin-filename f`): **cero errores nuevos**.
   - `npm run build`.
   - Capturas con el **arnés** (ver abajo) a 360, 768 y 1280 px.
   - Script de contraste sobre los tokens: todo el texto ≥ 4,5:1 y los iconos y bordes de control ≥ 3:1.
3. **Commit y push** solo cuando Javi lo pida. Mensaje de commit en español. Después, vigilar el despliegue con la cabecera `Last-Modified` de https://meetingnotes.es/.
4. **El arnés.** Las páginas con sesión no se pueden ver sin iniciar sesión, así que se monta la app real (AppLayout + página + contextos) con un Supabase falso en memoria. La plantilla está en `docs/plans/arnes-supabase-falso.js`; se pega en `javascript_tool` del navegador integrado con el servidor de desarrollo arrancado.

---

## Sistema de diseño (lo crea la Fase 1 y lo usan todas)

### Tokens (`src/index.css`, dentro de `@theme`)

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--color-canvas` | `#0f0f0f` | fondo de la app | — |
| `--color-surface` | `#161616` | barra lateral, paneles y columnas | — |
| `--color-card` | `#1e1e1e` | tarjetas, inputs y modales | — |
| `--color-card-hover` | `#262626` | hover de tarjetas | — |
| `--color-line` | `#2a2a2a` | bordes suaves | decorativo |
| `--color-line-strong` | `#3a3a3a` | bordes de controles | ≥ 3:1 sobre `card`: **pendiente de medir** |
| `--color-ink` | `#f5f5f5` | texto principal | ≈ 17:1 |
| `--color-ink-muted` | `#a3a3a3` | texto secundario | ≈ 7,5:1 sobre `canvas` |
| `--color-ink-subtle` | `#8a8a8a` | metadatos | ≈ 5,4:1 (medir también sobre `card`) |
| `--color-accent` | `#b4f53c` | botón principal, pestaña activa, contadores | — |
| `--color-accent-hover` | `#c4ff57` | hover del principal | — |
| `--color-accent-ink` | `#0f0f0f` | texto **sobre** lima | ≈ 14:1 |
| `--color-accent-soft` | `#b4f53c1f` | fondo de elemento activo (lima al 12 %) | — |
| `--color-danger` | `#f87171` | borrar y errores | ≥ 4,5:1 |

**Pills pastel** (fondo claro con texto oscuro, como en el ejemplo):

| Pill | Fondo / texto |
|---|---|
| `pill-rose` | `#f9c9e4` / `#3d1530` |
| `pill-yellow` | `#fbe38e` / `#3a2e00` |
| `pill-mint` | `#b9f0dc` / `#0e3a2b` |
| `pill-red` | `#ffb4ab` / `#4a0d07` |
| `pill-orange` | `#ffcf9e` / `#45230a` |
| `pill-sky` | `#bde3f5` / `#0c3347` |
| `pill-lilac` | `#d9cff7` / `#2a1c55` |

Correspondencias: prioridad Urgente → `red`, Alta → `orange`, Media → `yellow`, Baja → `mint`. Las etiquetas rotan entre `lilac`, `rose` y `sky` según un hash del texto, para que la misma etiqueta salga siempre del mismo color.

**Medida de transición:** se redefine `--color-slate-50…950` con los valores de la escala *neutral* de Tailwind. Así la app pierde el tinte azul en la fase 1 sin tocar sus 60 archivos. En la Fase 5 se renombra `slate-` → `neutral-` y se borra esta redefinición.

### Tipografía

`Plus Jakarta Sans` (400, 500, 600, 700) desde Google Fonts, en lugar de Inter. Es una geométrica como la del ejemplo y no añade dependencias npm.

### Primitivas nuevas (`src/components/ui/`)

| Componente | API | Notas |
|---|---|---|
| `Button.jsx` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md'`, `icon`, `as` | `primary` = lima con texto `accent-ink` |
| `IconButton.jsx` | `label` (obligatoria → `aria-label`), `icon`, `size` | 40 px en móvil |
| `Pill.jsx` | `tone` (los 7 pasteles), `children` | — |
| `Tabs.jsx` | `items=[{ id, label, icon }]`, `value`, `onChange` | `role="tablist"`, activa con texto lima y subrayado de 2 px |
| `PageHeader.jsx` | `breadcrumb=[{ label, to }]`, `title`, `icon`, `actions` | migas "Sección / Elemento" como en el ejemplo |
| `Avatar.jsx` (opcional) | `name`, `email` | iniciales sobre pastel |
| `Logo.jsx` | `size` | cuadrado lima con el icono en negro; sustituye los 14 logos con degradado |
| `Spinner.jsx` | `size`, `tone` | sustituye los 5 spinners copiados |
| clase `.field` en `index.css` | — | input estándar (`bg-card border-line … focus:ring-accent/50`); sustituye los 8 inputs repetidos y los 43 `focus:ring-violet-500/50` |

---

## Fase 1: Sistema de diseño y armazón (barra lateral + barra superior)

### Qué se hace

1. **`src/index.css`:**
   - añadir los tokens y las pills al `@theme`;
   - redefinir `slate` como neutral;
   - `--font-sans` pasa a Plus Jakarta Sans;
   - el anillo de foco pasa de `#a78bfa` a `--color-accent`;
   - el fondo del `body` pasa a `canvas`.
2. **`index.html`:** fuente nueva y `theme-color` a `#0f0f0f`.
3. **Crear las primitivas** de la tabla anterior.
4. **`AppLayout.jsx` (`SidebarFrame` / `SidebarRail`)** al estilo del ejemplo:
   - bloque de espacio de trabajo: logo cuadrado lima con el icono en negro, "MeetingNotes" y debajo "Espacio personal";
   - botón **"Buscar ⌘K"** que abre una **paleta de comandos** mínima (`src/components/layout/CommandPalette.jsx`): ir a Notas, Tareas o Biblioteca, "Nueva nota" y "Nuevo proyecto", con filtrado por texto, flechas y Enter. La búsqueda de notas y proyectos dentro de la paleta queda para más adelante;
   - etiqueta "MENÚ PRINCIPAL" y navegación **vertical** (icono + texto). La activa lleva fondo `card` y texto `ink`; el contador va en una pill lima;
   - el hueco del portal (`panelRef`) se mantiene debajo, para que cada sección siga pintando su panel;
   - pie con el usuario y "Cerrar sesión";
   - sin degradados ni orbes;
   - el rail (barra plegada) sigue el mismo lenguaje.
5. **`MobileTopBar.jsx`:** fondo `surface` y el botón de acción en lima.
6. **`PageHeader`:** se crea y se usa solo en `ProjectsPage`, como prueba piloto. El resto de páginas lo adoptan en sus fases.

### Archivos

`src/index.css`, `index.html`, `src/components/layout/AppLayout.jsx`, `src/components/layout/MobileTopBar.jsx`, `src/components/layout/CommandPalette.jsx` (nuevo), `src/components/ui/{Button,IconButton,Pill,Tabs,PageHeader}.jsx` (nuevos), `src/pages/ProjectsPage.jsx` (solo la cabecera).

### Verificación

- Arnés en `/tasks` y `/dashboard` a 360, 768 y 1280 px; el rail plegado a 768 px.
- ⌘K / Ctrl+K abre la paleta; Esc la cierra; el foco vuelve al botón.
- Script de contraste en verde.
- `grep -c "blur-3xl\|bg-gradient" src/components/layout/AppLayout.jsx` debe dar 0.
- El modo foco, "Nota rápida", el drawer móvil y la tableta siguen funcionando, comprobado con las pruebas de los lotes 3 y 4.

### Antipatrones

- No borrar los portales `panelEl` / `railEl`: las secciones dependen de ellos.
- No usar `translate-x-0` en el aside en reposo (ver el comentario en `AppLayout`).

---

## Fase 2: Tareas (incluye Calendario y Timeline)

### Qué se hace

1. **`ProjectsPage`:** tarjetas planas `card` con el color del proyecto como cuadradito, contador y `PageHeader` con el botón "Nuevo proyecto" en lima.
2. **Panel lateral de proyectos (`ProjectsSidebarSection`):** árbol con líneas guía, como "Projects → Apex Branding" en el ejemplo. El activo lleva texto lima y el contador va en pill lima.
3. **Cabecera del tablero (`TasksPage` → `TasksContent`):**
   - `PageHeader` con migas "Tareas / Nombre del proyecto";
   - título grande con el icono de color del proyecto;
   - acciones: "Nueva tarea" en lima y "Nueva columna" en secundario;
   - `Tabs` con **Tablero · Lista · Timeline · Calendario · Gestión**, subrayado lima;
   - la vista se guarda en `?vista=` (`useSearchParams`), así recargar no la pierde. Valores: `tablero`, `lista`, `timeline`, `calendario`, `gestion`.
4. **Kanban (`KanbanBoard`, `KanbanColumn`, `TaskCard`):**
   - columnas `surface` sin borde, cabecera "Por hacer • 3" con los botones `+` y `···`;
   - tarjetas `card` con la prioridad y las etiquetas como `Pill`, la fecha con icono de calendario y el borde-acento de prioridad eliminado;
   - "+ Añadir tarea" al pie, como en el ejemplo, sin perder el "añadir arriba" actual;
   - **se mantiene:** stretched-link, asa de arrastre accesible, parpadeo de urgentes (su color pasa a `pill-red`) y el icono de recurrentes.
5. **`ListView`, `TaskModal`, `GestionPanel/*`:** mismos tokens, pills y botones.
6. **Nueva vista `CalendarView.jsx`:**
   - mes en cuadrícula de lunes a domingo (`es-ES`), con "Hoy" en lima y botones ‹ › y "Hoy";
   - cada día muestra sus tareas por `due_date` como mini-pills con el color de su prioridad y "+N más";
   - **clic en un día vacío** → `TaskModal` con `defaultDueDate`;
   - **arrastrar una tarea a otro día** → `editTask(id, { due_date })` con dnd-kit;
   - **teclado:** el día es un botón y las tareas también;
   - **móvil (< 640 px):** se convierte en una agenda (lista por días de la semana actual).
7. **Nueva vista `TimelineView.jsx`:**
   - eje horizontal de días con ventana de 5 semanas y desplazamiento ‹ ›, "Hoy" como línea lima;
   - filas agrupadas por columna (Por hacer, En progreso…);
   - cada barra va de `created_at` (fecha) a `due_date`. Si `created_at > due_date`, la barra es de un solo día;
   - las tareas **sin fecha** van en un bloque "Sin fecha (N)" con un enlace para ponérsela;
   - clic en una barra → `TaskModal`;
   - **móvil:** el eje hace scroll horizontal con el nombre de la tarea fijo a la izquierda (`sticky left-0`).
8. **`src/lib/dates.js` (nuevo, funciones puras):** `startOfWeek` (lunes), `addDays`, `isSameDay`, `eachDayOfInterval`, `monthGrid(year, month)` (6×7 días) y `toISODate`. Se prueban con un script de Node antes de usarlas.
9. **`TaskModal`:** prop nueva `defaultDueDate = ''`, el mismo patrón que `defaultTitle` (`TaskModal.jsx:15,41`).

### Archivos

`src/pages/ProjectsPage.jsx`, `src/pages/TasksPage.jsx`, `src/components/tasks/*`, `src/components/gestion/*`, `src/lib/dates.js` (nuevo), `src/components/tasks/CalendarView.jsx` (nuevo), `src/components/tasks/TimelineView.jsx` (nuevo).

### Verificación

- Script de Node para `dates.js`:
  - meses que empiezan en domingo (el día 1 cae en la última columna);
  - febrero bisiesto;
  - cambio de hora de octubre: sumar días a medianoche no se puede saltar un día.
- Arnés con tareas fechadas:
  - el calendario coloca cada tarea en su día;
  - arrastrarla cambia `due_date` en el falso Supabase;
  - el clic en un día abre el modal con la fecha puesta;
  - el timeline dibuja las barras con la longitud correcta y "Sin fecha" cuenta bien.
- `?vista=calendario` sobrevive a recargar.
- Teclado: Tab llega a días y tareas, y Enter abre.
- 360 px sin scroll horizontal de página (el del timeline va dentro de su contenedor).
- `grep -rn "violet-\|purple-" src/components/tasks src/components/gestion src/pages/TasksPage.jsx src/pages/ProjectsPage.jsx` debe dar 0.

### Antipatrones

- No cambiar `TasksContext` ni `tasksApi`. Las vistas nuevas solo **leen** `tasks` / `columns` y usan `editTask`.
- No inventar una fecha de inicio en la BD. El timeline usa `created_at`, y así se explica en la propia vista ("desde que se creó").

---

## Fase 3: Notas y Biblioteca

### Qué se hace

- **Notas:**
  - `DashboardPage`: panel lateral con buscador `card`, grupos por fecha con la etiqueta en `ink-subtle`, y `EmptyState` sin orbes ni flotantes, con estadísticas planas y el botón lima;
  - `NoteCard`: activa con fondo `card` y barra lateral lima de 2 px;
  - `NoteEditor`: cabecera `canvas`, acciones como `Button ghost`, `SaveIndicator` ("Guardado" en lima suave) y avisos de recuperación;
  - `EditorToolbar`: botón activo `accent-soft` con texto lima;
  - `UndoDeleteToast`, `ShortcutsDialog` y `ConfirmDialog` con los tokens nuevos.
- **Biblioteca:**
  - `BibliotecaPage` con `PageHeader`, carpetas en árbol y tarjetas planas;
  - `DocumentGridCard` y `DocumentCard`;
  - el chrome de `DocumentEditor` y `DocumentToolbar`, sin tocar la **hoja blanca** del documento, que sigue simulando papel;
  - `DocumentViewModal` y los modales de importar.

### Archivos

`src/pages/DashboardPage.jsx`, `src/components/notes/*`, `src/components/editor/*`, `src/components/ui/{ShortcutsDialog,ConfirmDialog,Toast,DatePicker,MultiSelect}.jsx`, `src/pages/BibliotecaPage.jsx`, `src/components/biblioteca/*`.

### Verificación

- Arnés de notas: grupos, crear con Alt+N, `[ ] `, copiar, PDF, deshacer borrado y recuperación de borrador. Repetir las comprobaciones del lote 1 (autoguardado) con el script `autosaver.test.mjs`.
- Biblioteca: capturas del editor, comprobando que la hoja sigue blanca y que la impresión no cambia.
- `grep violet|purple` en esos archivos debe dar 0.

---

## Fase 4: Acceso (login y registro) y administración

- **`LoginPage` y `RegisterPage`:** fondo `canvas`, tarjeta `card`, botón lima, logo nuevo y mensajes de error con `danger`. Se conservan `Helmet` y la lógica de auth intactos.
- **`AdminLayout`, `AdminDashboard`, `UsersPanel` y `ActivityLog`:** tokens, `PageHeader`, tablas con filas `card` y pills para los roles.
- **`index.html`:** revisar la vista previa social (og:image) por si muestra el violeta antiguo. Si es así, regenerarla queda como tarea aparte.

---

## Fase 5: Limpieza y verificación final

1. Renombrar `slate-` → `neutral-` en todo `src/` (sed mecánico) y **borrar** la redefinición de slate y la escala violeta del `@theme`.
2. Comprobaciones con grep, que deben dar **0** salvo excepciones justificadas por escrito:
   - `violet-|purple-|indigo-|fuchsia-`;
   - `bg-gradient-to|from-violet|blur-3xl`;
   - `shadow-violet|shadow-purple`;
   - `#7c3aed|#8b5cf6|#6366f1` (este último es el color por defecto de proyecto y columna: pasa a un color de la nueva paleta en el código, **sin migrar los datos guardados**).
3. Script de contraste final y capturas de todas las pantallas a 360, 768 y 1280 px.
4. Repetir las pruebas clave de los lotes 1 a 4: autoguardado, borrado con deshacer, teclado en las tarjetas, Calendario, Timeline e impresión.
5. Revisión independiente con un agente de revisión de código, buscando regresiones de accesibilidad y responsive.

---

## Anexo A: Inventario de colores (20/10/2026)

Totales en `src/`:

| Clase | Usos |
|---|---|
| `violet-` | 433 |
| `purple-` | 61 |
| `slate-` | 455 |
| `bg-gradient-to` | 48 (+140 paradas `from/via/to`) |
| `backdrop-blur` | 33 |
| `blur-3xl` (orbes) | 7 |
| `shadow-violet/purple` | 35 |

Archivos con más trabajo (suma de todas las clases anteriores):

| Archivo | Total | violet | slate | Fase |
|---|---|---|---|---|
| `pages/BibliotecaPage.jsx` | 128 | 4 | 46 | 3 |
| `biblioteca/DocumentToolbar.jsx` | 110 | 25 | 32 | 3 |
| `pages/admin/UsersPanel.jsx` | 104 | 29 | 33 | 4 |
| `pages/DashboardPage.jsx` | 104 | 28 | 15 | 3 |
| `layout/AppLayout.jsx` | 86 | 23 | 20 | 1 |
| `gestion/GestionPanel.jsx` | 78 | 21 | 17 | 2 |
| `gestion/PersonnelModal.jsx` | 76 | 21 | 21 | 2 |
| `gestion/GestionSettings.jsx` | 73 | 32 | 20 | 2 |
| `biblioteca/DocumentEditor.jsx` | 70 | 8 | 19 | 3 |
| `tasks/TaskModal.jsx` | 64 | 21 | 13 | 2 |
| `pages/RegisterPage.jsx` / `LoginPage.jsx` | 63 / 55 | 29 / 23 | 1 / 1 | 4 |
| `pages/TasksPage.jsx` | 53 | 10 | 14 | 2 |
| `tasks/KanbanColumn.jsx` | 51 | 14 | 3 | 2 |

Patrones repetidos que se sustituyen por primitivas:

- **Botón primario con degradado** `bg-gradient-to-r from-violet-600 to-purple-600`: 18 veces en 12 archivos → `<Button variant="primary">`.
- **Logo con degradado** `from-violet-500 to-purple-600`: 14 veces → componente `Logo`, en lima.
- **`focus:ring-violet-500/50`**: 43 veces en 13 archivos → token `ring-accent/50`.
- **Input estándar** (`w-full bg-white/5 border border-white/10 … focus:ring-violet-500/50`): 8 veces en PersonnelModal y UsersPanel → clase compartida `field` (o componente `Input`).
- **Carcasa de modal** `bg-slate-900 border border-white/10 rounded-2xl`: 10 archivos → `bg-card border-line`.
- **Cabecera** `bg-black/20 backdrop-blur-sm border-b border-white/10`: 4 archivos → `PageHeader`.
- **Spinner** `w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin`: 5 veces → `Spinner`.

Colores escritos a mano que deben pasar a la nueva paleta:

| Dónde | Qué es |
|---|---|
| `lib/projectsApi.js:4-6` | columnas por defecto |
| `pages/TasksPage.jsx:32,65,95` | color por defecto `#6366f1` |
| `tasks/ProjectModal.jsx:4-11` | paleta de proyecto |
| `tasks/KanbanColumn.jsx:9` | colores de columna |
| `tasks/ProjectsSidebarSection.jsx:68` | color por defecto |
| `tasks/TaskCard.jsx:6-9` | `PRIORITY_CONFIG` con "glow" |
| `gestion/GestionSettings.jsx:6-16` | paleta de estados |
| `pages/BibliotecaPage.jsx:20-22` | colores de carpeta |
| `biblioteca/DocumentEditor.jsx:398,579` | `bg-[#111827]` en modo foco |

Se cambian solo los **valores por defecto para lo nuevo**. Los colores ya guardados en la base de datos se respetan, porque son elección del usuario.

Otros datos:

- **Gestión** (`GestionPanel` y familia) es un módulo de **personal y candidatos** (tabla `personnel`), no de tareas. En la Fase 2 se redibuja con las mismas primitivas, pero no participa en Calendario ni Timeline.
- **Admin:** el contenedor exterior es claro (`bg-slate-100`, `AdminLayout.jsx:23`), y cada página pinta encima su fondo oscuro. En la Fase 4 se unifica en `canvas`.
- **Estilos globales que hay que actualizar en la Fase 1** (`index.css`):
  - `::selection` violeta (líneas 45-48);
  - el anillo de foco y `.stretched-link` en `#a78bfa` (159-181);
  - el thumb del scrollbar en rgba slate (132-147);
  - `option{background:#0f172a}` (40-43).
- **Animaciones decorativas** que se eliminan en la fase de cada pantalla: `float`, `float-delay`, `float-slow` y `pulse-glow`. Se conservan `fadeIn`, `scaleIn`, `slideUp` y `urgent-blink`.
