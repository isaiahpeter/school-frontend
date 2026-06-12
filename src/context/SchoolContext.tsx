import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/apiClient'

interface School {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  settings?: Record<string, any>
}

interface SchoolContextValue {
  school: School | null
  schools: School[]
  loading: boolean
  settings: Record<string, any> | null
  refresh: () => Promise<void>
}

const SchoolContext = createContext<SchoolContextValue>({
  school: null, schools: [], loading: true, settings: null, refresh: async () => {},
})

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [schools, setSchools] = useState<School[]>([])
  const [school, setSchool]   = useState<School | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSchools = async () => {
    try {
      const { data } = await api.get('/api/schools')
      const list: School[] = data?.value ?? data ?? []
      setSchools(list)
      setSchool(list[0] ?? null)
    } catch (err) {
      console.error('Failed to fetch schools', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('school_jwt')
    if (!token) { setLoading(false); return }
    fetchSchools()
  }, [])

  return (
    <SchoolContext.Provider value={{
      school, schools, loading,
      settings: school?.settings ?? {},
      refresh: fetchSchools,
    }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  return useContext(SchoolContext)
}