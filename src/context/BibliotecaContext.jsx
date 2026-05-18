import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const BibliotecaContext = createContext(null)

const initialState = {
  documentos: [],
  loading: true,
  error: null,
  activeDocId: null,
}

function bibliotecaReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }

    case 'FETCH_SUCCESS':
      return { ...state, documentos: action.payload, loading: false }

    case 'FETCH_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'ADD_DOC':
      return { ...state, documentos: [action.payload, ...state.documentos] }

    case 'DELETE_DOC':
      return {
        ...state,
        documentos: state.documentos.filter((d) => d.id !== action.payload),
        activeDocId: state.activeDocId === action.payload ? null : state.activeDocId,
      }

    case 'UPDATE_DOC_LOCAL':
      return {
        ...state,
        documentos: state.documentos.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload.changes } : d
        ),
      }

    case 'SET_ACTIVE_DOC':
      return { ...state, activeDocId: action.payload }

    default:
      return state
  }
}

export function BibliotecaProvider({ children }) {
  const [state, dispatch] = useReducer(bibliotecaReducer, initialState)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchDocumentos()
    } else {
      dispatch({ type: 'FETCH_SUCCESS', payload: [] })
    }
  }, [user])

  const fetchDocumentos = async () => {
    dispatch({ type: 'FETCH_START' })
    try {
      const { data, error } = await supabase
        .from('biblioteca')
        .select('id, title, file_name, file_path, created_at, updated_at, owner_id')
        .order('updated_at', { ascending: false })

      if (error) throw error
      dispatch({ type: 'FETCH_SUCCESS', payload: data })
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message })
    }
  }

  const createDocumento = async ({ title = 'Sin título', content = null, file_name = null, file_path = null } = {}) => {
    try {
      const { data, error } = await supabase
        .from('biblioteca')
        .insert({ title, content, file_name, file_path, owner_id: user.id })
        .select('id, title, file_name, file_path, created_at, updated_at, owner_id')
        .single()

      if (error) throw error

      dispatch({ type: 'ADD_DOC', payload: data })
      dispatch({ type: 'SET_ACTIVE_DOC', payload: data.id })

      return data
    } catch (err) {
      console.error('Error creando documento:', err.message)
      throw err
    }
  }

  const deleteDocumento = async (id) => {
    const prev = state.documentos
    dispatch({ type: 'DELETE_DOC', payload: id })

    try {
      const { error } = await supabase.from('biblioteca').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      dispatch({ type: 'FETCH_SUCCESS', payload: prev })
      console.error('Error borrando documento:', err.message)
      throw err
    }
  }

  const updateDocumento = async (id, changes) => {
    const { error } = await supabase
      .from('biblioteca')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    dispatch({ type: 'UPDATE_DOC_LOCAL', payload: { id, changes } })
  }

  const updateDocumentoLocal = (id, changes) => {
    dispatch({ type: 'UPDATE_DOC_LOCAL', payload: { id, changes } })
  }

  const setActiveDoc = (id) => {
    dispatch({ type: 'SET_ACTIVE_DOC', payload: id })
  }

  const value = {
    ...state,
    fetchDocumentos,
    createDocumento,
    updateDocumento,
    deleteDocumento,
    updateDocumentoLocal,
    setActiveDoc,
  }

  return <BibliotecaContext.Provider value={value}>{children}</BibliotecaContext.Provider>
}

export function useBiblioteca() {
  const context = useContext(BibliotecaContext)
  if (!context) throw new Error('useBiblioteca() debe usarse dentro de <BibliotecaProvider>')
  return context
}
