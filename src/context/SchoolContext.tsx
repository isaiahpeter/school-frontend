import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

type School = { id: string; name: string; address?: string; phone?: string; email?: string }

type SchoolContextValue = {
  school: School | null
  schools: School[]
  loading: boolean
}

const SchoolContext = createContext<SchoolContextValue>({ school: null, schools: [], loading: true })

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/schools')
      .then(res => setSchools(res.data))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SchoolContext.Provider value={{ school: schools[0] ?? null, schools, loading }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  return useContext(SchoolContext)
}