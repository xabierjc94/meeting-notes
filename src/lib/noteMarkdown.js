// ─────────────────────────────────────────────────────────────
// CONCEPTO: Serializar (convertir una estructura en texto)
//
// TipTap guarda la nota como un árbol JSON:
//   { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [...] }] }
// Para copiarla a un correo, Slack o un .md la convertimos a Markdown
// recorriendo ese árbol: cada tipo de nodo sabe escribirse a sí mismo.
// Cubre los nodos del editor de notas (StarterKit + listas de tareas).
// ─────────────────────────────────────────────────────────────

function inline(nodes = []) {
  return nodes.map((n) => {
    if (n.type === 'hardBreak') return '  \n'
    if (n.type !== 'text') return ''
    let text = n.text ?? ''
    for (const mark of n.marks ?? []) {
      if (mark.type === 'code') text = `\`${text}\``
      else if (mark.type === 'bold') text = `**${text}**`
      else if (mark.type === 'italic') text = `*${text}*`
      else if (mark.type === 'strike') text = `~~${text}~~`
      else if (mark.type === 'link' && mark.attrs?.href) text = `[${text}](${mark.attrs.href})`
    }
    return text
  }).join('')
}

const indent = (text, pad) => text.split('\n').map((l) => (l ? pad + l : l)).join('\n')

function listItems(items = [], marker) {
  return items.map((item, i) => {
    const prefix = typeof marker === 'function' ? marker(item, i) : marker
    const [first, ...rest] = item.content ?? []
    const head = first ? block(first).trim() : ''
    const tail = rest.map((n) => indent(block(n), '  ')).join('\n')
    return `${prefix}${head}${tail ? `\n${tail}` : ''}`
  }).join('\n')
}

function block(node) {
  switch (node.type) {
    case 'paragraph': return inline(node.content)
    case 'heading': return `${'#'.repeat(node.attrs?.level ?? 1)} ${inline(node.content)}`
    case 'bulletList': return listItems(node.content, '- ')
    case 'orderedList': {
      const start = node.attrs?.start ?? 1
      return listItems(node.content, (_, i) => `${start + i}. `)
    }
    case 'taskList': return listItems(node.content, (item) => `- [${item.attrs?.checked ? 'x' : ' '}] `)
    case 'blockquote': return (node.content ?? []).map(block).join('\n\n').split('\n').map((l) => `> ${l}`).join('\n')
    case 'codeBlock': return `\`\`\`${node.attrs?.language ?? ''}\n${(node.content ?? []).map((n) => n.text ?? '').join('')}\n\`\`\``
    case 'horizontalRule': return '---'
    default: return (node.content ?? []).map(block).join('\n\n')
  }
}

function formatDate(date) {
  if (!date) return null
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function noteToMarkdown({ title, meetingDate, content }) {
  const parts = [`# ${title?.trim() || 'Sin título'}`]
  const date = formatDate(meetingDate)
  if (date) parts.push(`*Reunión del ${date}*`)
  const body = (content?.content ?? []).map(block).filter((b) => b.trim() !== '').join('\n\n')
  if (body) parts.push(body)
  return `${parts.join('\n\n')}\n`
}

export function noteToHtml({ title, meetingDate, bodyHtml }) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const date = formatDate(meetingDate)
  return `<h1>${esc(title?.trim() || 'Sin título')}</h1>${date ? `<p><em>Reunión del ${esc(date)}</em></p>` : ''}${bodyHtml}`
}
