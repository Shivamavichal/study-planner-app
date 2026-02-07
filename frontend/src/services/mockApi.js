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

  getCurrentUserFromToken() {
    const token = localStorage.getItem('token')
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || token))
      const users = this.getUsers()
      return users.find(u => u.email === payload.email || u.id === payload.user_id)
    } catch {
      return null
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
      user_id: user.id,
      exp: Date.now() + (30 * 60 * 1000) // 30 minutes
    }
    return btoa(JSON.stringify(payload))
  }

  getCurrentUser() {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No token found')
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || token))
      const users = this.getUsers()
      const user = users.find(u => u.email === payload.email || u.id === payload.user_id)
      
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

  // Auth endpoints
  async register(userData) {
    const users = this.getUsers()
    
    // Check if user exists
    if (users.find(user => user.email === userData.email)) {
      throw new Error('Email already registered')
    }

    // Create new user with proper ID generation
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
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    return subjects.filter(subject => subject.user_id === currentUser.id)
  }

  async createSubject(subjectData) {
    const currentUser = this.getCurrentUserFromToken()
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
    const currentUser = this.getCurrentUserFromToken()
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
    const currentUser = this.getCurrentUserFromToken()
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

  async updateExam(examId, examData) {
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const exams = JSON.parse(localStorage.getItem('exams') || '[]')
    const examIndex = exams.findIndex(exam => 
      exam.id === examId && exam.user_id === currentUser.id
    )

    if (examIndex === -1) {
      throw new Error('Exam not found')
    }

    exams[examIndex] = {
      ...exams[examIndex],
      ...examData,
      updated_at: new Date().toISOString()
    }

    localStorage.setItem('exams', JSON.stringify(exams))
    
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    return {
      ...exams[examIndex],
      subject: subjects.find(s => s.id === exams[examIndex].subject_id)
    }
  }

  async deleteExam(examId) {
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const exams = JSON.parse(localStorage.getItem('exams') || '[]')
    const filteredExams = exams.filter(exam => 
      !(exam.id === examId && exam.user_id === currentUser.id)
    )

    localStorage.setItem('exams', JSON.stringify(filteredExams))
    return { message: 'Exam deleted successfully' }
  }

  // Study Plan endpoints
  async generateStudyPlan(planData) {
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const subjects = await this.getSubjects()
    const exams = await this.getExams()
    
    if (subjects.length === 0) {
      throw new Error('Please add subjects first')
    }

    // Smart study plan generation with minimum 30 minutes per subject
    const studyPlans = []
    const startDate = new Date(planData.start_date)
    const endDate = new Date(planData.end_date)
    const dailyHours = parseFloat(planData.daily_study_hours)
    const minHoursPerSubject = 0.5 // 30 minutes minimum

    // Calculate how many subjects can fit in daily hours
    const maxSubjectsPerDay = Math.floor(dailyHours / minHoursPerSubject)
    
    // If too many subjects, rotate them across days
    const subjectsPerDay = Math.min(subjects.length, maxSubjectsPerDay)
    
    let currentDate = new Date(startDate)
    let planId = this.generateId('study_plans')
    let subjectIndex = 0

    while (currentDate <= endDate) {
      // Skip weekends (optional)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Select subjects for this day
        const todaySubjects = []
        for (let i = 0; i < subjectsPerDay; i++) {
          todaySubjects.push(subjects[subjectIndex % subjects.length])
          subjectIndex++
        }

        // Allocate time based on exam proximity
        const allocations = this.allocateStudyTime(todaySubjects, exams, dailyHours, currentDate)
        
        allocations.forEach((allocation) => {
          studyPlans.push({
            id: planId++,
            user_id: currentUser.id,
            subject_id: allocation.subject.id,
            study_date: currentDate.toISOString().split('T')[0],
            planned_hours: allocation.hours,
            topic: allocation.topic,
            description: allocation.description,
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

  allocateStudyTime(subjects, exams, totalHours, currentDate) {
    const minHours = 0.5 // 30 minutes minimum
    const allocations = []

    // Calculate priority based on exam dates
    const subjectPriorities = subjects.map(subject => {
      const subjectExams = exams.filter(exam => exam.subject_id === subject.id)
      if (subjectExams.length === 0) return { subject, priority: 1, daysUntilExam: 999 }

      // Find closest exam
      const closestExam = subjectExams.reduce((closest, exam) => {
        const examDate = new Date(exam.exam_date)
        const daysUntil = Math.ceil((examDate - currentDate) / (1000 * 60 * 60 * 24))
        return daysUntil < closest.daysUntil ? { daysUntil, exam } : closest
      }, { daysUntil: 999 })

      // Higher priority for closer exams
      const priority = closestExam.daysUntil <= 7 ? 3 : closestExam.daysUntil <= 14 ? 2 : 1
      return { subject, priority, daysUntilExam: closestExam.daysUntil }
    })

    // Calculate total priority points
    const totalPriority = subjectPriorities.reduce((sum, sp) => sum + sp.priority, 0)

    // Allocate time based on priority, ensuring minimum 30 minutes
    let remainingHours = totalHours
    subjectPriorities.forEach((sp, index) => {
      let hours
      if (index === subjectPriorities.length - 1) {
        // Last subject gets remaining time
        hours = Math.max(minHours, remainingHours)
      } else {
        // Allocate based on priority
        hours = Math.max(minHours, (totalHours * sp.priority) / totalPriority)
        hours = Math.round(hours * 4) / 4 // Round to nearest 15 minutes
      }
      
      remainingHours -= hours

      const topic = sp.daysUntilExam <= 7 
        ? `Exam Prep - ${sp.subject.name}` 
        : `Study Session - ${sp.subject.name}`
      
      const description = sp.daysUntilExam <= 7
        ? `Focus on exam preparation (${sp.daysUntilExam} days until exam)`
        : `Regular study session`

      allocations.push({
        subject: sp.subject,
        hours: hours,
        topic: topic,
        description: description
      })
    })

    return allocations
  }

  async updateStudyPlan(studyPlanId, updateData) {
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const planIndex = studyPlans.findIndex(plan => 
      plan.id === studyPlanId && plan.user_id === currentUser.id
    )

    if (planIndex === -1) {
      throw new Error('Study plan not found')
    }

    // Update the plan
    studyPlans[planIndex] = {
      ...studyPlans[planIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    }

    localStorage.setItem('study_plans', JSON.stringify(studyPlans))

    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    return {
      ...studyPlans[planIndex],
      subject: subjects.find(s => s.id === studyPlans[planIndex].subject_id)
    }
  }

  async deleteStudyPlan(studyPlanId) {
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const filteredPlans = studyPlans.filter(plan => 
      !(plan.id === studyPlanId && plan.user_id === currentUser.id)
    )

    localStorage.setItem('study_plans', JSON.stringify(filteredPlans))
    return { message: 'Study plan deleted successfully' }
  }

  async getTodayTasks() {
    const currentUser = this.getCurrentUserFromToken()
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

  async getStudyPlans() {
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')

    return studyPlans
      .filter(plan => plan.user_id === currentUser.id)
      .map(plan => ({
        ...plan,
        subject: subjects.find(s => s.id === plan.subject_id)
      }))
      .sort((a, b) => new Date(a.study_date) - new Date(b.study_date))
  }

  async getUpcomingTasks() {
    const currentUser = this.getCurrentUserFromToken()
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
    const currentUser = this.getCurrentUserFromToken()
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
    const currentUser = this.getCurrentUserFromToken()
    if (!currentUser) throw new Error('Not authenticated')

    const progress = JSON.parse(localStorage.getItem('progress') || '[]')
    return progress
      .filter(record => record.user_id === currentUser.id)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
  }

  async createProgress(progressData) {
    const currentUser = this.getCurrentUserFromToken()
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
    const currentUser = this.getCurrentUserFromToken()
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