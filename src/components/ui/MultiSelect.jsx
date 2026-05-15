import { useState, useRef, useEffect } from 'react'

export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Seleccionar...',
  searchable = true,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = searchable
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options

  const toggle = (option) => {
    onChange(value.includes(option) ? value.filter(v => v !== option) : [...value, option])
  }

  const removeChip = (option, e) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== option))
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[42px] w-full border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-pointer hover:border-violet-400 transition-all bg-white"
        onClick={() => setOpen(!open)}
      >
        {value.length === 0 && (
          <span className="text-slate-400 text-sm select-none">{placeholder}</span>
        )}
        {value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-medium px-2.5 py-1 rounded-lg">
            {v}
            <button
              type="button"
              onClick={(e) => removeChip(v, e)}
              className="hover:text-violet-900 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <svg
          className={`w-4 h-4 text-slate-400 ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Sin resultados</p>
            ) : (
              filtered.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(option) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                    value.includes(option)
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${
                    value.includes(option) ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                  }`}>
                    {value.includes(option) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {option}
                </button>
              ))
            )}
          </div>
          {value.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange([]) }}
                className="w-full text-xs text-slate-500 hover:text-red-500 py-1.5 transition-colors"
              >
                Limpiar selección ({value.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
