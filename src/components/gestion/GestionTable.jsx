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

export default function GestionTable({ records, onEdit, onDelete }) {
  const { statuses } = useGestion()

  const getStatusStyle = (name) => {
    const s = statuses.find(st => st.name === name)
    if (!s) return {}
    return { backgroundColor: s.color + '20', color: s.color, borderColor: s.color + '40' }
  }

  if (records.length === 0) return <EmptyState />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {['Nombre y apellidos', 'Posición', 'Estado', 'Región', 'Clínica', 'Expectativas', 'Incorporación', 'Preaviso', ''].map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map(r => (
            <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
              <td className="py-3 px-4">
                <button
                  onClick={() => onEdit(r)}
                  className="font-semibold text-slate-800 hover:text-violet-700 transition-colors text-left"
                >
                  {r.nombre_apellidos}
                </button>
              </td>

              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                {r.posicion || <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4">
                {r.estado_candidatura ? (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
                    style={getStatusStyle(r.estado_candidatura)}
                  >
                    {r.estado_candidatura}
                  </span>
                ) : <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4">
                {r.regiones?.length > 0 ? (
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">{r.regiones[0]}</span>
                    {r.regiones.length > 1 && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">+{r.regiones.length - 1}</span>
                    )}
                  </div>
                ) : <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4">
                {r.clinicas?.length > 0 ? (
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md whitespace-nowrap">{r.clinicas[0]}</span>
                    {r.clinicas.length > 1 && (
                      <span className="text-xs text-violet-500 bg-violet-50 px-2 py-0.5 rounded-md">+{r.clinicas.length - 1}</span>
                    )}
                  </div>
                ) : <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                {r.expectativas_salariales || <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                {r.fecha_incorporacion
                  ? new Date(r.fecha_incorporacion + 'T00:00:00').toLocaleDateString('es-ES')
                  : <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                {r.preaviso || <span className="text-slate-300">—</span>}
              </td>

              <td className="py-3 px-4">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(r)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
