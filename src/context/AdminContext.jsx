import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllProfiles, updateProfile, deleteProfile, getActivityLogs, getStats } from '../lib/adminApi'

const AdminContext = createContext()

export function AdminProvider({ children }) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profilesData, statsData, logsData] = await Promise.all([
        getAllProfiles(),
        getStats(),
        getActivityLogs(),
      ])
      setProfiles(profilesData)
      setStats(statsData)
      setLogs(logsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchData()
  }, [user, fetchData])

  const updateUser = async (userId, updates) => {
    const updated = await updateProfile(userId, updates)
    setProfiles(prev => prev.map(p => p.id === userId ? updated : p))
    return updated
  }

  const removeUser = async (userId) => {
    await deleteProfile(userId)
    setProfiles(prev => prev.filter(p => p.id !== userId))
  }

  return (
    <AdminContext.Provider value={{ profiles, stats, logs, loading, error, fetchData, updateUser, removeUser }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
