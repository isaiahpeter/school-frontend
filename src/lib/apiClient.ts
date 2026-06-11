import axios, { type AxiosError } from 'axios'
import { API_BASE_URL } from '../env'
import { clearToken } from './storage'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('school_jwt')
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Fail silently if localStorage is blocked
  }
  return config
})

// Clean up your 401 interceptor without needing setAuthToken mutations
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error?.response?.status === 401 && window.location.pathname !== '/login') {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)