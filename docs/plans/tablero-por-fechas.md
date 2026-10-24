# Plan: tablero de tareas por fechas

Especificación acordada con Javi el 24/10/2026. Sustituye las columnas de estado
(Por hacer, Empezado, En progreso, Completado) por columnas **calculadas a partir
de la fecha límite**: Hoy, Mañana, Esta semana y Próximamente. Las completadas
pasan a una sección plegable al pie de la página.

Cada fase se puede ejecutar leyendo solo esa fase, la Fase 0 y las Reglas.

---

## Especificación (lo que ve Javi)

| Columna | Qué tareas muestra | Fecha que recibe una tarea al soltarla ahí |
|---|---|---|
| **Hoy** | vencen hoy + **atrasadas** (arriba, con "Atrasada · 20 oct" en rojo) | hoy |
| **Mañana** | vencen mañana | mañana |
| **Esta semana** | de pasado mañana al **domingo** (la semana empieza el lunes) | abre un calendario limitado a esos días |
| **Próximamente** | después de este domingo, o **sin fecha** | abre un calendario desde el lunes siguiente, con opción "Sin fecha" |

**Columnas:**
- Las tareas **se mueven solas** de columna al pasar los días. No se guarda en qué columna de fecha está una tarea: se calcula cada vez a partir de `due_date`.
- **Columnas de fecha vacías:** se ocultan.
- **Columnas extra propias** (p. ej. "Esperando respuesta"):
  - van detrás de las cuatro de fecha y **siempre se ven**, aunque estén vacías (si no, una recién creada desaparecería al momento);
  - sus tareas no se mueven por fecha;
  - se crean con el botón "Nueva columna", que se mantiene.

**Orden y arrastre:**
- **Orden dentro de cada columna:** por fecha límite (la más urgente arriba; las sin fecha al final). Con la misma fecha, de la más antigua a la más reciente (`created_at`).
- **No se reordena arrastrando dentro de una columna**, porque el orden sale de la fecha. Sí se arrastra **entre** columnas (cambia la fecha o la columna extra).

**Completar y "En curso":**
- **Completar:** un **círculo** en cada tarjeta. Al marcarlo, la tarea baja a Completadas; al desmarcarlo, vuelve a su columna.
- **"En curso":** una pastilla que se activa o quita (en la tarjeta y en la ventana de la tarea). La tarea sigue en su columna de fecha.

**Mover y crear tareas:**
- **Menú de columna** en la tarjeta (sin abrirla) y selector en la ventana de la tarea. Opciones: Hoy, Mañana, Esta semana…, Próximamente… y cada columna extra.
- **"Añadir tarea" en una columna:**
  - Hoy y Mañana rellenan la fecha;
  - Esta semana propone el domingo;
  - Próximamente la deja sin fecha;
  - en una columna extra, la tarea va a esa columna.
- **"Nueva tarea"** (cabecera) crea sin fecha, en Próximamente.

**Completadas:**
- Al pie de la página, **plegada** la primera vez ("Completadas · 3").
- **Recuerda** si la dejaste abierta (localStorage, en ese navegador).
- Ordenadas por **fecha de completado**, la más reciente arriba. Se muestran todas.

**Otras vistas:**
- **Móvil (< 768 px):** columnas **apiladas** una debajo de otra, con Completadas al final. Sin desplazamiento lateral.
- **Vista Lista:** los mismos grupos que el tablero, con Completadas plegada al final.
- **Calendario y Timeline:** sin cambios de diseño. Solo reconocen las completadas por el nuevo campo.
- **Gestión:** no se toca (no usa tareas).

**Conversión de proyectos existentes:**
- *Por hacer* → la columna "Pendientes" del sistema (sus tareas, a su columna de fecha).
- *Empezado* y *En progreso* → Pendientes + marca **En curso**.
- *Completado* (nombre con "complet", "done" o "hecho") → Pendientes + **completada** (fecha de completado = su `updated_at`).
- Cualquier otra columna → **columna extra**, con sus tareas.

---

## Fase 0: Descubrimiento (hecho)

Informe completo del agente de descubrimiento, 24/10/2026. Hechos clave:

### Esquema real (archivos SQL del repo)
| Tabla | Campos relevantes | Dónde |
|---|---|---|
| `tasks` | `id, user_id, column_id (not null, on delete cascade), title, description, priority (check low/medium/high/urgent), due_date date, tags text[], position int, created_at, updated_at (trigger)` | `tasks-migration.sql:21-44` |
| `tasks` | `recurrence, recurrence_next date, recurrence_parent` | `recurring-tasks-migration.sql:17-21` |
| `tasks` | `notes`: la usan la app y el generador, pero **ningún SQL del repo la crea** (existe en producción) | — |
| `task_columns` | `id, user_id, name, color, position, created_at, project_id` | `tasks-migration.sql:6-19`, `projects-migration.sql:23-26` |
| — | **No existen** `completed_at`, `in_progress` ni `kind` | grep sin resultados |

- RLS: `auth.uid() = user_id` en las tres tablas.
- Trigger `tasks_recurrence_trigger`: recalcula `recurrence_next` si cambian `recurrence` o `due_date`. **Mover o completar no le afecta.**
- `generate_recurring_tasks`: pone la copia en la **primera columna por `position`** del proyecto (`recurring-tasks-migration.sql:140-145`).
- Cron diario a las 04:05 UTC.

### Código actual
- **`src/context/TasksContext.jsx`** expone:
  - estado y datos: `columns, tasks, tasksByColumn, loading, fetchData`;
  - columnas: `addColumn, editColumn, removeColumn, reorderColumns`;
  - tareas: `addTask, editTask, removeTask, reorderTasks, moveTaskToColumn`.
  - `editTask` no es optimista: espera al servidor y propaga el error.
- **"Hecho" se deduce del nombre de la columna**, con tres heurísticas distintas:
  - `isDoneColumn` en `src/lib/taskStyles.js:29-32` ('complet', 'done', 'hecho');
  - `ListView.jsx:102-105` ('complet', 'done');
  - `KanbanColumn.jsx:54` ('completado').
- **Componentes:**
  - `KanbanBoard.jsx` (dnd-kit: Pointer distancia 8, Touch con retardo 200, Keyboard);
  - `KanbanColumn.jsx` (407 líneas: alta rápida, modo expandido, paginación de Completado);
  - `TaskCard.jsx` (`dueInfo`, variantes compact y done, `stretched-link`, `DeleteControl`);
  - `TaskModal.jsx` (`select#task-column`, `DatePicker`, `ConfirmDialog`);
  - `ListView.jsx`, `CalendarView.jsx` (`useDraggable`/`useDroppable` con id `YYYY-MM-DD`, `editTask({due_date})`) y `TimelineView.jsx`.
- **`src/pages/TasksPage.jsx`:**
  - vistas `?vista=`;
  - "Nueva columna" con un `Modal` y `addColumn({name, color:'#a3a3a3'})`;
  - "Nueva tarea" con `TaskModal defaultColumnId={columns[0]?.id}`.
- **`src/lib/projectsApi.js`:** `DEFAULT_COLUMNS` = Por hacer / En progreso / Completado; `createProject` inserta las columnas.

### APIs permitidas (verificadas)
- **Fechas** (`src/lib/dates.js`):
  - `today()` (mediodía local), `toISODate(date)`, `parseISODate(str)`;
  - `addDays`, `startOfWeek` (lunes), `diffDays`, `isSameDay`;
  - `formatShort`, `formatLongDay`.
  - **No hay `endOfWeek` ni `todayISO`:** se crean en esta tarea.
- **UI** (`src/components/ui/`):
  - `Modal({title,onClose,children,footer,size,initialFocusRef,closeOnBackdrop})`;
  - `Button({variant,size,icon})`, `IconButton({label,icon,active})`, `Pill({tone})`;
  - `ConfirmDialog`, `DatePicker({value,onChange,placeholder,className})`;
  - `Toast` + `useToast()`, `Icon({d})` + `ICONS`, `Spinner({label:null})`.
