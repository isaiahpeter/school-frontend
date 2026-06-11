import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/apiClient';   // ← named import, same as LoginPage

interface School {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, any>;   // ← added
}

interface SchoolContextValue {
  school: School | null;
  schools: School[];
  loading: boolean;
  settings: Record<string, any> | null;   // ← added
  refresh: () => Promise<void>;           // ← added
}

const SchoolContext = createContext<SchoolContextValue>({
  school: null,
  schools: [],
  loading: true,
  settings: null,
  refresh: async () => {},
});

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);

  const fetchSchool = async () => {
    try {
      // Use the multi‑tenant endpoint that returns the current user's school
      const { data } = await apiClient.get('/api/school/me');
      setSchool(data);
      setSchools([data]);   // keep compatibility with `schools` list
    } catch (err) {
      console.error('Failed to fetch school', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchool();
  }, []);

  const refresh = fetchSchool;

  return (
    <SchoolContext.Provider
      value={{
        school,
        schools,
        loading,
        settings: school?.settings ?? {},
        refresh,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export function useSchool() {
  return useContext(SchoolContext);
}