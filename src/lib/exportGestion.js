import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLUMNS = [
  { key: 'nombre_apellidos',        label: 'Nombre y apellidos' },
  { key: 'posicion',                label: 'Posición' },
  { key: 'estado_candidatura',      label: 'Estado' },
  { key: 'regiones',                label: 'Región' },
  { key: 'clinicas',                label: 'Clínica' },
  { key: 'situacion',               label: 'Situación' },
  { key: 'experiencia',             label: 'Experiencia' },
  { key: 'expectativas_salariales', label: 'Expectativas salariales' },
  { key: 'fecha_incorporacion',     label: 'Fecha incorporación' },
  { key: 'preaviso',                label: 'Preaviso' },
  { key: 'otros',                   label: 'Otros' },
]

function formatValue(key, value) {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (key === 'fecha_incorporacion') {
    return new Date(value + 'T00:00:00').toLocaleDateString('es-ES')
  }
  return value
}

function buildRows(records) {
  return records.map(r => COLUMNS.map(col => formatValue(col.key, r[col.key])))
}

export function exportToExcel(records, filename = 'candidatos') {
  const headers = COLUMNS.map(c => c.label)
  const rows = buildRows(records)
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Column widths
  ws['!cols'] = COLUMNS.map(c => ({ wch: Math.max(c.label.length, 18) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatos')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF(records, filename = 'candidatos') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text('Candidatos', 14, 15)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`${records.length} candidato${records.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('es-ES')}`, 14, 21)

  autoTable(doc, {
    startY: 26,
    head: [COLUMNS.map(c => c.label)],
    body: buildRows(records),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}.pdf`)
}
