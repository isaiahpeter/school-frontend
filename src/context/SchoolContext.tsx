import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';                // type-only import
import { api } from '../lib/apiClient';                // named import – we'll use it

interface School {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, any>;
}

interface SchoolContextValue {
  school: School | null;
  schools: School[];
  loading: boolean;
  settings: Record<string, any> | null;
  refresh: () => Promise<void>;
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
      const { data } = await api.get('/api/schools');   // using 'api' here
      setSchool(data);
      setSchools([data]);
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