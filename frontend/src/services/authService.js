import api from './api'

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { access_token } = response.data
    localStorage.setItem('token', access_token)
    return this.getCurrentUser()
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData)
    // Auto-login after registration
    return this.login(userData.email, userData.password)
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error) {
      // If token is invalid, clear it and return null
      localStorage.removeItem('token')
      return null
    }
  },

  logout() {
    localStorage.removeItem('token')
  }
}