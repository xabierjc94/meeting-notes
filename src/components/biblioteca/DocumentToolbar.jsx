import { useState, useRef, useEffect } from 'react'

const FONT_FAMILIES = [
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Palatino', value: '"Palatino Linotype", serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Impact', value: 'Impact, fantasy' },
  { label: 'Comic Sans', value: '"Comic Sans MS", cursive' },
]

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '32', '36', '48', '72']

const LINE_HEIGHTS = [
  { label: 'Simple (1.0)', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: 'Espacio y medio (1.5)', value: '1.5' },
  { label: 'Doble (2.0)', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: 'Triple (3.0)', value: '3' },
]

const TEXT_COLORS = [
  // Row 1: Negros / Grises
  '#000000', '#1a1a1a', '#404040', '#595959', '#737373', '#8c8c8c', '#a6a6a6', '#bfbfbf', '#d9d9d9', '#f2f2f2',
  // Row 2: Rojos / Naranjas / Amarillos
  '#7f0000', '#c00000', '#ff0000', '#ff4d00', '#ff9900', '#ffbf00', '#ffd966', '#fffe00', '#e6ff00', '#ccff00',
  // Row 3: Verdes
  '#004d00', '#00802b', '#00b050', '#00cc44', '#70ad47', '#92d050', '#b8f0a0', '#ccffcc', '#d9ead3', '#e6ffe6',
  // Row 4: Azules / Violetas
  '#003366', '#0070c0', '#2563eb', '#4472c4', '#00b0f0', '#00b0f0', '#7030a0', '#9966ff', '#cc66ff', '#f4ccff',
  // Row 5: Marrones / Pinks
  '#7f3300', '#c55a11', '#ed7d31', '#f4a261', '#e63946', '#c9184a', '#a8dadc', '#457b9d', '#1d3557', '#6c757d',
]

const HIGHLIGHT_COLORS = [
  '#FEF08A', // amarillo
  '#BBF7D0', // verde
  '#BAE6FD', // azul
  '#DDD6FE', // violeta
  '#FED7AA', // naranja
  '#FECACA', // rojo
  '#F0ABFC', // rosa
  '#E2E8F0', // gris
  '#FFF9C4', // amarillo pálido
  '#C8E6C9', // verde pálido
  '#B3E5FC', // azul pálido
  '#E1BEE7', // violeta pálido
]

const EMOJI_CATEGORIES = [
  {
    label: '😊 Emociones',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😙','😚','🙂','🤗','🤭','🥲','😭','😤','😠','🤔','🤫','🤐','😴','😷','🤒']
  },
  {
    label: '👋 Gestos',
    emojis: ['👍','👎','👋','🙏','💪','🤝','✌️','🤞','🤟','👏','🤦','🤷','👌','🤌','🫡','🫶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','⭐','🌟','✨','🎯']
  },
  {
    label: '🔥 Símbolos',
    emojis: ['🔥','⚡','💥','✅','❌','⚠️','❓','❗','💡','🎉','🎊','🏆','🥇','🎁','🔔','🔕','📢','📣','🔇','🚀','💻','📱','🖥️','⌨️','🖨️','🖱️','📷','🎥','📹','🎬']
  },
  {
    label: '📝 Trabajo',
    emojis: ['📌','📍','🔗','📎','🖊️','✏️','📝','📋','📄','📃','📜','📂','📁','🗂️','💼','📊','📈','📉','🗓️','📅','⏰','⏱️','🕐','🕑','🔍','🔎','💰','💵','💴','💶']
  },
  {
    label: '🌍 Naturaleza',
    emojis: ['🌍','🌎','🌏','🗺️','🌐','☀️','🌤️','⛅','🌥️','☁️','🌧️','⛈️','🌩️','🌨️','❄️','🌬️','💨','🌊','🌙','⭐','🌈','🌸','🌺','🌻','🌹','🍀','🌿','🍃','🌱','🌲']
  },
]

