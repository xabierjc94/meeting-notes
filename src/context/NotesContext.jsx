import { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react'
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

    case 'FETCH_SUCCESS':
      return { ...state, notes: action.payload, loading: false }

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
      dispatch({ type: 'FETCH_SUCCESS', payload: pendingId ? data.filter((n) => n.id !== pendingId) : data })
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message })
    }
  }

  const createNote = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ title: 'Sin título', owner_id: user.id })
        .select('id, title, meeting_date, created_at, updated_at, owner_id')
        .single()

      if (error) throw error

      dispatch({ type: 'ADD_NOTE', payload: data })
      dispatch({ type: 'SET_ACTIVE_NOTE', payload: data.id })

      return data
    } catch (err) {
      console.error('Error creando nota:', err.message)
      throw err
    }
  }

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
    const { error } = await supabase
      .from('notes')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    dispatch({ type: 'UPDATE_NOTE_LOCAL', payload: { id, changes } })
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
    setActiveNote,
  }

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes() {
  const context = useContext(NotesContext)
  if (!context) throw new Error('useNotes() debe usarse dentro de <NotesProvider>')
  return context
}
