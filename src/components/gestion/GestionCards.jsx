import { useGestion } from '../../context/GestionContext'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <p className="text-slate-500 font-medium">Sin candidatos</p>
      <p className="text-slate-400 text-sm mt-1">Añade el primer candidato con el botón superior</p>
    </div>
  )
}

export default function GestionCards({ records, onEdit, onDelete }) {
  const { statuses } = useGestion()

  const getStatusStyle = (name) => {
    const s = statuses.find(st => st.name === name)
    if (!s) return {}
    return { backgroundColor: s.color + '20', color: s.color, borderColor: s.color + '40' }
  }

  const getCardBorderColor = (name) => {
    const s = statuses.find(st => st.name === name)
    return s ? s.color : null
  }

  if (records.length === 0) return <EmptyState />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
      {records.map(r => {
        const initials = r.nombre_apellidos
          .split(' ')
          .slice(0, 2)
          .map(n => n[0])
          .join('')
          .toUpperCase()

        const borderColor = getCardBorderColor(r.estado_candidatura)

        return (
          <div
            key={r.id}
            className="bg-white rounded-2xl border-2 hover:shadow-lg transition-all group flex flex-col"
            style={{
              borderColor: borderColor || '#e2e8f0',
              boxShadow: borderColor ? `0 0 0 0 transparent` : undefined,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = borderColor ? `0 4px 20px ${borderColor}30` : '' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}
          >
            {/* Card header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onEdit(r)}
                    className="font-bold text-slate-800 hover:text-violet-700 transition-colors text-left text-sm leading-tight line-clamp-2"
                  >
                    {r.nombre_apellidos}
                  </button>
                  {r.posicion && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{r.posicion}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(r)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {r.estado_candidatura && (
                <div className="mt-2.5">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={getStatusStyle(r.estado_candidatura)}
                  >
                    {r.estado_candidatura}
                  </span>
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-4 space-y-2.5 flex-1">
              {r.regiones?.length > 0 && (
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex flex-wrap gap-1">
                    {r.regiones.slice(0, 2).map(reg => (
                      <span key={reg} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{reg}</span>
                    ))}
                    {r.regiones.length > 2 && (
                      <span className="text-xs text-slate-500">+{r.regiones.length - 2}</span>
                    )}
                  </div>
                </div>
              )}

              {r.clinicas?.length > 0 && (
                <div className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div className="flex flex-wrap gap-1">
                    {r.clinicas.slice(0, 2).map(cl => (
                      <span key={cl} className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{cl}</span>
                    ))}
                    {r.clinicas.length > 2 && (
                      <span className="text-xs text-violet-500">+{r.clinicas.length - 2}</span>
                    )}
                  </div>
                </div>
              )}

              {r.expectativas_salariales && (
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-slate-600 truncate">{r.expectativas_salariales}</span>
                </div>
              )}

              {r.fecha_incorporacion && (
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-slate-600">
                    {new Date(r.fecha_incorporacion + 'T00:00:00').toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}

              {r.situacion && (
                <p className="text-xs text-slate-500 line-clamp-2 border-t border-slate-100 pt-2">{r.situacion}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
