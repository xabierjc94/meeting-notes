import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as api from '../lib/gestionApi'

const GestionContext = createContext(null)

export function GestionProvider({ projectId, children }) {
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState([])
  const [clinics, setClinics] = useState([])
  const [statuses, setStatuses] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !projectId) return
    setLoading(true)
    try {
      const [p, c, s, pos] = await Promise.all([
        api.fetchPersonnel(user.id, projectId),
        api.fetchClinics(user.id),
        api.fetchStatuses(user.id),
        api.fetchPositions(user.id),
      ])
      setPersonnel(p)
      setClinics(c)
      setPositions(pos)
      if (s.length === 0) {
        await api.seedDefaultStatuses(user.id)
        const seeded = await api.fetchStatuses(user.id)
        setStatuses(seeded)
      } else {
        setStatuses(s)
      }
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const addPersonnel = async (record) => {
    const created = await api.createPersonnel(user.id, projectId, record)
    setPersonnel(prev => [created, ...prev])
    return created
  }

  const editPersonnel = async (id, updates) => {
    const updated = await api.updatePersonnel(id, updates)
    setPersonnel(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  const removePersonnel = async (id) => {
    await api.deletePersonnel(id)
    setPersonnel(prev => prev.filter(p => p.id !== id))
  }

  const addPosition = async (name) => {
    const created = await api.createPosition(user.id, name)
    setPositions(prev => [...prev, created])
    return created
  }

  const editPosition = async (id, name) => {
    const updated = await api.updatePosition(id, name)
    setPositions(prev => prev.map(p => p.id === id ? updated : p))
  }

  const removePosition = async (id) => {
    await api.deletePosition(id)
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  const addClinic = async (name) => {
    const created = await api.createClinic(user.id, name)
    setClinics(prev => [...prev, created])
    return created
  }

  const editClinic = async (id, name) => {
    const updated = await api.updateClinic(id, name)
    setClinics(prev => prev.map(c => c.id === id ? updated : c))
  }

  const removeClinic = async (id) => {
    await api.deleteClinic(id)
    setClinics(prev => prev.filter(c => c.id !== id))
  }

  const addStatus = async (name, color) => {
    const created = await api.createStatus(user.id, name, color)
    setStatuses(prev => [...prev, created])
    return created
  }

  const editStatus = async (id, updates) => {
    const updated = await api.updateStatus(id, updates)
    setStatuses(prev => prev.map(s => s.id === id ? updated : s))
  }

  const removeStatus = async (id) => {
    await api.deleteStatus(id)
    setStatuses(prev => prev.filter(s => s.id !== id))
  }

  return (
    <GestionContext.Provider value={{
      personnel, clinics, statuses, positions, loading,
      addPersonnel, editPersonnel, removePersonnel,
      addClinic, editClinic, removeClinic,
      addStatus, editStatus, removeStatus,
      addPosition, editPosition, removePosition,
    }}>
      {children}
    </GestionContext.Provider>
  )
}

export function useGestion() {
  const ctx = useContext(GestionContext)
  if (!ctx) throw new Error('useGestion must be used inside GestionProvider')
  return ctx
}