- **Pila de ventanas:** `useModalLayer(onClose,{initialFocusRef})` y `hasOpenModal()` (`src/hooks/useModalLayer.js`).
- **Patrón de menú desplegable con Esc y foco:** `src/components/biblioteca/DocumentGridCard.jsx:24-35, 85-129`:
  - `mousedown` fuera;
  - `keydown` en captura con `stopPropagation`;
  - devuelve el foco al disparador;
  - la tarjeta pasa a `z-20` mientras está abierto.
- **localStorage:** siempre dentro de try/catch, como en `AppLayout.jsx:46` y `:287`.
- **dnd-kit 6.3 / sortable 10:** `DndContext`, `useDraggable`, `useDroppable`, `DragOverlay`, `PointerSensor`, `TouchSensor`, `KeyboardSensor`. Copiar la configuración de sensores de `KanbanBoard.jsx:26-30`.

### Antipatrones prohibidos
- No instalar librerías de fechas, calendario ni UI (date-fns, dayjs, headlessui…).
- No deducir "completada" por el nombre de la columna (queda prohibido `isDoneColumn` y sus copias).
- No guardar en la base de datos la columna de fecha (Hoy/Mañana…): siempre se **calcula**.
- No usar `toISOString()` para "hoy" (da la fecha UTC; a las 00:30 en España saldría ayer). Usar `toISODate(today())`.
- No mezclar `SortableContext` para tareas dentro de una columna: el orden es por fecha.

---

## Reglas para todas las fases

1. **Antes de empezar:** explicar a Javi en español qué se va a hacer y por qué. Al terminar, resumen didáctico (CLAUDE.md).
2. **Diseño:**
   - tokens del rediseño (`canvas`, `surface`, `card`, `line`, `ink*`, `accent`, `pill-*`, `danger`);
   - sobre `bg-accent`, siempre `text-accent-ink`;
   - campos con `.field`;
   - solo clases de Tailwind literales.
3. **Accesibilidad:**
   - no quitar `.stretched-link`, `:focus-visible` ni los `aria-*`;
   - botones de 40 px en móvil;
   - todo lo que se hace arrastrando se puede hacer también **sin arrastrar** (menú de columna).
4. **Verificación de cada fase:**
   - `npm run build` sin errores;
   - lint comparado con HEAD sin errores nuevos;
   - prueba en el arnés (`docs/plans/arnes-supabase-falso.js`, puerto 5174).
5. **Commits y SQL:**
   - commit y push solo cuando Javi lo pida;
   - el SQL lo ejecuta **Javi** en el SQL Editor de Supabase (el conector de la sesión no ve el proyecto de MeetingNotes).

---

## Modelo de datos

```
tasks.completed_at   timestamptz null      -- null = pendiente; fecha = completada y cuándo
tasks.in_progress    boolean not null default false   -- marca "En curso"
task_columns.kind    text not null default 'custom' check (kind in ('pending','custom'))
```

- **Columna `pending` ("Pendientes"):** cada proyecto tiene exactamente una, que **no se dibuja**. Sus tareas se reparten en Hoy, Mañana, Esta semana y Próximamente según `due_date`.
- **Columnas `custom`:** son las columnas extra de Javi.
- **Completadas:** una completada **conserva su `column_id`**. Al desmarcarla vuelve sola a su sitio: si estaba en Pendientes, a su columna de fecha; si estaba en una extra, a esa columna. Por eso no hace falta una columna "Completado".
- **`tasks.position`:** deja de usarse para ordenar (se conserva en la tabla, sin borrar).

---

## Fase 1: Base de datos, parte A (aditiva, segura)

### Qué se hace
Archivo `docs/sql/2026-10-24-tablero-por-fechas-A.sql`, que Javi ejecuta **antes** de publicar el código nuevo. Solo **añade** cosas y la app actual sigue funcionando igual:
1. **Copia de seguridad** en un esquema propio `backup` (`backup.tasks_20261024` y `backup.task_columns_20261024`), **no en `public`**: Supabase publica `public` por su API y una tabla sin RLS dejaría leer las tareas de todos con la clave pública.
2. **Columnas nuevas**, con `alter table … add column if not exists` y los valores por defecto de arriba.
3. **Índice parcial:** `create index if not exists idx_tasks_pending on tasks(column_id) where completed_at is null;`.
4. **`generate_recurring_tasks`:**
   - la columna destino pasa a ser la columna `kind = 'pending'` del proyecto (si no existe, la primera por `position`, como ahora);
   - la copia se inserta con `completed_at = null` e `in_progress = false`.
   - Copiar la función entera de `docs/sql/2026-10-22-tareas-nuevas-abajo.sql:16-72` y cambiar **solo** la consulta de `target_col`.
