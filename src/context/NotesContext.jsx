import { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { draftKey, clearDraft } from '../lib/drafts'
import { useAuth } from './AuthContext'

const NotesContext = createContext(null)

// Tiempo durante el que se puede deshacer un borrado
const UNDO_MS = 6000

async function deleteNoteRemote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
  // La nota ya no existe: sus copias locales sobran
  clearDraft(draftKey('note', id))
  clearDraft(draftKey('note-conflict', id))
}

const initialState = {
  notes: [],
  loading: true,
  error: null,
  activeNoteId: null,
}

function notesReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }

    case 'FETCH_SUCCESS': {
      // Las notas recién creadas cuyo INSERT aún no ha llegado al servidor
      // no vienen en la respuesta: las conservamos para que no desaparezcan
      const keep = action.keep
        ? state.notes.filter((n) => action.keep.has(n.id) && !action.payload.some((p) => p.id === n.id))
        : []
      return { ...state, notes: [...keep, ...action.payload], loading: false }
    }

    case 'FETCH_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes] }

    // Devuelve una nota a la lista en su sitio (orden por updated_at)
    case 'RESTORE_NOTE': {
      if (state.notes.some((n) => n.id === action.payload.id)) return state
      const notes = [...state.notes, action.payload].sort((a, b) =>
        (b.updated_at || '').localeCompare(a.updated_at || '')
      )
      return { ...state, notes }
    }

    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.payload),
        activeNoteId: state.activeNoteId === action.payload ? null : state.activeNoteId,
      }

    case 'UPDATE_NOTE_LOCAL':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.id ? { ...n, ...action.payload.changes } : n
        ),
      }

    case 'SET_ACTIVE_NOTE':
      return { ...state, activeNoteId: action.payload }

    default:
      return state
  }
}

