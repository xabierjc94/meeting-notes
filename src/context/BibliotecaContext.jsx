import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const BibliotecaContext = createContext(null)

const initialState = {
  documentos: [],
  carpetas: [],
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

    case 'SET_CARPETAS':
      return { ...state, carpetas: action.payload }

    case 'ADD_CARPETA':
      return { ...state, carpetas: [...state.carpetas, action.payload] }

    case 'UPDATE_CARPETA':
      return {
        ...state,
        carpetas: state.carpetas.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.changes } : c
        ),
      }

    case 'DELETE_CARPETA':
      return {
        ...state,
        carpetas: state.carpetas.filter(c => c.id !== action.payload),
        // docs que estaban en esa carpeta vuelven a raíz
        documentos: state.documentos.map(d =>
          d.folder_id === action.payload ? { ...d, folder_id: null } : d
        ),
      }

    case 'ADD_DOC':
      return { ...state, documentos: [action.payload, ...state.documentos] }

    case 'DELETE_DOC':
      return {
        ...state,
        documentos: state.documentos.filter(d => d.id !== action.payload),
        activeDocId: state.activeDocId === action.payload ? null : state.activeDocId,
      }

    case 'UPDATE_DOC_LOCAL':
      return {
        ...state,
        documentos: state.documentos.map(d =>
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
      fetchCarpetas()
    } else {
      dispatch({ type: 'FETCH_SUCCESS', payload: [] })
      dispatch({ type: 'SET_CARPETAS', payload: [] })
    }
  }, [user])

  const fetchDocumentos = async () => {
    dispatch({ type: 'FETCH_START' })
    try {
      const { data, error } = await supabase
        .from('biblioteca')
        .select('id, title, file_name, file_path, folder_id, created_at, updated_at, owner_id')
        .order('updated_at', { ascending: false })
      if (error) throw error
      dispatch({ type: 'FETCH_SUCCESS', payload: data })
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message })
    }
  }

  const fetchCarpetas = async () => {
    try {
      const { data, error } = await supabase
        .from('carpetas')
        .select('id, name, color, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      dispatch({ type: 'SET_CARPETAS', payload: data })
    } catch (err) {
      console.error('Error cargando carpetas:', err.message)
    }
  }

  // ─── Documentos ───────────────────────────────────────────────
  const createDocumento = async ({ title = 'Sin título', content = null, file_name = null, file_path = null, folder_id = null } = {}) => {
    const { data, error } = await supabase
      .from('biblioteca')
      .insert({ title, content, file_name, file_path, folder_id, owner_id: user.id })
      .select('id, title, file_name, file_path, folder_id, created_at, updated_at, owner_id')
      .single()
    if (error) throw error
    dispatch({ type: 'ADD_DOC', payload: data })
    dispatch({ type: 'SET_ACTIVE_DOC', payload: data.id })
    return data
  }

  const deleteDocumento = async (id) => {
    const prev = state.documentos
    dispatch({ type: 'DELETE_DOC', payload: id })
    const { error } = await supabase.from('biblioteca').delete().eq('id', id)
    if (error) {
      dispatch({ type: 'FETCH_SUCCESS', payload: prev })
      throw error
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

  const moveDocToFolder = async (docId, folderId) => {
    dispatch({ type: 'UPDATE_DOC_LOCAL', payload: { id: docId, changes: { folder_id: folderId } } })
    const { error } = await supabase
      .from('biblioteca')
      .update({ folder_id: folderId, updated_at: new Date().toISOString() })
      .eq('id', docId)
    if (error) throw error
  }

  const setActiveDoc = (id) => dispatch({ type: 'SET_ACTIVE_DOC', payload: id })

  // ─── Carpetas ─────────────────────────────────────────────────
  const createCarpeta = async ({ name, color = '#10b981' }) => {
    const { data, error } = await supabase
      .from('carpetas')
      .insert({ name, color, user_id: user.id })
      .select('id, name, color, created_at')
      .single()
    if (error) throw error
    dispatch({ type: 'ADD_CARPETA', payload: data })
    return data
  }

  const updateCarpeta = async (id, changes) => {
    const { error } = await supabase
      .from('carpetas')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    dispatch({ type: 'UPDATE_CARPETA', payload: { id, changes } })
  }

  const deleteCarpeta = async (id) => {
    // Los documentos de la carpeta pasan a folder_id = null (ON DELETE SET NULL en BD)
    const { error } = await supabase.from('carpetas').delete().eq('id', id)
    if (error) throw error
    dispatch({ type: 'DELETE_CARPETA', payload: id })
  }

  const value = {
    ...state,
    fetchDocumentos,
    createDocumento,
    updateDocumento,
    deleteDocumento,
    updateDocumentoLocal,
    moveDocToFolder,
    setActiveDoc,
    createCarpeta,
    updateCarpeta,
    deleteCarpeta,
  }

  return <BibliotecaContext.Provider value={value}>{children}</BibliotecaContext.Provider>
}

export function useBiblioteca() {
  const ctx = useContext(BibliotecaContext)
  if (!ctx) throw new Error('useBiblioteca() debe usarse dentro de <BibliotecaProvider>')
  return ctx
}