5. **Consulta de comprobación:** que existan las columnas nuevas y la copia de seguridad.

### Verificación
- La consulta final devuelve las 3 columnas nuevas.
- `select prosrc like '%kind = ''pending''%' from pg_proc where proname = 'generate_recurring_tasks'` devuelve `true`.
- La app en producción sigue funcionando sin cambios.

### Antipatrones
- Nada destructivo en esta parte: ni `delete`, ni `drop`, ni mover tareas.

---

## Fase 2: Lógica (sin cambios visibles)

### Qué se hace
1. **`src/lib/dates.js`:** añadir `endOfWeek(date)` (domingo, sobre `startOfWeek`) y `todayISO()` (= `toISODate(today())`).
2. **Nuevo `src/lib/taskBuckets.js`** (funciones puras, sin React):
   - `BUCKETS = [{ id: 'hoy', label: 'Hoy' }, { id: 'manana', … }, { id: 'semana', label: 'Esta semana' }, { id: 'proximamente', label: 'Próximamente' }]`.
   - `bucketOf(dueDate, todayDate)`: devuelve `'hoy'` (≤ hoy, incluye atrasadas), `'manana'`, `'semana'` (≤ domingo) o `'proximamente'` (más tarde, o null). **→ Esta función la escribe Javi (Learn by Doing).**
   - `bucketDateRange(bucketId, todayDate)`: `{ min, max, allowEmpty }` para el calendario. Esta semana va de pasado mañana al domingo; Próximamente, del lunes siguiente sin máximo, con `allowEmpty`. En sábado y domingo el rango de Esta semana sale vacío y la opción se desactiva.
   - `defaultDateFor(bucketId, todayDate)`: Hoy → hoy, Mañana → mañana, Esta semana → domingo, Próximamente → `null`.
   - `compareTasks(a, b)`: por `due_date` ascendente (null al final), luego `created_at`.
   - `isDone(task) = task.completed_at != null`.
3. **Nuevo `src/hooks/useToday.js`:** devuelve `todayISO()` y se actualiza a medianoche (un `setTimeout` hasta las 00:00:01 locales, que se rearma). Si dejas la app abierta, las tareas cambian de columna al cambiar el día.
4. **`src/context/TasksContext.jsx`:**
   - Derivados:
     - `pendingColumn`: la de `kind === 'pending'`; si no existe, se crea al cargar con `createColumn(..., { name: 'Pendientes', kind: 'pending', position: -1 })`;
     - `customColumns`: las `kind !== 'pending'`, por `position`;
     - `board`: `useMemo` con `{ buckets: {hoy:[], …}, custom: {colId:[]}, completed: [] }`, ya ordenado (completadas por `completed_at` descendente).
   - Funciones nuevas:
     - `completeTask(id, done)` → `{ completed_at: done ? new Date().toISOString() : null }`;
     - `setInProgress(id, value)`;
     - `moveToBucket(id, bucketId, date)` → `{ column_id: pendingColumn.id, due_date: date }`;
     - `moveToColumn(id, columnId)` → `{ column_id }`.
   - Las cuatro son **optimistas**: se actualiza el estado antes de esperar al servidor y, si este falla, se deshace y se relanza el error. Copiar el patrón de `CalendarView.jsx:124-139` (mapa `moves` + revertir).
   - `addTask(data)`: si no trae `column_id`, va a `pendingColumn`.
   - Se quitan `reorderTasks`, `moveTaskToColumn` y `tasksByColumn` cuando ningún componente los use (al final de la Fase 4).
