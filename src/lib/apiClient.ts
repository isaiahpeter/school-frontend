import axios, { type AxiosError } from 'axios'
import { API_BASE_URL } from '../env'
import { clearToken } from './storage'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Attach auth token on *every request* from localStorage.
api.interceptors.request.use((config) => {
  const token = (() => {
    try {
      return localStorage.getItem('school_jwt')
    } catch {
      return null
    }
  })()

  if (token) {
    config.headers = config.headers ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(config.headers as any).Authorization = `Bearer ${token}`
  } else {
    if (config.headers && 'Authorization' in config.headers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (config.headers as any).Authorization
    }
  }

  return config
})

export function setAuthToken(token: string | null) {
  // Kept for backward compatibility, but request interceptor reads localStorage.
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

// Response interceptor – clear token and redirect to login on 401s.
api.interceptors.response.use(
(response) => response,
  (error: AxiosError) => {
    if (error?.response?.status === 401) {
      clearToken()
      setAuthToken(null)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)





