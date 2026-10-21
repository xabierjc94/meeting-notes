"""
Migración mecánica de clases Tailwind al sistema de diseño (rediseño lima).

Uso:  python docs/plans/migrar-clases.py archivo1.jsx archivo2.jsx ...

Qué hace: sustituye clases del estilo antiguo (blanco translúcido, violeta,
degradados, blur) por los tokens nuevos (canvas, card, line, ink, accent…).
Es una tabla de equivalencias EXPLÍCITA: nada de adivinar. Lo que no está en
la tabla se queda igual y se revisa a mano (el script lo lista al final).

Regla especial: una línea con el botón degradado violeta (from-violet-600)
es un botón PRIMARIO → fondo lima y su texto pasa a `text-accent-ink`
(texto blanco sobre lima no se lee: contraste 1,3:1).
"""
import io
import re
import sys

# Orden importante: lo más específico primero
COMMON = [
    # degradados y efectos decorativos fuera
    (r'bg-gradient-to-(r|br|b|l|t|tr|bl|tl) ', ''),
    (r'hover:from-violet-\d+ hover:to-purple-\d+', 'hover:bg-accent-hover'),
    (r'from-violet-\d+(/\d+)? to-purple-\d+(/\d+)?', 'bg-accent'),
    (r'disabled:from-violet-\d+ disabled:to-purple-\d+', ''),
    (r' ?shadow-(md|lg|xl|sm|2xl) shadow-(violet|purple|indigo)-\d+/\d+', ''),
    (r' ?hover:shadow-(violet|purple)-\d+/\d+', ''),
    (r' ?shadow-(violet|purple|indigo)-\d+/\d+', ''),
    (r' ?backdrop-blur(-sm|-md|-lg|-xl)?', ''),
    (r' ?hover:scale-\[1\.02\]', ''),
    # foco
    (r'focus:ring-violet-\d+/\d+', 'focus:ring-accent/40'),
    (r'focus:border-violet-\d+/\d+', 'focus:border-accent'),
    (r'focus-within:ring-violet-\d+/\d+', 'focus-within:ring-accent/40'),
    (r'focus-within:border-violet-\d+/\d+', 'focus-within:border-accent'),
    (r'ring-violet-\d+(/\d+)?', 'ring-accent'),
    # violeta como acento
    (r'hover:bg-violet-\d+/\d+', 'hover:bg-accent-soft'),
    (r'bg-violet-\d+/\d+', 'bg-accent-soft'),
    (r'hover:text-violet-\d+', 'hover:text-accent'),
    (r'text-violet-\d+(/\d+)?', 'text-accent'),
    (r'hover:border-violet-\d+(/\d+)?', 'hover:border-accent'),
    (r'border-violet-\d+(/\d+)?', 'border-accent/50'),
    (r'hover:bg-violet-\d+', 'hover:bg-accent-hover'),
    (r'bg-violet-\d+', 'bg-accent'),
    (r'text-purple-\d+(/\d+)?', 'text-accent'),
    # superficies (blanco translúcido)
    (r'active:bg-white/(15|20)', 'active:bg-line'),
    (r'hover:bg-white/(8|10|15|20)', 'hover:bg-card-hover'),
    (r'hover:bg-white/5', 'hover:bg-card'),
    (r'bg-white/(15|20)', 'bg-line'),
    (r'bg-white/10', 'bg-card-hover'),
    (r'bg-white/(5|6|8)', 'bg-card'),
    (r'bg-black/(20|30|40)', 'bg-canvas'),
    (r'bg-slate-950', 'bg-canvas'),
    (r'bg-slate-900(/\d+)?', 'bg-card'),
    (r'hover:border-white/(20|30|40)', 'hover:border-line-strong'),
    (r'border-white/(15|20|30|40)', 'border-line-strong'),
    (r'border-white/(5|10)', 'border-line'),
    # texto
    (r'placeholder-white/\d+', 'placeholder:text-ink-subtle'),
    (r'placeholder-slate-\d+', 'placeholder:text-ink-subtle'),
    (r'hover:text-white(/\d+)?', 'hover:text-ink'),
    (r'text-white/(60|70|80)', 'text-ink-muted'),
    (r'text-white/(40|50)', 'text-ink-subtle'),
    (r'text-slate-(200|300)', 'text-ink'),
    (r'hover:text-slate-\d+', 'hover:text-ink'),
    (r'text-slate-400', 'text-ink-muted'),
    (r'text-slate-500', 'text-ink-subtle'),
    (r'(?<![-:/\w])text-white(?![/\w-])', 'text-ink'),
]


def migrate_line(line):
    primary = 'from-violet-600' in line or 'from-violet-500 to-purple' in line
    for pat, rep in COMMON:
        line = re.sub(pat, rep, line)
    # Un campo de formulario (lleva el anillo de foco) necesita un borde
    # visible ≥ 3:1 (WCAG 1.4.11): border-line es solo decorativo
    if 'focus:ring-accent/40' in line:
        line = re.sub(r'\bborder-line\b(?!-)', 'border-line-strong', line)
    if primary:
        line = line.replace('text-ink ', 'text-accent-ink ').replace('text-ink"', 'text-accent-ink"').replace('text-ink`', 'text-accent-ink`')
    return re.sub(r'  +(?=\S)', lambda m: m.group(0) if m.start() == 0 else ' ', line)


def main(paths):
    leftovers = re.compile(r'(violet|purple|indigo|fuchsia)-\d|bg-gradient|from-|blur-3xl|slate-\d|white/\d')
    for p in paths:
        src = io.open(p, encoding='utf-8').read()
        out = []
        for raw in src.split('\n'):
            # solo tocamos líneas con clases (className, cadenas de clases o mapas de estilo)
            if re.search(r'className|class=|[\'"`][^\'"`]*\b(bg|text|border|ring|shadow|from|to|hover|focus)-', raw) and not raw.lstrip().startswith('//'):
                out.append(migrate_line(raw))
            else:
                out.append(raw)
        new = '\n'.join(out)
        io.open(p, 'w', encoding='utf-8', newline='').write(new)
        rest = [f'  {i + 1}: {l.strip()[:110]}' for i, l in enumerate(new.split('\n')) if leftovers.search(l) and not l.lstrip().startswith('//')]
        print(f'{p}: {len(rest)} líneas para revisar a mano')
        for r in rest[:25]:
            print(r)


if __name__ == '__main__':
    main(sys.argv[1:])
