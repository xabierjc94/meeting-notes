import { useState, useMemo, useRef } from 'react'
import { useGestion } from '../../context/GestionContext'
import GestionTable from './GestionTable'
import GestionCards from './GestionCards'
import PersonnelModal from './PersonnelModal'
import GestionSettings from './GestionSettings'
import { exportToExcel, exportToPDF } from '../../lib/exportGestion'

export default function GestionPanel() {
  const { personnel, statuses, clinics, loading, removePersonnel } = useGestion()

  const [gestionView, setGestionView] = useState('table')
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportRef = useRef(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterClinic, setFilterClinic] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const allRegions = useMemo(() => {
    const set = new Set()
    personnel.forEach(p => p.regiones?.forEach(r => set.add(r)))
    return [...set].sort()
  }, [personnel])

  const allPositions = useMemo(() => {
    const set = new Set()
    personnel.forEach(p => { if (p.posicion) set.add(p.posicion) })
    return [...set].sort()
  }, [personnel])

  const clinicNames = clinics.map(c => c.name)

  const filtered = useMemo(() => {
    return personnel.filter(p => {
      const searchLower = search.toLowerCase()
      if (search && !p.nombre_apellidos.toLowerCase().includes(searchLower) && !p.posicion?.toLowerCase().includes(searchLower)) return false
      if (filterStatus && p.estado_candidatura !== filterStatus) return false
      if (filterRegion && !p.regiones?.includes(filterRegion)) return false
      if (filterClinic && !p.clinicas?.includes(filterClinic)) return false
      if (filterPosition && p.posicion !== filterPosition) return false
      return true
    })
  }, [personnel, search, filterStatus, filterRegion, filterClinic, filterPosition])

  const activeFilters = [filterStatus, filterRegion, filterClinic, filterPosition].filter(Boolean).length

  const clearFilters = () => {
    setFilterStatus('')
    setFilterRegion('')
    setFilterClinic('')
    setFilterPosition('')
    setSearch('')
  }

  const handleEdit = (record) => {
    setEditRecord(record)
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removePersonnel(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">Cargando gestión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar candidatos..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border shrink-0 ${
              showFilters || activeFilters > 0
                ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="w-5 h-5 bg-violet-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{activeFilters}</span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setGestionView('table')}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                gestionView === 'table' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 6h4m-4 12h4M5 6h.01M5 18h.01" />
              </svg>
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button
              onClick={() => setGestionView('cards')}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                gestionView === 'cards' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Export */}
            <div ref={exportRef} className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                title="Exportar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-44">
                    <button
                      onClick={() => { exportToExcel(filtered); setShowExportMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar Excel
                    </button>
                    <button
                      onClick={() => { exportToPDF(filtered); setShowExportMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                    >
                      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Exportar PDF
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:bg-violet-50 hover:border-violet-200 transition-all"
              title="Ajustes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* New candidate */}
            <button
              onClick={() => { setEditRecord(null); setShowModal(true) }}
              className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nuevo candidato</span>
            </button>
          </div>
        </div>

        {/* Filters row */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2 items-center pt-3 border-t border-slate-100">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
            >
              <option value="">Todos los estados</option>
              {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
            >
              <option value="">Todas las regiones</option>
              {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {clinicNames.length > 0 && (
              <select
                value={filterClinic}
                onChange={e => setFilterClinic(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
              >
                <option value="">Todas las clínicas</option>
                {clinicNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {allPositions.length > 0 && (
              <select
                value={filterPosition}
                onChange={e => setFilterPosition(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
              >
                <option value="">Todas las posiciones</option>
                {allPositions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-600 font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Limpiar filtros
              </button>
            )}

            <span className="text-xs text-slate-400 ml-auto">
              {filtered.length} de {personnel.length} candidato{personnel.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {gestionView === 'table' ? (
          <GestionTable records={filtered} onEdit={handleEdit} onDelete={setDeleteTarget} />
        ) : (
          <GestionCards records={filtered} onEdit={handleEdit} onDelete={setDeleteTarget} />
        )}
      </div>

      {/* Personnel modal */}
      {showModal && (
        <PersonnelModal
          record={editRecord}
          onClose={() => { setShowModal(false); setEditRecord(null) }}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <GestionSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Eliminar candidato</h3>
            <p className="text-sm text-slate-500 mb-5">
              ¿Seguro que quieres eliminar a <strong className="text-slate-700">{deleteTarget.nombre_apellidos}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
