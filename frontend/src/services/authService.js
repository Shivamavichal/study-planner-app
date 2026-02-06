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
    const response = await api.get('/auth/me')
    return response.data
  },

  logout() {
    localStorage.removeItem('token')
  }
}