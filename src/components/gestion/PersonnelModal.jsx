import { useState } from 'react'
import { useGestion } from '../../context/GestionContext'
import MultiSelect from '../ui/MultiSelect'
import { PROVINCIAS } from '../../data/provincias'

const EMPTY_FORM = {
  nombre_apellidos: '',
  posicion: '',
  regiones: [],
  clinicas: [],
  situacion: '',
  experiencia: '',
  expectativas_salariales: '',
  fecha_incorporacion: '',
  preaviso: '',
  otros: '',
  estado_candidatura: '',
}

export default function PersonnelModal({ record = null, onClose }) {
  const { clinics, statuses, positions, addPersonnel, editPersonnel } = useGestion()
  const [form, setForm] = useState(
    record ? {
      nombre_apellidos: record.nombre_apellidos || '',
      posicion: record.posicion || '',
      regiones: record.regiones || [],
      clinicas: record.clinicas || [],
      situacion: record.situacion || '',
      experiencia: record.experiencia || '',
      expectativas_salariales: record.expectativas_salariales || '',
      fecha_incorporacion: record.fecha_incorporacion || '',
      preaviso: record.preaviso || '',
      otros: record.otros || '',
      estado_candidatura: record.estado_candidatura || '',
    } : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre_apellidos.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (record) {
        await editPersonnel(record.id, form)
      } else {
        await addPersonnel(form)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const clinicNames = clinics.map(c => c.name)
  const currentStatus = statuses.find(s => s.name === form.estado_candidatura)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {record ? 'Editar candidato' : 'Nuevo candidato'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Nombre y apellidos */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nombre y apellidos <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.nombre_apellidos}
                onChange={e => set('nombre_apellidos', e.target.value)}
                placeholder="Ej: María García López"
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                required
              />
            </div>

            {/* Posición */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Posición
                {positions.length === 0 && (
                  <span className="ml-2 text-slate-400 font-normal">(Añade posiciones desde Ajustes ⚙)</span>
                )}
              </label>
              <div className="relative">
                <select
                  value={form.posicion}
                  onChange={e => set('posicion', e.target.value)}
                  disabled={positions.length === 0}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all appearance-none bg-white pr-10 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Sin posición</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Estado de la candidatura */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado de la candidatura</label>
              <div className="relative">
                <select
                  value={form.estado_candidatura}
                  onChange={e => set('estado_candidatura', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all appearance-none bg-white pr-10"
                  style={currentStatus ? {
                    borderColor: currentStatus.color + '80',
                    color: currentStatus.color,
                  } : {}}
                >
                  <option value="">Sin estado</option>
                  {statuses.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Región */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Región (provincias)</label>
              <MultiSelect
                options={PROVINCIAS}
                value={form.regiones}
                onChange={val => set('regiones', val)}
                placeholder="Selecciona provincias..."
              />
            </div>

            {/* Clínica */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Clínica
                {clinicNames.length === 0 && (
                  <span className="ml-2 text-slate-400 font-normal">(Añade clínicas desde Ajustes ⚙)</span>
                )}
              </label>
              <MultiSelect
                options={clinicNames}
                value={form.clinicas}
                onChange={val => set('clinicas', val)}
                placeholder={clinicNames.length === 0 ? 'No hay clínicas configuradas' : 'Selecciona clínicas...'}
                searchable={false}
              />
            </div>

            {/* Situación */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Situación</label>
              <input
                type="text"
                value={form.situacion}
                onChange={e => set('situacion', e.target.value)}
                placeholder="Situación actual..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>

            {/* Preaviso */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Preaviso</label>
              <input
                type="text"
                value={form.preaviso}
                onChange={e => set('preaviso', e.target.value)}
                placeholder="Ej: 15 días"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>

            {/* Experiencia */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Experiencia</label>
              <textarea
                value={form.experiencia}
                onChange={e => set('experiencia', e.target.value)}
                placeholder="Describe la experiencia del candidato..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
              />
            </div>

            {/* Expectativas salariales */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expectativas salariales</label>
              <input
                type="text"
                value={form.expectativas_salariales}
                onChange={e => set('expectativas_salariales', e.target.value)}
                placeholder="Ej: 30.000€ - 35.000€"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>

            {/* Fecha de incorporación */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de incorporación</label>
              <input
                type="date"
                value={form.fecha_incorporacion}
                onChange={e => set('fecha_incorporacion', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>

            {/* Otros */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Otros</label>
              <textarea
                value={form.otros}
                onChange={e => set('otros', e.target.value)}
                placeholder="Información adicional..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.nombre_apellidos.trim()}
            className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-md shadow-violet-500/20"
          >
            {saving ? 'Guardando...' : record ? 'Guardar cambios' : 'Crear candidato'}
          </button>
        </div>
      </div>
    </div>
  )
}