export default function DocumentToolbar({
  editor,
  onExportPdf, exporting,
  onExportWord, exportingWord,
  onOpenInWord, openingWord,
  onPrint,
  spellCheck, onToggleSpellCheck,
  focusMode, onToggleFocusMode,
}) {
  const [showFontFamily, setShowFontFamily] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showLineHeight, setShowLineHeight] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showImageUrl, setShowImageUrl] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [fontSizeInput, setFontSizeInput] = useState('12')
  const [textColorHex, setTextColorHex] = useState('')
  const [highlightHex, setHighlightHex] = useState('')
  const [emojiCategory, setEmojiCategory] = useState(0)
  const linkRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    if (editor) {
      const size = editor.getAttributes('textStyle').fontSize
      if (size) setFontSizeInput(parseInt(size))
    }
  }, [editor?.state])

  if (!editor) return null

  const closeAll = () => {
    setShowFontFamily(false)
    setShowFontSize(false)
    setShowLineHeight(false)
    setShowTextColor(false)
    setShowHighlight(false)
    setShowLinkInput(false)
    setShowEmoji(false)
    setShowImageUrl(false)
  }

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || 'Calibri, sans-serif'
  const currentFontLabel = FONT_FAMILIES.find(f => f.value === currentFontFamily)?.label || 'Calibri'

  const applyFontSize = (size) => {
    editor.chain().focus().setFontSize(`${size}pt`).run()
    setFontSizeInput(String(size))
    setShowFontSize(false)
  }

  const handleFontSizeInput = (e) => setFontSizeInput(e.target.value)

  const handleFontSizeBlur = () => {
    const n = parseInt(fontSizeInput)
    if (n > 0 && n <= 400) editor.chain().focus().setFontSize(`${n}pt`).run()
  }

  const changeFontSize = (delta) => {
    const current = parseInt(fontSizeInput) || 12
    const next = Math.max(6, Math.min(400, current + delta))
    editor.chain().focus().setFontSize(`${next}pt`).run()
    setFontSizeInput(String(next))
  }

  const setLink = () => {
    if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run()
    else editor.chain().focus().unsetLink().run()
    closeAll()
    setLinkUrl('')
  }

  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  const currentHeading = editor.isActive('heading', { level: 1 }) ? 'H1'
    : editor.isActive('heading', { level: 2 }) ? 'H2'
    : editor.isActive('heading', { level: 3 }) ? 'H3'
    : editor.isActive('heading', { level: 4 }) ? 'H4'
    : 'Normal'

  const insertEmoji = (emoji) => {
    editor.chain().focus().insertContent(emoji).run()
  }

  const applyCustomTextColor = (hex) => {
    const clean = hex.startsWith('#') ? hex : '#' + hex
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      editor.chain().focus().setColor(clean).run()
      setShowTextColor(false)
      setTextColorHex('')
    }
  }

  const applyCustomHighlight = (hex) => {
    const clean = hex.startsWith('#') ? hex : '#' + hex
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      editor.chain().focus().toggleHighlight({ color: clean }).run()
      setShowHighlight(false)
      setHighlightHex('')
    }
  }

  return (
    <div className="bg-[#f3f3f3] border-b border-gray-300 select-none" onClick={e => e.stopPropagation()}>

      {/* ── FILA 1: Fuente, tamaño, formato básico ── */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-200 flex-wrap">

        {/* Font Family */}
        <div className="relative">
          <button
            onMouseDown={e => { e.preventDefault(); closeAll(); setShowFontFamily(v => !v) }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-300 min-w-[100px] justify-between"
            style={{ fontFamily: currentFontFamily }}
          >
            <span className="truncate max-w-[80px]">{currentFontLabel}</span>
            <ChevronDown />
          </button>
          {showFontFamily && (
            <Dropdown onClose={() => setShowFontFamily(false)} className="w-52">
              {FONT_FAMILIES.map(f => (
                <button
                  key={f.value}
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setFontFamily(f.value).run(); setShowFontFamily(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 hover:text-blue-700 rounded ${currentFontFamily === f.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </Dropdown>
          )}
        </div>

        {/* Font Size con + / - */}
        <div className="relative flex items-center">
          <button
            onMouseDown={e => { e.preventDefault(); changeFontSize(-1) }}
            className="px-1 py-1 border border-r-0 border-gray-300 rounded-l bg-white hover:bg-gray-100 text-gray-600 text-xs font-bold leading-none"
            title="Reducir tamaño"
          >A<sub className="text-[7px]">−</sub></button>
          <input
            type="number"
            value={fontSizeInput}
            onChange={handleFontSizeInput}
            onBlur={handleFontSizeBlur}
            onKeyDown={e => { if (e.key === 'Enter') { handleFontSizeBlur(); editor.commands.focus() } }}
            className="w-10 text-center text-xs border-t border-b border-gray-300 py-1 bg-white text-gray-700 focus:outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onMouseDown={e => { e.preventDefault(); closeAll(); setShowFontSize(v => !v) }}
            className="px-1 py-1 border border-l-0 border-r-0 border-gray-300 bg-white hover:bg-gray-100"
          >
            <ChevronDown />
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); changeFontSize(1) }}
            className="px-1 py-1 border border-l-0 border-gray-300 rounded-r bg-white hover:bg-gray-100 text-gray-600 text-xs font-bold leading-none"
            title="Aumentar tamaño"
          >A<sup className="text-[7px]">+</sup></button>
          {showFontSize && (
            <Dropdown onClose={() => setShowFontSize(false)} className="w-16 max-h-48 overflow-y-auto" style={{ left: '100%', top: 0, marginLeft: 4 }}>
              {FONT_SIZES.map(s => (
                <button
                  key={s}
                  onMouseDown={e => { e.preventDefault(); applyFontSize(s) }}
                  className="w-full text-center px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-700 text-gray-700"
                >
                  {s}
                </button>
              ))}
            </Dropdown>
          )}
        </div>

        <Sep />

        {/* Negrita, Cursiva, Subrayado, Tachado, Sub, Sup */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita (Ctrl+B)"><b className="text-xs">N</b></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva (Ctrl+I)"><i className="text-xs not-italic font-serif font-bold">K</i></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado (Ctrl+U)">
          <span className="text-xs font-bold underline">S</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
          <span className="text-xs font-bold line-through">T</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subíndice">
          <span className="text-[10px] font-bold">X<sub>2</sub></span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superíndice">
          <span className="text-[10px] font-bold">X<sup>2</sup></span>
        </Btn>

        {/* Limpiar formato */}
        <Btn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Limpiar formato"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4l10.5-10.5a2 2 0 000-2.83l-1.17-1.17a2 2 0 00-2.83 0L4 16v4z"/>
            <line x1="16" y1="6" x2="20" y2="10"/>
            <line x1="2" y1="22" x2="8" y2="22"/>
          </svg>
        </Btn>

        <Sep />

        {/* Color de texto */}
        <div className="relative">
          <Btn onClick={() => { closeAll(); setShowTextColor(v => !v) }} active={showTextColor} title="Color de texto">
            <span className="flex flex-col items-center gap-0">
              <span className="text-xs font-bold leading-none">A</span>
              <span className="w-3.5 h-1 rounded-sm mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }} />
            </span>
          </Btn>
          {showTextColor && (
            <Dropdown onClose={() => setShowTextColor(false)} className="w-56 p-2">
              <div className="grid grid-cols-10 gap-0.5 mb-2">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowTextColor(false) }}
                    className="w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1 border-t border-gray-100 pt-2">
                <span className="text-[10px] text-gray-500">Hex:</span>
                <input
                  type="text"
                  value={textColorHex}
                  onChange={e => setTextColorHex(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyCustomTextColor(textColorHex) }}
                  placeholder="#000000"
                  maxLength={7}
                  className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 font-mono"
                />
                {textColorHex && (
                  <div className="w-5 h-5 rounded border border-gray-200 shrink-0"
                    style={{ backgroundColor: (textColorHex.startsWith('#') ? textColorHex : '#' + textColorHex) }} />
                )}
                <button
                  onMouseDown={e => { e.preventDefault(); applyCustomTextColor(textColorHex) }}
                  className="text-[10px] bg-blue-600 text-white px-1.5 py-1 rounded hover:bg-blue-700"
                >OK</button>
              </div>
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowTextColor(false) }}
                className="w-full mt-1 text-xs text-gray-500 hover:text-gray-700 py-1 text-left">
                Sin color
              </button>
            </Dropdown>
          )}
        </div>

        {/* Resaltado */}
        <div className="relative">
          <Btn onClick={() => { closeAll(); setShowHighlight(v => !v) }} active={editor.isActive('highlight') || showHighlight} title="Color de resaltado">
            <span className="flex flex-col items-center gap-0">
              <span className="text-xs leading-none">✎</span>
              <span className="w-3.5 h-1 rounded-sm mt-0.5 bg-yellow-300" />
            </span>
          </Btn>
          {showHighlight && (
            <Dropdown onClose={() => setShowHighlight(false)} className="w-48 p-2">
              <div className="grid grid-cols-6 gap-1 mb-2">
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlight(false) }}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2">
                <span className="text-[10px] text-gray-500">Hex:</span>
                <input
                  type="text"
                  value={highlightHex}
                  onChange={e => setHighlightHex(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyCustomHighlight(highlightHex) }}
                  placeholder="#FEF08A"
                  maxLength={7}
                  className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 font-mono"
                />
                <button
                  onMouseDown={e => { e.preventDefault(); applyCustomHighlight(highlightHex) }}
                  className="text-[10px] bg-yellow-500 text-white px-1.5 py-1 rounded hover:bg-yellow-600"
                >OK</button>
              </div>
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlight(false) }}
                className="w-full mt-1 text-xs text-gray-500 hover:text-gray-700 py-1 text-left">
                Sin resaltado
              </button>
            </Dropdown>
          )}
        </div>

        <Sep />

        {/* Alineación */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Izquierda"><AlignL /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrar"><AlignC /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Derecha"><AlignR /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificado"><AlignJ /></Btn>

        {/* Interlineado */}
        <div className="relative">
          <Btn onClick={() => { closeAll(); setShowLineHeight(v => !v) }} active={showLineHeight} title="Interlineado">
            <LineHeightIcon />
          </Btn>
          {showLineHeight && (
            <Dropdown onClose={() => setShowLineHeight(false)} className="w-40">
              {LINE_HEIGHTS.map(lh => (
                <button
                  key={lh.value}
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setLineHeight(lh.value).run(); setShowLineHeight(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {lh.label}
                </button>
              ))}
            </Dropdown>
          )}
        </div>

        <Sep />

        {/* Ortografía */}
        <Btn
          onClick={onToggleSpellCheck}
          active={spellCheck}
          title={spellCheck ? 'Desactivar corrector ortográfico' : 'Activar corrector ortográfico'}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7"/>
            <path d="M3 19h18" strokeDasharray={spellCheck ? undefined : '3 2'} opacity={spellCheck ? 1 : 0.4}/>
            <path d="M7 15l-2 3" opacity={spellCheck ? 1 : 0.3}/>
          </svg>
        </Btn>

        {/* Modo enfoque */}
        <Btn onClick={onToggleFocusMode} active={focusMode} title="Modo enfoque (F11)">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
          </svg>
        </Btn>
      </div>

      {/* ── FILA 2: Párrafo, listas, insertar ── */}
      <div className="flex items-center gap-0.5 px-3 py-1 flex-wrap">

        {/* Estilos de párrafo */}
        <div className="flex gap-0.5">
          <ParagraphBtn label="Normal" active={currentHeading === 'Normal'} onClick={() => editor.chain().focus().setParagraph().run()} />
          <ParagraphBtn label="T1" active={currentHeading === 'H1'} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="font-bold text-[13px]" />
          <ParagraphBtn label="T2" active={currentHeading === 'H2'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="font-semibold" />
          <ParagraphBtn label="T3" active={currentHeading === 'H3'} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          <ParagraphBtn label="T4" active={currentHeading === 'H4'} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className="text-gray-500" />
        </div>

        <Sep />

        {/* Listas */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista con viñetas"><BulletIcon /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><OrderedIcon /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Lista de tareas"><TaskIcon /></Btn>

        <Sep />

        {/* Sangría */}
        <Btn onClick={() => editor.chain().focus().sinkListItem('listItem').run()} title="Aumentar sangría"><IndentIcon /></Btn>
        <Btn onClick={() => editor.chain().focus().liftListItem('listItem').run()} title="Reducir sangría"><OutdentIcon /></Btn>

        <Sep />

        {/* Cita y código */}
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita"><QuoteIcon /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline"><CodeIcon /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloque de código"><CodeBlockIcon /></Btn>

        <Sep />

        {/* Link */}
        <div className="relative">
          <Btn
            onClick={() => { closeAll(); const prev = editor.getAttributes('link').href || ''; setLinkUrl(prev); setShowLinkInput(v => !v) }}
            active={editor.isActive('link')}
            title="Insertar enlace"
          >
            <LinkIcon />
          </Btn>
          {showLinkInput && (
            <Dropdown onClose={() => setShowLinkInput(false)} className="w-72 p-2 flex gap-1.5">
              <input
                ref={linkRef}
                autoFocus
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setLink(); if (e.key === 'Escape') closeAll() }}
                placeholder="https://..."
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-blue-400"
              />
              <button onMouseDown={e => { e.preventDefault(); setLink() }} className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">OK</button>
              <button onMouseDown={e => { e.preventDefault(); closeAll() }} className="text-xs px-2 py-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200">✕</button>
            </Dropdown>
          )}
        </div>

        {/* Imagen por URL */}
        <div className="relative">
          <Btn
            onClick={() => { closeAll(); setShowImageUrl(v => !v) }}
            title="Insertar imagen"
          >
            <ImageIcon />
          </Btn>
          {showImageUrl && (
            <Dropdown onClose={() => setShowImageUrl(false)} className="w-80 p-2">
              <div className="text-xs text-gray-500 mb-1.5 font-medium">URL de la imagen</div>
              <div className="flex gap-1.5">
                <input
                  ref={imageRef}
                  autoFocus
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && imageUrl) {
                      editor.chain().focus().setImage({ src: imageUrl }).run()
                      setImageUrl('')
                      closeAll()
                    }
                    if (e.key === 'Escape') closeAll()
                  }}
                  placeholder="https://ejemplo.com/imagen.png"
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-blue-400"
                />
                <button
                  onMouseDown={e => {
                    e.preventDefault()
                    if (imageUrl) {
                      editor.chain().focus().setImage({ src: imageUrl }).run()
                      setImageUrl('')
                      closeAll()
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >OK</button>
              </div>
              <div className="mt-2 border-t border-gray-100 pt-2">
                <label className="text-xs text-gray-500 font-medium block mb-1">O desde archivo:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      editor.chain().focus().setImage({ src: ev.target.result }).run()
                      closeAll()
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="text-xs text-gray-600 file:mr-2 file:text-xs file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded file:px-2 file:py-1 file:cursor-pointer hover:file:bg-blue-100"
                />
              </div>
            </Dropdown>
          )}
        </div>

        {/* Tabla */}
        <Btn onClick={insertTable} active={editor.isActive('table')} title="Insertar tabla"><TableIcon /></Btn>

        {/* HR */}
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea separadora"><HRIcon /></Btn>

        {/* Emoji */}
        <div className="relative">
          <Btn onClick={() => { closeAll(); setShowEmoji(v => !v) }} active={showEmoji} title="Insertar emoji">
            <span className="text-sm leading-none">😊</span>
          </Btn>
          {showEmoji && (
            <Dropdown onClose={() => setShowEmoji(false)} className="w-72 p-2" style={{ left: 'auto', right: 0 }}>
              {/* Category tabs */}
              <div className="flex gap-0.5 mb-2 overflow-x-auto">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={i}
                    onMouseDown={e => { e.preventDefault(); setEmojiCategory(i) }}
                    className={`shrink-0 text-sm px-1.5 py-0.5 rounded transition-all ${emojiCategory === i ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-gray-100'}`}
                    title={cat.label}
                  >
                    {cat.emojis[0]}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-gray-400 mb-1.5 font-medium">{EMOJI_CATEGORIES[emojiCategory].label}</div>
              <div className="grid grid-cols-10 gap-0.5 max-h-32 overflow-y-auto">
                {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                  <button
                    key={i}
                    onMouseDown={e => { e.preventDefault(); insertEmoji(emoji) }}
                    className="w-6 h-6 flex items-center justify-center text-base hover:bg-gray-100 rounded transition-all hover:scale-125"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Dropdown>
          )}
        </div>

        <Sep />

        {/* Controles de tabla contextuales */}
        {editor.isActive('table') && (
          <>
            <span className="text-[10px] text-gray-400 font-medium px-1">Tabla:</span>
            <SmallBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Añadir columna">+Col</SmallBtn>
            <SmallBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Eliminar columna" danger>-Col</SmallBtn>
            <SmallBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Añadir fila">+Fila</SmallBtn>
            <SmallBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Eliminar fila" danger>-Fila</SmallBtn>
            <SmallBtn onClick={() => editor.chain().focus().mergeCells().run()} title="Combinar celdas">⊞</SmallBtn>
            <SmallBtn onClick={() => editor.chain().focus().splitCell().run()} title="Dividir celda">⊟</SmallBtn>
            <SmallBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Eliminar tabla" danger>✕ Tabla</SmallBtn>
            <Sep />
          </>
        )}

        {/* Deshacer / Rehacer */}
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer (Ctrl+Z)"><UndoIcon /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer (Ctrl+Y)"><RedoIcon /></Btn>

        <Sep />

        {/* Exportar */}
        <Btn onClick={onPrint} title="Imprimir (Ctrl+P)"><PrintIcon /></Btn>

        <button
          onMouseDown={e => { e.preventDefault(); onExportPdf?.() }}
          disabled={exporting}
          title="Exportar como PDF"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-200 border border-transparent hover:border-gray-300 disabled:opacity-40 transition-all"
        >
          {exporting
            ? <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <PdfIcon />
          }
          <span>PDF</span>
        </button>

        <button
          onMouseDown={e => { e.preventDefault(); onExportWord?.() }}
          disabled={exportingWord}
          title="Descargar como Word (.docx)"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 disabled:opacity-40 transition-all"
        >
          {exportingWord
            ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            : <WordIcon />
          }
          <span>.docx</span>
        </button>

        <button
          onMouseDown={e => { e.preventDefault(); onOpenInWord?.() }}
          disabled={openingWord}
          title="Abrir en Microsoft Word"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-[#2b579a] hover:bg-[#1e3f73] border border-[#1e3f73] disabled:opacity-40 transition-all"
        >
          {openingWord
            ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
            : <WordIcon />
          }
          <span>{openingWord ? 'Abriendo...' : 'Abrir en Word'}</span>
        </button>
      </div>
    </div>
  )
}

/* ─── Sub-componentes ─── */

function Dropdown({ children, onClose, className = '', style = {} }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} style={style} className={`absolute top-full left-0 mt-0.5 z-[100] bg-white border border-gray-200 rounded-lg shadow-xl ${className}`}>
      {children}
    </div>
  )
}

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); if (!disabled) onClick?.() }}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-all duration-100 shrink-0
        ${active ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

function ParagraphBtn({ label, active, onClick, className = '' }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 rounded text-xs transition-all duration-100 ${className}
        ${active ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'text-gray-600 hover:bg-gray-200'}`}
    >
      {label}
    </button>
  )
}

function SmallBtn({ children, onClick, title, danger }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-all
        ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-200'}`}
    >
      {children}
    </button>
  )
}

