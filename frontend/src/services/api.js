import axios from 'axios'
import { mockApi } from './mockApi'

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Detect if we're on Vercel or production environment
const isProduction = import.meta.env.PROD
const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel.com')
const hasNoApiUrl = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === ''
const forceUseMock = import.meta.env.VITE_USE_MOCK_API === 'true'

// Use mock API if any of these conditions are true
const USE_MOCK_API = forceUseMock || isProduction || isVercel || hasNoApiUrl

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API wrapper that uses mock API in production
const apiWrapper = {
  // Auth endpoints
  async post(url, data) {
    if (USE_MOCK_API) {
      try {
        switch (url) {
          case '/auth/register':
            return { data: await mockApi.register(data) }
          case '/auth/login':
            return { data: await mockApi.login(data) }
          case '/subjects':
            return { data: await mockApi.createSubject(data) }
          case '/exams':
            return { data: await mockApi.createExam(data) }
          case '/study-plans/generate':
            return { data: await mockApi.generateStudyPlan(data) }
          case '/progress':
            return { data: await mockApi.createProgress(data) }
          default:
            throw new Error(`Mock API endpoint not found: ${url}`)
        }
      } catch (error) {
        throw { response: { data: { detail: error.message } } }
      }
    }
    return api.post(url, data)
  },

  async get(url) {
    if (USE_MOCK_API) {
      try {
        switch (url) {
          case '/auth/me':
            // Special handling for auth/me - don't throw if no token
            try {
              return { data: await mockApi.getCurrentUser() }
            } catch (error) {
              // Return null user instead of throwing
              throw { response: { status: 401, data: { detail: 'Not authenticated' } } }
            }
          case '/subjects':
            return { data: await mockApi.getSubjects() }
          case '/exams':
            return { data: await mockApi.getExams() }
          case '/exams/upcoming':
            return { data: await mockApi.getExams() } // Same as getExams for now
          case '/study-plans':
            return { data: await mockApi.getStudyPlans() }
          case '/study-plans/today':
            return { data: await mockApi.getTodayTasks() }
          case '/study-plans/upcoming':
            return { data: await mockApi.getUpcomingTasks() }
          case '/progress':
            return { data: await mockApi.getProgress() }
          case '/dashboard/stats':
            return { data: await mockApi.getDashboardStats() }
          case '/dashboard/today-tasks':
            return { data: await mockApi.getTodayTasks() }
          case '/dashboard/total-study-hours':
            return { data: await mockApi.getTotalStudyHours() }
          default:
            throw new Error(`Mock API endpoint not found: ${url}`)
        }
      } catch (error) {
        throw { response: { data: { detail: error.message } } }
      }
    }
    return api.get(url)
  },

  async put(url, data) {
    if (USE_MOCK_API) {
      try {
        if (url.includes('/study-plans/') && url.includes('/complete')) {
          const studyPlanId = parseInt(url.split('/')[2])
          return { data: await mockApi.markStudyPlanCompleted(studyPlanId) }
        }
        if (url.includes('/study-plans/')) {
          const studyPlanId = parseInt(url.split('/')[2])
          return { data: await mockApi.updateStudyPlan(studyPlanId, data) }
        }
        if (url.includes('/exams/')) {
          const examId = parseInt(url.split('/')[2])
          return { data: await mockApi.updateExam(examId, data) }
        }
        throw new Error(`Mock API endpoint not found: ${url}`)
      } catch (error) {
        throw { response: { data: { detail: error.message } } }
      }
    }
    return api.put(url, data)
  },

  async delete(url) {
    if (USE_MOCK_API) {
      try {
        if (url.includes('/study-plans/')) {
          const studyPlanId = parseInt(url.split('/')[2])
          return { data: await mockApi.deleteStudyPlan(studyPlanId) }
        }
        if (url.includes('/exams/')) {
          const examId = parseInt(url.split('/')[2])
          return { data: await mockApi.deleteExam(examId) }
        }
        throw new Error('Delete endpoint not found in mock API')
      } catch (error) {
        throw { response: { data: { detail: error.message } } }
      }
    }
    return api.delete(url)
  }
}

export default apiWrapper