5. **`src/lib/projectsApi.js`:**
   - `DEFAULT_COLUMNS = [{ name: 'Pendientes', kind: 'pending', color: paletteColor('Gris'), position: 0 }]`;
   - comprobar el `error` del insert de columnas en `createProject`.
6. **`src/components/ui/DatePicker.jsx`:**
   - nuevas props `min` y `max` ('YYYY-MM-DD'): los días fuera del rango se ven desactivados y no se pueden elegir;
   - nueva prop `clearLabel` (p. ej. "Sin fecha");
   - **reutilizar** `parseISODate` y `toISODate` de `dates.js` en lugar de sus copias locales.
7. **`src/lib/taskStyles.js`:** borrar `isDoneColumn`.
8. **Arnés** (`docs/plans/arnes-supabase-falso.js`):
   - columnas con `kind` (c1 'pending' y una extra c4 'Esperando respuesta');
   - tareas con `completed_at` e `in_progress`;
   - fechas de semilla con fecha **local**, no `toISOString`.

### Verificación
- Script de Node `docs/plans/probar-buckets.mjs`: para cada día de la semana (lunes a domingo) comprueba `bucketOf` con ayer, hoy, mañana, pasado mañana, el domingo, el lunes siguiente y null. También comprueba `bucketDateRange` en sábado y domingo (Esta semana vacía).
- `npm run build`.

### Antipatrones
- `bucketOf` no puede depender de la hora: comparar textos 'YYYY-MM-DD' o fechas a mediodía.
- No guardar el bucket en la base de datos.

---

## Fase 3: Tablero

### Qué se hace
1. **`KanbanBoard.jsx`** (reescritura):
   - **Escritorio (md+):** fila con las columnas de fecha **no vacías** + las extra **siempre**, cada una `flex-1 min-w-64` con desplazamiento horizontal si no caben.
   - **Móvil:** secciones apiladas (`flex-col`).
   - **Debajo, `CompletedSection`:**
     - botón disclosure `aria-expanded`/`aria-controls` con el texto "Completadas · N";
     - estado en localStorage `tasks-completadas-abierta`, dentro de try/catch;
     - plegada por defecto;
     - lista compacta ordenada por `completed_at` descendente.
   - **dnd:**
     - `DndContext` con los mismos sensores que ahora;
     - las tarjetas usan `useDraggable`; las columnas, `useDroppable` con id `bucket:hoy`… o `col:<id>`;
     - `onDragEnd`:
       - en Hoy o Mañana → `moveToBucket` con `defaultDateFor`;
       - en Esta semana o Próximamente → abre `DateChoiceDialog` (punto 4) y solo mueve al confirmar; si se cancela, la tarea se queda donde estaba;
       - en una columna extra → `moveToColumn`;
     - `DragOverlay` con `TaskCard overlay`.
   - **Reordenar columnas extra** entre sí: se mantiene (`useSortable` en la cabecera, `reorderColumns`), solo entre extras. Las de fecha son fijas.
2. **`KanbanColumn.jsx`** (simplificar):
   - props `{ id, title, tasks, kind: 'bucket'|'custom', column?, onAdd, onOpenTask }`;
   - cabecera con nombre y contador;
   - las de fecha no se pueden editar ni borrar; las extra conservan editar, color y borrar;
   - "Añadir tarea" abre `TaskModal` con la fecha o columna por defecto;
   - **se eliminan** la paginación de Completado, el modo expandido y el `isCompleted`.
3. **`TaskCard.jsx`:**
   - **Círculo de completar** a la izquierda del título:
     - `button` con `aria-pressed` y `aria-label` "Marcar como completada: X" / "Marcar como pendiente: X";
     - 40 px de área táctil en móvil;
     - estilo `border-line-strong`, y completada `bg-accent text-accent-ink`.
   - **Pastilla "En curso"** (`Pill tone="sky"`) cuando `in_progress`.
   - **Fecha:**
     - si está atrasada, `text-danger` con "Atrasada · 20 oct";
     - las completadas van tachadas, sin aviso de atrasada.
   - **Botón de menú** (⋯, `IconButton label="Mover X"`) que abre `TaskMoveMenu`.
   - Se mantienen `stretched-link`, `DeleteControl`, prioridad, etiquetas e icono de recurrencia.