export function NotesProvider({ children }) {
  const [state, dispatch] = useReducer(notesReducer, initialState)
  const { user } = useAuth()

  // Borrado pendiente de confirmar (ver "Borrado con Deshacer" más abajo)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const pendingDeleteRef = useRef(null)

  // Notas creadas cuyo INSERT aún no está confirmado: id → { row, promise }
  const pendingInsertsRef = useRef(new Map())
  // Notas completas (con contenido) ya abiertas: id → nota
  const noteCacheRef = useRef(new Map())

  useEffect(() => {
    if (user) {
      fetchNotes()
    } else {
      dispatch({ type: 'FETCH_SUCCESS', payload: [] })
    }
  }, [user])

  const fetchNotes = async () => {
    dispatch({ type: 'FETCH_START' })
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, meeting_date, created_at, updated_at, owner_id')
        .order('updated_at', { ascending: false })

      if (error) throw error
      // Una nota en espera de borrarse no debe "resucitar" si se recarga la
      // lista (p. ej. al renovarse la sesión): se podría abrir y escribir en
      // ella justo antes de que el borrado se confirme
      const pendingId = pendingDeleteRef.current?.note.id
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: pendingId ? data.filter((n) => n.id !== pendingId) : data,
        keep: new Set(pendingInsertsRef.current.keys()),
      })
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CONCEPTO: Creación optimista
  //
  // Antes: clic → esperar al servidor (spinner) → abrir la nota.
  // Ahora: el id (UUID) se genera en el navegador, la nota aparece y se
  // abre al instante, y el INSERT viaja por detrás.
  //
  // El riesgo: que un guardado (UPDATE) llegue antes que el INSERT y no
  // encuentre la fila. Por eso updateNote espera a ensureInserted(), que
  // además reintenta el INSERT si falló (p. ej. sin conexión).
  // ─────────────────────────────────────────────────────────────
  const insertRemote = async (row) => {
    const { error } = await supabase.from('notes').insert(row)
    // 23505 = clave duplicada: un intento anterior sí llegó a guardarla
    if (error && error.code !== '23505') throw error
  }

  const ensureInserted = async (id) => {
    const entry = pendingInsertsRef.current.get(id)
    if (!entry) return
    try {
      await entry.promise
    } catch {
      entry.promise = insertRemote(entry.row)
      await entry.promise
    }
    pendingInsertsRef.current.delete(id)
  }

  const createNote = () => {
    const now = new Date().toISOString()
    const note = {
      id: crypto.randomUUID(),
      title: 'Sin título',
      meeting_date: null,
      created_at: now,
      updated_at: now,
      owner_id: user.id,
    }
    const row = { id: note.id, title: note.title, owner_id: user.id }
    const promise = insertRemote(row)
    pendingInsertsRef.current.set(note.id, { row, promise })
    promise
      .then(() => pendingInsertsRef.current.delete(note.id))
      .catch((err) => console.error('Error creando nota (se reintentará al guardar):', err.message))

    noteCacheRef.current.set(note.id, { ...note, content: null })
    dispatch({ type: 'ADD_NOTE', payload: note })
    dispatch({ type: 'SET_ACTIVE_NOTE', payload: note.id })
    return note
  }

  // ─────────────────────────────────────────────────────────────
  // CONCEPTO: Caché de notas abiertas
  //
  // Guardamos en memoria la nota completa (con su contenido) la primera
  // vez que se abre, y la mantenemos al día con cada guardado. Al
  // volver a abrirla se pinta al instante, sin esqueleto de carga.
  // Es un useRef y no estado: cambiarla no necesita repintar nada.
  // ─────────────────────────────────────────────────────────────
  // useCallback: funciones estables para poder ir en dependencias de efectos
  const getCachedNote = useCallback((id) => noteCacheRef.current.get(id), [])
  const cacheNote = useCallback((note) => { noteCacheRef.current.set(note.id, note) }, [])

  // ─────────────────────────────────────────────────────────────
  // CONCEPTO: Borrado con "Deshacer"
  //
  // La nota desaparece de la lista al instante, pero el DELETE real
  // se envía al servidor UNDO_MS después. Durante ese tiempo,
  // "Deshacer" simplemente cancela el temporizador y la devuelve.
  // Así no hace falta papelera ni cambiar la base de datos.
  //
  // Si se cierra la pestaña antes de tiempo, el borrado no llega a
  // enviarse y la nota sigue existiendo: fallamos hacia el lado seguro.
  // ─────────────────────────────────────────────────────────────
  const commitDelete = async ({ note }) => {
    // Si la nota se creó hace nada y su INSERT sigue en camino, esperamos
    // a que llegue: si no, el INSERT tardío la "resucitaría" tras el DELETE
    try { await pendingInsertsRef.current.get(note.id)?.promise } catch { /* nunca llegó a existir */ }
    pendingInsertsRef.current.delete(note.id)
    noteCacheRef.current.delete(note.id)
    try {
      await deleteNoteRemote(note.id)
    } catch (err) {
      dispatch({ type: 'RESTORE_NOTE', payload: note })
      setDeleteError(`No se pudo borrar "${note.title || 'Sin título'}". La hemos devuelto a la lista.`)
      console.error('Error borrando nota:', err.message)
    }
  }

  const deleteNote = (id) => {
    const note = state.notes.find((n) => n.id === id)
    if (!note) return

    // Si había otro borrado esperando, lo confirmamos ya
    const previous = pendingDeleteRef.current
    if (previous) {
      clearTimeout(previous.timer)
      commitDelete(previous)
    }

    const entry = { note, wasActive: state.activeNoteId === id }
    entry.timer = setTimeout(() => {
      pendingDeleteRef.current = null
      setPendingDelete(null)
      commitDelete(entry)
    }, UNDO_MS)
    pendingDeleteRef.current = entry
    setPendingDelete(note)
    setDeleteError(null)
    dispatch({ type: 'DELETE_NOTE', payload: id })
  }

  const undoDelete = () => {
    const entry = pendingDeleteRef.current
    if (!entry) return
    clearTimeout(entry.timer)
    pendingDeleteRef.current = null
    setPendingDelete(null)
    dispatch({ type: 'RESTORE_NOTE', payload: entry.note })
    // Solo la reabrimos si el usuario no ha abierto otra nota mientras tanto
    if (entry.wasActive && !state.activeNoteId) dispatch({ type: 'SET_ACTIVE_NOTE', payload: entry.note.id })
  }

  // Si se sale de Notas con un borrado esperando, lo enviamos ya
  useEffect(() => () => {
    const entry = pendingDeleteRef.current
    if (!entry) return
    clearTimeout(entry.timer)
    deleteNoteRemote(entry.note.id).catch((err) => console.error('Error borrando nota:', err.message))
  }, [])

  const updateNote = async (id, changes) => {
    await ensureInserted(id)
    const updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('notes')
      .update({ ...changes, updated_at })
      .eq('id', id)

    if (error) throw error
    const cached = noteCacheRef.current.get(id)
    if (cached) noteCacheRef.current.set(id, { ...cached, ...changes, updated_at })
    dispatch({ type: 'UPDATE_NOTE_LOCAL', payload: { id, changes: { ...changes, updated_at } } })
  }

  const updateNoteLocal = (id, changes) => {
    dispatch({ type: 'UPDATE_NOTE_LOCAL', payload: { id, changes } })
  }

  const setActiveNote = (id) => {
    dispatch({ type: 'SET_ACTIVE_NOTE', payload: id })
  }

  const value = {
    ...state,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    undoDelete,
    pendingDelete,
    deleteError,
    clearDeleteError: () => setDeleteError(null),
    updateNoteLocal,
    getCachedNote,
    cacheNote,
    setActiveNote,
  }

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes() {
  const context = useContext(NotesContext)
  if (!context) throw new Error('useNotes() debe usarse dentro de <NotesProvider>')
  return context
}
