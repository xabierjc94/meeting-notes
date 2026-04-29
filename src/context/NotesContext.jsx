import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const NotesContext = createContext(null)

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
      dispatch({ type: 'FETCH_SUCCESS', payload: data })
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

  const deleteNote = async (id) => {
    const previousNotes = state.notes
    dispatch({ type: 'DELETE_NOTE', payload: id })

    try {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      dispatch({ type: 'FETCH_SUCCESS', payload: previousNotes })
      console.error('Error borrando nota:', err.message)
      throw err
    }
  }

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
