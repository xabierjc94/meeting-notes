// Paleta del rediseño, compartida por proyectos y carpetas. Lo que ya
// existe conserva su color: es una elección del usuario guardada en la base de datos.
export const PALETTE = [
  { value: '#b4f53c', name: 'Lima' },
  { value: '#4ade80', name: 'Verde' },
  { value: '#2dd4bf', name: 'Turquesa' },
  { value: '#38bdf8', name: 'Azul cielo' },
  { value: '#c4b5fd', name: 'Lila' },
  { value: '#f9a8d4', name: 'Rosa' },
  { value: '#f87171', name: 'Rojo' },
  { value: '#fb923c', name: 'Naranja' },
  { value: '#facc15', name: 'Amarillo' },
  { value: '#a3a3a3', name: 'Gris' },
]

// Color de la paleta por su nombre ("Azul cielo" → '#38bdf8'). Así los colores
// por defecto salen de aquí y no se copian a mano en cada archivo.
export function paletteColor(name) {
  const color = PALETTE.find(c => c.name === name)
  if (!color) throw new Error(`Color "${name}" no está en la paleta`)
  return color.value
}
