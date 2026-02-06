import api from './api'

export const studyService = {
  // Subjects
  async getSubjects() {
    const response = await api.get('/subjects')
    return response.data
  },

  async createSubject(subjectData) {
    const response = await api.post('/subjects', subjectData)
    return response.data
  },

  async updateSubject(id, subjectData) {
    const response = await api.put(`/subjects/${id}`, subjectData)
    return response.data
  },

  async deleteSubject(id) {
    const response = await api.delete(`/subjects/${id}`)
    return response.data
  },

  // Exams
  async getExams() {
    const response = await api.get('/exams')
    return response.data
  },

  async getUpcomingExams() {
    const response = await api.get('/exams/upcoming')
    return response.data
  },

  async createExam(examData) {
    const response = await api.post('/exams', examData)
    return response.data
  },

  async updateExam(id, examData) {
    const response = await api.put(`/exams/${id}`, examData)
    return response.data
  },

  async deleteExam(id) {
    const response = await api.delete(`/exams/${id}`)
    return response.data
  },

  // Study Plans
  async generateStudyPlan(planData) {
    const response = await api.post('/study-plans/generate', planData)
    return response.data
  },

  async getStudyPlans(startDate, endDate) {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    
    const response = await api.get('/study-plans', { params })
    return response.data
  },

  async getTodayTasks() {
    const response = await api.get('/study-plans/today')
    return response.data
  },

  async getUpcomingTasks() {
    const response = await api.get('/study-plans/upcoming')
    return response.data
  },

  async markStudyPlanCompleted(id) {
    const response = await api.put(`/study-plans/${id}/complete`)
    return response.data
  },

  async deleteStudyPlan(id) {
    const response = await api.delete(`/study-plans/${id}`)
    return response.data
  },

  // Progress
  async getProgress() {
    const response = await api.get('/progress')
    return response.data
  },

  async createProgress(progressData) {
    const response = await api.post('/progress', progressData)
    return response.data
  },

  async updateProgress(id, progressData) {
    const response = await api.put(`/progress/${id}`, progressData)
    return response.data
  },

  async deleteProgress(id) {
    const response = await api.delete(`/progress/${id}`)
    return response.data
  },

  // Dashboard
  async getDashboardStats() {
    const response = await api.get('/dashboard/stats')
    return response.data
  },

  async getDashboardTasks() {
    const response = await api.get('/dashboard/today-tasks')
    return response.data
  },

  async getTotalStudyHours() {
    const response = await api.get('/dashboard/total-study-hours')
    return response.data
  }
}