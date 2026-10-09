import { createContext, useContext } from 'react'

export const AppSidebarContext = createContext(null)

export function useAppSidebar() {
  const context = useContext(AppSidebarContext)
  if (!context) throw new Error('useAppSidebar() debe usarse dentro de <AppLayout>')
  return context
}