4. **Nuevos componentes en `src/components/tasks/`:**
   - **`TaskMoveMenu.jsx`:**
     - menú desplegable copiando el patrón de `DocumentGridCard.jsx:24-35, 85-129`, más `role="menu"` y `role="menuitem"` y flechas arriba/abajo;
     - opciones: Hoy · Mañana · Esta semana… · Próximamente… · (separador) columnas extra · (separador) "En curso" activado o desactivado;
     - marca la ubicación actual con `aria-current`;
     - "Esta semana…" queda desactivada en sábado y domingo (rango vacío).
   - **`DateChoiceDialog.jsx`:**
     - `Modal size="sm"` con `DatePicker min/max/clearLabel` según `bucketDateRange`;
     - botones Mover y Cancelar.
5. **`src/pages/TasksPage.jsx`:**
   - "Nueva tarea" sin `defaultColumnId` (va a Pendientes, sin fecha);
   - "Nueva columna" crea `kind: 'custom'`;
   - la pastilla "N tareas" cuenta solo las pendientes.

### Verificación (arnés)
- Las tareas semilla caen en la columna correcta según el día de hoy.
- La atrasada sale en Hoy, arriba y en rojo.
- Arrastrar a Mañana cambia `due_date`. Arrastrar a Esta semana abre el calendario limitado; si se cancela, no cambia nada.
- El círculo manda la tarea a Completadas y desmarcarlo la devuelve. Completadas recuerda el estado plegado o abierto al volver a montar.
- El menú ⋯ funciona solo con teclado: Tab, Enter, flechas, Esc (devuelve el foco).
- Una columna extra vacía se ve; las de fecha vacías no.
- A 360 px, secciones apiladas sin desplazamiento horizontal. Capturas a 360, 768 y 1280.
- Contraste: círculo, pastilla En curso y fecha atrasada ≥ 4,5:1 (texto) y ≥ 3:1 (borde del círculo).

### Cambios respecto a lo previsto (descubiertos al probar)
- **Las columnas de fecha vacías no aparecen en la fila al arrastrar**, sino en una barra flotante (`HiddenBucketBar`). Si se metían en la fila, las demás columnas se desplazaban bajo el puntero y la tarea caía en otra.
- **El arrastre con teclado necesita su propio `coordinateGetter`** (`keyboardCoordinates`): `sortableKeyboardCoordinates` no sirve para tareas `useDraggable`.
- **Anuncios del lector de pantalla en español** (prop `accessibility` de `DndContext`). Por defecto salen en inglés y con ids internos.
- **En móvil no hay asa de arrastre**: con las columnas apiladas se mueve con el menú ⋯.
- **`patchTask` numera las peticiones por tarea** y, si falla, deshace solo los campos que cambió.

### Antipatrones
- Sin `SortableContext` de tareas.
- Sin lógica de fechas en los componentes: todo sale de `taskBuckets.js`.
- Ningún texto claro sobre lima.

---

## Fase 4: Ventana de tarea, Lista, Calendario y Timeline

### Qué se hace
1. **`TaskModal.jsx`:**
   - **Selector "Cuándo / columna"** (`select.field`) en lugar de `select#task-column`:
     - opciones Hoy, Mañana, Esta semana, Próximamente y las columnas extra;
     - es **derivado**: si cambias la fecha, cambia el selector solo (`bucketOf`);
     - elegir Hoy o Mañana pone la fecha;
     - elegir Esta semana o Próximamente aplica `min/max` al `DatePicker` y abre el calendario si la fecha actual no encaja;
     - elegir una columna extra conserva la fecha.
   - **Interruptor "En curso"**: `button role="switch" aria-checked`.
   - El texto de ayuda de "Repetir" dice "La copia aparecerá en su columna de fecha".
   - **Cambio respecto a lo previsto (al implementarlo):** el `DatePicker` de la ventana **no** se limita con `min`/`max`. Como el selector se calcula a partir de la fecha, cualquier día que elijas es válido: el selector lo sigue solo. Limitarlo solo haría la ventana más incómoda. Al elegir Próximamente, una tarea que ya tenía fecha recibe el lunes siguiente; una tarea sin fecha sigue sin ella.