function Sep() { return <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" /> }
function ChevronDown() { return <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg> }

const ic = 'w-3.5 h-3.5'
function AlignL() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg> }
function AlignC() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg> }
function AlignR() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg> }
function AlignJ() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg> }
function LineHeightIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10H3M21 14H3" /><path d="M8 6l-4-4-4 4M8 18l-4 4-4-4" transform="translate(5,0)" /></svg> }
function BulletIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg> }
function OrderedIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="600">1</text><text x="2" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="600">2</text><text x="2" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="600">3</text></svg> }
function TaskIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="6" height="6" rx="1" /><path d="M5 8l1.5 1.5L9 6" /><line x1="13" y1="8" x2="21" y2="8" /><rect x="3" y="14" width="6" height="6" rx="1" /><line x1="13" y1="17" x2="21" y2="17" /></svg> }
function IndentIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><path d="M3 10l4 2-4 2V10z" fill="currentColor" stroke="none" /></svg> }
function OutdentIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><path d="M7 10l-4 2 4 2V10z" fill="currentColor" stroke="none" /></svg> }
function QuoteIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg> }
function CodeIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg> }
function CodeBlockIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="3" /><path d="M8 10L5 13l3 3" /><path d="M16 10l3 3-3 3" /></svg> }
function LinkIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg> }
function ImageIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> }
function TableIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg> }
function HRIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /></svg> }
function UndoIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg> }
function RedoIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" /></svg> }
function PrintIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg> }
function PdfIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> }
function WordIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 13l1.5 4 1.5-4 1.5 4 1.5-4" /></svg> }
