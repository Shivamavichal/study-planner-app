// Mock API service that uses localStorage as database
// This allows the app to work without a backend server
import { initializeDemoData } from '../utils/demoData'

class MockApiService {
  constructor() {
    this.initializeData()
  }

  initializeData() {
    // Always initialize demo data on construction
    initializeDemoData()
  }

  // Helper methods
  getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]')
  }

  setUsers(users) {
    localStorage.setItem('users', JSON.stringify(users))
  }

  getCurrentUser() {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No token found')
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const users = this.getUsers()
      const user = users.find(user => user.email === payload.email)
      
      if (!user) {
        // Clear invalid token
        localStorage.removeItem('token')
        throw new Error('User not found')
      }
      
      // Return user data in the expected format (without password)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    } catch (error) {
      // Clear invalid token
      localStorage.removeItem('token')
      throw new Error('Invalid token')
    }
  }

  generateId(collection) {
    const items = JSON.parse(localStorage.getItem(collection) || '[]')
    return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1
  }

  createToken(user) {
    // Simple token creation (not secure, but works for demo)
    const payload = {
      email: user.email,
      exp: Date.now() + (30 * 60 * 1000) // 30 minutes
    }
    return btoa(JSON.stringify(payload))
  }

  // Auth endpoints
  async register(userData) {
    const users = this.getUsers()
    
    // Check if user exists
    if (users.find(user => user.email === userData.email)) {
      throw new Error('Email already registered')
    }

    // Create new user
    const newUser = {
      id: this.generateId('users'),
      name: userData.name,
      email: userData.email,
      password: userData.password, // In real app, this would be hashed
      created_at: new Date().toISOString()
    }

    users.push(newUser)
    this.setUsers(users)

    const token = this.createToken(newUser)
    localStorage.setItem('token', token)

    return { access_token: token, token_type: 'bearer' }
  }

  async login(credentials) {
    const users = this.getUsers()
    const user = users.find(u => u.email === credentials.email && u.password === credentials.password)
    
    if (!user) {
      throw new Error('Invalid email or password')
    }

    const token = this.createToken(user)
    localStorage.setItem('token', token)

    return { access_token: token, token_type: 'bearer' }
  }

  // Subject endpoints
  async getSubjects() {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    return subjects.filter(subject => subject.user_id === currentUser.id)
  }

  async createSubject(subjectData) {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    const newSubject = {
      id: this.generateId('subjects'),
      user_id: currentUser.id,
      name: subjectData.name,
      description: subjectData.description || '',
      created_at: new Date().toISOString()
    }

    subjects.push(newSubject)
    localStorage.setItem('subjects', JSON.stringify(subjects))
    return newSubject
  }

  // Exam endpoints
  async getExams() {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const exams = JSON.parse(localStorage.getItem('exams') || '[]')
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    
    return exams
      .filter(exam => exam.user_id === currentUser.id)
      .map(exam => ({
        ...exam,
        subject: subjects.find(s => s.id === exam.subject_id)
      }))
  }

  async createExam(examData) {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const exams = JSON.parse(localStorage.getItem('exams') || '[]')
    const newExam = {
      id: this.generateId('exams'),
      user_id: currentUser.id,
      subject_id: examData.subject_id,
      exam_name: examData.exam_name,
      exam_date: examData.exam_date,
      priority_level: examData.priority_level || 'medium',
      created_at: new Date().toISOString()
    }

    exams.push(newExam)
    localStorage.setItem('exams', JSON.stringify(exams))
    return newExam
  }

  // Study Plan endpoints
  async generateStudyPlan(planData) {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const subjects = await this.getSubjects()
    const exams = await this.getExams()
    
    if (subjects.length === 0) {
      throw new Error('Please add subjects first')
    }

    // Simple study plan generation
    const studyPlans = []
    const startDate = new Date(planData.start_date)
    const endDate = new Date(planData.end_date)
    const dailyHours = parseFloat(planData.daily_study_hours)

    let currentDate = new Date(startDate)
    let planId = this.generateId('study_plans')

    while (currentDate <= endDate) {
      // Skip weekends (optional)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        subjects.forEach((subject, index) => {
          const hoursPerSubject = dailyHours / subjects.length
          
          studyPlans.push({
            id: planId++,
            user_id: currentUser.id,
            subject_id: subject.id,
            study_date: currentDate.toISOString().split('T')[0],
            planned_hours: hoursPerSubject,
            topic: `Study Session ${index + 1}`,
            description: `Study ${subject.name}`,
            is_completed: false,
            created_at: new Date().toISOString()
          })
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Save to localStorage
    const existingPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const allPlans = [...existingPlans, ...studyPlans]
    localStorage.setItem('study_plans', JSON.stringify(allPlans))

    return studyPlans.map(plan => ({
      ...plan,
      subject: subjects.find(s => s.id === plan.subject_id)
    }))
  }

  async getTodayTasks() {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const today = new Date().toISOString().split('T')[0]
    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')

    return studyPlans
      .filter(plan => plan.user_id === currentUser.id && plan.study_date === today)
      .map(plan => ({
        id: plan.id,
        subject_name: subjects.find(s => s.id === plan.subject_id)?.name || 'Unknown',
        topic: plan.topic,
        planned_hours: plan.planned_hours,
        is_completed: plan.is_completed,
        study_date: plan.study_date,
        description: plan.description,
        can_complete: new Date(plan.study_date) <= new Date()
      }))
  }

  async getUpcomingTasks() {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const today = new Date()
    const threeDaysLater = new Date()
    threeDaysLater.setDate(today.getDate() + 2)

    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')

    return studyPlans
      .filter(plan => {
        if (plan.user_id !== currentUser.id) return false
        const planDate = new Date(plan.study_date)
        return planDate >= today && planDate <= threeDaysLater
      })
      .map(plan => ({
        id: plan.id,
        subject_name: subjects.find(s => s.id === plan.subject_id)?.name || 'Unknown',
        topic: plan.topic,
        planned_hours: plan.planned_hours,
        is_completed: plan.is_completed,
        study_date: plan.study_date,
        description: plan.description,
        can_complete: new Date(plan.study_date) <= new Date()
      }))
      .sort((a, b) => new Date(a.study_date) - new Date(b.study_date))
  }

  async markStudyPlanCompleted(studyPlanId) {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const planIndex = studyPlans.findIndex(plan => 
      plan.id === studyPlanId && plan.user_id === currentUser.id
    )

    if (planIndex === -1) {
      throw new Error('Study plan not found')
    }

    const plan = studyPlans[planIndex]
    
    // Check if can complete (date validation)
    if (new Date(plan.study_date) > new Date()) {
      throw new Error(`You can only complete this task on or after ${plan.study_date}`)
    }

    // Mark as completed
    studyPlans[planIndex].is_completed = true
    studyPlans[planIndex].completed_at = new Date().toISOString()
    localStorage.setItem('study_plans', JSON.stringify(studyPlans))

    // Auto-create progress record
    const progress = JSON.parse(localStorage.getItem('progress') || '[]')
    progress.push({
      id: this.generateId('progress'),
      user_id: currentUser.id,
      study_plan_id: studyPlanId,
      actual_hours: plan.planned_hours,
      notes: 'Task completed - hours calculated automatically',
      completed_at: new Date().toISOString()
    })
    localStorage.setItem('progress', JSON.stringify(progress))

    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    return {
      ...studyPlans[planIndex],
      subject: subjects.find(s => s.id === plan.subject_id)
    }
  }

  // Progress endpoints
  async getProgress() {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const progress = JSON.parse(localStorage.getItem('progress') || '[]')
    return progress
      .filter(record => record.user_id === currentUser.id)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
  }

  async createProgress(progressData) {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const progress = JSON.parse(localStorage.getItem('progress') || '[]')
    const newProgress = {
      id: this.generateId('progress'),
      user_id: currentUser.id,
      study_plan_id: progressData.study_plan_id,
      actual_hours: progressData.actual_hours,
      notes: progressData.notes || '',
      completed_at: new Date().toISOString()
    }

    progress.push(newProgress)
    localStorage.setItem('progress', JSON.stringify(progress))
    return newProgress
  }

  // Dashboard endpoints
  async getDashboardStats() {
    const currentUser = this.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    const subjects = await this.getSubjects()
    const exams = await this.getExams()
    const todayTasks = await this.getTodayTasks()
    const progress = await this.getProgress()

    const today = new Date()
    const upcomingExams = exams.filter(exam => new Date(exam.exam_date) >= today).length
    const completedTasksToday = todayTasks.filter(task => task.is_completed).length
    const totalStudyHoursToday = todayTasks.reduce((sum, task) => sum + parseFloat(task.planned_hours), 0)
    const completionPercentage = todayTasks.length > 0 ? (completedTasksToday / todayTasks.length) * 100 : 0

    return {
      total_subjects: subjects.length,
      upcoming_exams: upcomingExams,
      today_tasks: todayTasks.length,
      completed_tasks_today: completedTasksToday,
      total_study_hours_today: totalStudyHoursToday,
      completion_percentage: completionPercentage
    }
  }

  async getTotalStudyHours() {
    const progress = await this.getProgress()
    const totalHours = progress.reduce((sum, record) => sum + parseFloat(record.actual_hours), 0)
    
    return {
      total_study_hours: totalHours,
      total_sessions: progress.length
    }
  }
}

export const mockApi = new MockApiService()