2. **`ListView.jsx`:**
   - mismos grupos que el tablero, con `board` del contexto;
   - el checkbox llama a `completeTask`;
   - Completadas va plegada al final, con la misma clave de localStorage;
   - la barra de progreso usa `isDone`;
   - el checkbox pierde el `emerald-500` y usa tokens.
3. **`CalendarView.jsx` y `TimelineView.jsx`:**
   - `doneIds` e `isDoneColumn` → `isDone(task)`;
   - el "+" del calendario crea la tarea en Pendientes con su fecha.
4. **`ProjectsContext` / `getProjectTaskCounts`:** contar solo las pendientes (`completed_at is null`).
5. **Limpieza:** borrar `reorderTasks`, `moveTaskToColumn` y `tasksByColumn` del contexto, `batchUpdateTaskPositions` si queda sin uso, y el modo expandido sobrante.

### Verificación
- Editar la fecha en la ventana cambia el selector, y al revés.
- En Lista, completar y descompletar funciona, y los grupos coinciden con el tablero.
- En el Calendario, las completadas salen tachadas.
- `grep -rn "isDoneColumn\|includes('complet" src` → 0.

---

## Fase 5: Publicación y conversión (parte B del SQL)

### Qué se hace
1. Commit y push de las Fases 2-4 (cuando Javi lo pida). Verificar el despliegue en producción.
2. **Inmediatamente después**, Javi ejecuta `docs/sql/2026-10-24-tablero-por-fechas-B.sql`. Se puede repetir sin problema y lo hace todo en **una transacción** (`begin … commit`):
   1. por proyecto, la columna cuyo nombre empiece por "por hacer" (sin distinguir mayúsculas) pasa a `kind = 'pending'` y se renombra "Pendientes". Si no hay, se inserta una. **Ojo (descubierto en la Fase 2):** el código nuevo crea "Pendientes" al abrir un proyecto que no la tiene, así que al ejecutar la parte B puede que ya exista. En ese caso, las tareas de "Por hacer" se mueven a esa "Pendientes" y "Por hacer" se borra (no se puede convertir: el índice único solo admite una `pending` por proyecto);
   2. las tareas de columnas cuyo nombre contenga "empezado" o "progreso" → `column_id` = Pendientes, `in_progress = true`;
   3. las tareas de columnas con "complet", "done" o "hecho" → Pendientes, `completed_at = updated_at`;
   4. se borran las columnas ya vacías de los pasos 2 y 3. **Solo las vacías**: comprobar con `not exists`;
   5. el resto de columnas quedan `custom`;
   6. consulta de comprobación: cada proyecto tiene exactamente 1 columna `pending` y 0 tareas en columnas borradas.
3. **Por qué en este orden:**
   - si la conversión se ejecutara antes del código nuevo, la app antigua enseñaría las completadas como pendientes;
   - si el código nuevo va primero, crea "Pendientes" solo en los proyectos que no la tengan y funciona igualmente: las tareas siguen en sus columnas viejas, que se verían como extra hasta ejecutar la parte B.

### Verificación (en producción, con Javi)
- Sus proyectos muestran Hoy, Mañana… y las completadas al pie.
- Las que estaban en Empezado o En progreso llevan "En curso".
- Recuperación si algo sale mal: las tablas `backup.tasks_20261024` y `backup.task_columns_20261024` de la Fase 1.

---

## Fase 6: Verificación final

1. Revisión independiente con un agente de revisión de código: regresiones, accesibilidad, zona horaria, optimismo con reversión.
2. Repetir en el arnés todas las verificaciones de las Fases 3 y 4 a 360, 768 y 1280 px.
3. Comprobaciones con grep: `isDoneColumn` 0, `toISOString().slice(0, 10)` 0 en `src/` (salvo que esté justificado), `SortableContext` solo para columnas extra.
4. Al cabo de unos días, si todo va bien, Javi puede borrar las tablas de copia de seguridad (SQL aparte, solo cuando lo pida).
