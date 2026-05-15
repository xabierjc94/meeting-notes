import { useState } from 'react'
import { useGestion } from '../../context/GestionContext'

const PRESET_COLORS = [
  // Grises
  '#64748b', '#94a3b8', '#cbd5e1',
  // Azules
  '#1d4ed8', '#3b82f6', '#60a5fa', '#06b6d4', '#0891b2',
  // Morados
  '#7c3aed', '#8b5cf6', '#a78bfa', '#ec4899', '#db2777',
  // Verdes
  '#15803d', '#16a34a', '#22c55e', '#84cc16', '#65a30d',
  // Amarillos / Naranjas
  '#d97706', '#f59e0b', '#fbbf24', '#f97316', '#ea580c',
  // Rojos
  '#b91c1c', '#ef4444', '#f87171',
]

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full transition-transform shrink-0 ${value === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

export default function GestionSettings({ onClose }) {
  const { clinics, statuses, positions, addClinic, editClinic, removeClinic, addStatus, editStatus, removeStatus, addPosition, editPosition, removePosition } = useGestion()
  const [tab, setTab] = useState('clinics')

  // Clinic state
  const [newClinic, setNewClinic] = useState('')
  const [savingClinic, setSavingClinic] = useState(false)
  const [editingClinic, setEditingClinic] = useState(null)
  const [editClinicVal, setEditClinicVal] = useState('')

  // Status state
  const [newStatus, setNewStatus] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#6366f1')
  const [savingStatus, setSavingStatus] = useState(false)
  const [editingStatus, setEditingStatus] = useState(null)
  const [editStatusVal, setEditStatusVal] = useState('')
  const [editStatusColor, setEditStatusColor] = useState('')

  // Position state
  const [newPosition, setNewPosition] = useState('')
  const [savingPosition, setSavingPosition] = useState(false)
  const [editingPosition, setEditingPosition] = useState(null)
  const [editPositionVal, setEditPositionVal] = useState('')

  const handleAddPosition = async (e) => {
    e.preventDefault()
    if (!newPosition.trim()) return
    setSavingPosition(true)
    try { await addPosition(newPosition.trim()); setNewPosition('') }
    finally { setSavingPosition(false) }
  }

  const handleSavePosition = async (id) => {
    if (!editPositionVal.trim()) return
    await editPosition(id, editPositionVal.trim())
    setEditingPosition(null)
  }

  const handleAddClinic = async (e) => {
    e.preventDefault()
    if (!newClinic.trim()) return
    setSavingClinic(true)
    try { await addClinic(newClinic.trim()); setNewClinic('') }
    finally { setSavingClinic(false) }
  }

  const handleSaveClinic = async (id) => {
    if (!editClinicVal.trim()) return
    await editClinic(id, editClinicVal.trim())
    setEditingClinic(null)
  }

  const handleAddStatus = async (e) => {
    e.preventDefault()
    if (!newStatus.trim()) return
    setSavingStatus(true)
    try { await addStatus(newStatus.trim(), newStatusColor); setNewStatus(''); setNewStatusColor('#6366f1') }
    finally { setSavingStatus(false) }
  }

  const handleSaveStatus = async (id) => {
    if (!editStatusVal.trim()) return
    await editStatus(id, { name: editStatusVal.trim(), color: editStatusColor })
    setEditingStatus(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[85dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-slate-800">Ajustes de Gestión</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 shrink-0">
          {[['clinics', 'Clínicas'], ['positions', 'Posiciones'], ['statuses', 'Estados']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                tab === key ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {/* --- CLÍNICAS --- */}
          {tab === 'clinics' && (
            <div>
              <form onSubmit={handleAddClinic} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newClinic}
                  onChange={e => setNewClinic(e.target.value)}
                  placeholder="Nombre de la clínica..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={savingClinic || !newClinic.trim()}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Añadir
                </button>
              </form>

              <div className="space-y-2">
                {clinics.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No hay clínicas configuradas</p>
                ) : (
                  clinics.map(clinic => (
                    <div key={clinic.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                      {editingClinic === clinic.id ? (
                        <>
                          <input
                            value={editClinicVal}
                            onChange={e => setEditClinicVal(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveClinic(clinic.id)
                              if (e.key === 'Escape') setEditingClinic(null)
                            }}
                            className="flex-1 border border-violet-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                          <button onClick={() => handleSaveClinic(clinic.id)} className="text-xs text-violet-600 font-semibold px-2 py-1 hover:bg-violet-100 rounded-lg transition-colors">Guardar</button>
                          <button onClick={() => setEditingClinic(null)} className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-700 font-medium">{clinic.name}</span>
                          <button
                            onClick={() => { setEditingClinic(clinic.id); setEditClinicVal(clinic.name) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeClinic(clinic.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- POSICIONES --- */}
          {tab === 'positions' && (
            <div>
              <form onSubmit={handleAddPosition} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newPosition}
                  onChange={e => setNewPosition(e.target.value)}
                  placeholder="Nombre de la posición..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={savingPosition || !newPosition.trim()}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Añadir
                </button>
              </form>

              <div className="space-y-2">
                {positions.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No hay posiciones configuradas</p>
                ) : (
                  positions.map(pos => (
                    <div key={pos.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                      {editingPosition === pos.id ? (
                        <>
                          <input
                            value={editPositionVal}
                            onChange={e => setEditPositionVal(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSavePosition(pos.id)
                              if (e.key === 'Escape') setEditingPosition(null)
                            }}
                            className="flex-1 border border-violet-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                          <button onClick={() => handleSavePosition(pos.id)} className="text-xs text-violet-600 font-semibold px-2 py-1 hover:bg-violet-100 rounded-lg transition-colors">Guardar</button>
                          <button onClick={() => setEditingPosition(null)} className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-slate-700 font-medium">{pos.name}</span>
                          <button
                            onClick={() => { setEditingPosition(pos.id); setEditPositionVal(pos.name) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removePosition(pos.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- ESTADOS --- */}
          {tab === 'statuses' && (
            <div>
              <form onSubmit={handleAddStatus} className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    placeholder="Nombre del estado..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={savingStatus || !newStatus.trim()}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Añadir
                  </button>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-slate-500 shrink-0">Color:</span>
                  <ColorPicker value={newStatusColor} onChange={setNewStatusColor} />
                </div>
              </form>

              <div className="space-y-2">
                {statuses.map(status => (
                  <div key={status.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                    {editingStatus === status.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={editStatusVal}
                            onChange={e => setEditStatusVal(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveStatus(status.id)
                              if (e.key === 'Escape') setEditingStatus(null)
                            }}
                            className="flex-1 border border-violet-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                          <button onClick={() => handleSaveStatus(status.id)} className="text-xs text-violet-600 font-semibold px-2 py-1 hover:bg-violet-100 rounded-lg transition-colors">Guardar</button>
                          <button onClick={() => setEditingStatus(null)} className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                        </div>
                        <ColorPicker value={editStatusColor} onChange={setEditStatusColor} />
                      </div>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                        <span className="flex-1 text-sm text-slate-700 font-medium">{status.name}</span>
                        <button
                          onClick={() => { setEditingStatus(status.id); setEditStatusVal(status.name); setEditStatusColor(status.color) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeStatus(status.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
