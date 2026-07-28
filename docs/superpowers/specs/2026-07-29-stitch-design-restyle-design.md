# Rediseño visual basado en Stitch (proyecto "Meetingnotes")

## Contexto

El usuario tiene un proyecto en Google Stitch (`projects/8747487063695864807`, título "Meetingnotes")
con 7 pantallas. De ellas, 4 son rediseños genuinos generados por la IA con un lenguaje visual
consistente; las otras 3 ("Clean Task List View", "Modernized Kanban Board View", "Project
Management & Candidates View") resultaron ser capturas de la app actual, no rediseños nuevos.

La app ya usa Tailwind CSS v4 y gran parte del lenguaje visual violeta/púrpura de Stitch
(botones degradados `violet-600 → purple-600`, cards de cristal `bg-white/5` + `backdrop-blur`).
Este trabajo es un **reskin dirigido**, no una reescritura de componentes ni de lógica.

## Objetivo

Unificar visualmente toda la app bajo el lenguaje de los 4 rediseños de Stitch (Login, Dashboard,
Projects Explorer, Editor), extendiéndolo también a las páginas sin mockup propio (Tasks,
Register, Biblioteca, Admin) para consistencia.

## Fuera de alcance

- Cambios de lógica, estado, rutas o llamadas a Supabase.
- Nueva paleta de color: se reutiliza la ya existente (violet/purple) en vez de introducir tokens nuevos.
- Rediseño de componentes que Stitch no cubrió con mockup propio más allá de aplicar los mismos tokens visuales (fondo, cards, botones).

## Tokens visuales objetivo

- **Fondo base**: negro casi puro (`slate-950` / `#0a0a0f`) en vez de gradientes diagonales largos,
  con "orbes" de luz difuminados (`blur-3xl`, `bg-violet-600/20`, `bg-purple-600/15`) posicionados
  de forma asimétrica — patrón que la app ya usa en el sidebar del Dashboard, se generaliza al resto.
- **Acento**: degradado `violet-600 → purple-600` para CTAs primarios (ya existente, sin cambios).
- **Cards**: `bg-white/5` a `bg-white/10`, `border border-white/10`, `backdrop-blur-xl`, `rounded-2xl`/`rounded-3xl` (ya existente).
- **Texto secundario**: `violet-200/*` y `slate-400/500` (ya existente).

## Cambios por página (orden de implementación)

1. **Login** (`src/pages/LoginPage.jsx`)
   - Fondo: de gradiente lineal a negro sólido + orbes difuminados.
   - Añadir link "¿Olvidaste tu contraseña?" junto al campo de contraseña.
   - Mantener estructura, textos y lógica de auth intactos.

2. **Dashboard** (`src/pages/DashboardPage.jsx`)
   - Cambio principal: el área principal (`EmptyState` y contenedor `main`) pasa de tema claro
     (`bg-slate-50`, cards blancas) a tema oscuro consistente con el sidebar.
   - Adaptar stat cards y CTA a variantes oscuras (`bg-white/5`, `border-white/10`, iconos con halo de color sobre fondo oscuro).
   - `NoteEditor` se aborda en el paso 5 (Editor).

3. **Projects** (`src/pages/ProjectsPage.jsx`)
   - Sustituir el header actual (botón atrás + título) por una barra de navegación superior
     con logo + enlaces (Proyectos / Notas / Tareas / Biblioteca), coherente con la navegación
     real de la app (no hay "Calendario" en esta app, se omite frente al mockup).
   - Cards de proyecto: mover la franja de color de la parte superior al borde izquierdo.
   - Oscurecer fondo general al mismo negro base.

4. **Tasks** (`src/pages/TasksPage.jsx` y subcomponentes de Lista/Kanban/Gestión)
   - Unificar las 3 vistas (Lista, Tablero/Kanban, Gestión) al mismo tema oscuro — hoy Lista y
     Gestión son claras y Kanban es oscuro.
   - Mantener toda la funcionalidad (drag & drop, filtros, candidatos) sin cambios.

5. **Editor** (`src/components/editor/NoteEditor.jsx`, `EditorToolbar.jsx`)
   - Oscurecer el lienzo y la barra de herramientas al mismo negro base.
   - Simplificar visualmente la toolbar (agrupar iconos, reducir ruido) sin quitar funciones existentes.

6. **Register** (`src/pages/RegisterPage.jsx`)
   - Aplicar los mismos tokens que Login (mismo fondo, misma card, mismos inputs/botones).

7. **Biblioteca** (`src/pages/BibliotecaPage.jsx` y componentes relacionados)
   - Aplicar los tokens de fondo/cards/botones ya definidos, sin mockup propio.

8. **Admin** (`src/pages/admin/*.jsx`)
   - Igual que Biblioteca: aplicar tokens visuales existentes por consistencia.

## Verificación

Para cada página: levantar el dev server (Vite) en el navegador embebido, navegar a la ruta
correspondiente, comparar visualmente contra la captura de Stitch, revisar consola/errores,
y confirmar con el usuario antes de continuar con la siguiente página del orden anterior.

## Notas de implementación

- Todo el trabajo es CSS/JSX (clases Tailwind e inline styles puntuales para colores dinámicos
  de proyecto); no se tocan contextos, hooks de datos, ni el esquema de Supabase.
- Si alguna página tiene lógica condicional de tema claro/oscuro hoy (p.ej. `TasksPage`), se
  elimina esa rama en vez de mantenerla, ya que el objetivo es un tema oscuro único.
