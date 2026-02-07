// Free Client-Side Agents - No AWS Required!
// These agents run in the browser using localStorage

class AgentService {
  constructor() {
    this.initializeAgents()
  }

  initializeAgents() {
    // Run agents periodically
    this.checkReminders()
    this.analyzeProgress()
    
    // Set up periodic checks (every 5 minutes)
    setInterval(() => {
      this.checkReminders()
      this.analyzeProgress()
    }, 5 * 60 * 1000)
  }

  // RECOMMENDATION AGENT - Suggests study improvements
  getRecommendations(userId) {
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    const exams = JSON.parse(localStorage.getItem('exams') || '[]')
    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const progress = JSON.parse(localStorage.getItem('progress') || '[]')

    const userSubjects = subjects.filter(s => s.user_id === userId)
    const userExams = exams.filter(e => e.user_id === userId)
    const userPlans = studyPlans.filter(p => p.user_id === userId)
    const userProgress = progress.filter(p => p.user_id === userId)

    const recommendations = []

    // Check for subjects without exams
    userSubjects.forEach(subject => {
      const hasExam = userExams.some(e => e.subject_id === subject.id)
      if (!hasExam) {
        recommendations.push({
          type: 'warning',
          title: 'No Exam Scheduled',
          message: `Consider scheduling an exam for ${subject.name}`,
          action: 'Add Exam',
          priority: 'medium'
        })
      }
    })

    // Check for upcoming exams without study plans
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    userExams.forEach(exam => {
      const examDate = new Date(exam.exam_date)
      if (examDate >= today && examDate <= nextWeek) {
        const hasPlans = userPlans.some(p => 
          p.subject_id === exam.subject_id && 
          new Date(p.study_date) <= examDate
        )
        if (!hasPlans) {
          recommendations.push({
            type: 'urgent',
            title: 'Urgent: Exam Next Week!',
            message: `${exam.exam_name} is in ${Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))} days. Create a study plan now!`,
            action: 'Create Plan',
            priority: 'high'
          })
        }
      }
    })

    // Check completion rate
    const completedPlans = userPlans.filter(p => p.is_completed).length
    const totalPlans = userPlans.length
    if (totalPlans > 0) {
      const completionRate = (completedPlans / totalPlans) * 100
      
      if (completionRate < 50) {
        recommendations.push({
          type: 'info',
          title: 'Low Completion Rate',
          message: `You've completed ${completionRate.toFixed(0)}% of your study tasks. Try breaking tasks into smaller chunks!`,
          action: 'View Progress',
          priority: 'medium'
        })
      } else if (completionRate > 80) {
        recommendations.push({
          type: 'success',
          title: 'Great Progress!',
          message: `Amazing! You've completed ${completionRate.toFixed(0)}% of your tasks. Keep up the excellent work!`,
          action: 'View Stats',
          priority: 'low'
        })
      }
    }

    // Check study consistency
    const last7Days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayPlans = userPlans.filter(p => p.study_date === dateStr && p.is_completed)
      last7Days.push(dayPlans.length)
    }

    const studiedDays = last7Days.filter(count => count > 0).length
    if (studiedDays < 3) {
      recommendations.push({
        type: 'warning',
        title: 'Study More Consistently',
        message: `You've only studied ${studiedDays} days this week. Try to study at least 5 days per week!`,
        action: 'Create Schedule',
        priority: 'medium'
      })
    }

    return recommendations
  }

  // REMINDER AGENT - Checks for tasks due today
  checkReminders() {
    const token = localStorage.getItem('token')
    if (!token) return []

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || token))
      const userId = payload.user_id

      const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
      const today = new Date().toISOString().split('T')[0]

      const todayTasks = studyPlans.filter(p => 
        p.user_id === userId && 
        p.study_date === today && 
        !p.is_completed
      )

      // Store reminders
      const reminders = todayTasks.map(task => {
        const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
        const subject = subjects.find(s => s.id === task.subject_id)
        
        return {
          id: task.id,
          title: 'Study Reminder',
          message: `Don't forget to study ${subject?.name || 'your subject'} - ${task.topic}`,
          time: new Date().toISOString(),
          taskId: task.id
        }
      })

      localStorage.setItem('active_reminders', JSON.stringify(reminders))
      return reminders
    } catch {
      return []
    }
  }

  getActiveReminders() {
    return JSON.parse(localStorage.getItem('active_reminders') || '[]')
  }

  dismissReminder(reminderId) {
    const reminders = this.getActiveReminders()
    const updated = reminders.filter(r => r.id !== reminderId)
    localStorage.setItem('active_reminders', JSON.stringify(updated))
  }

  // PROGRESS AGENT - Analyzes study patterns
  analyzeProgress(userId) {
    if (!userId) {
      const token = localStorage.getItem('token')
      if (!token) return null
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1] || token))
        userId = payload.user_id
      } catch {
        return null
      }
    }

    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
    const progress = JSON.parse(localStorage.getItem('progress') || '[]')
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')

    const userPlans = studyPlans.filter(p => p.user_id === userId)
    const userProgress = progress.filter(p => p.user_id === userId)

    // Calculate total study hours
    const totalHours = userProgress.reduce((sum, p) => sum + parseFloat(p.actual_hours || 0), 0)

    // Calculate by subject
    const subjectStats = {}
    subjects.filter(s => s.user_id === userId).forEach(subject => {
      const subjectPlans = userPlans.filter(p => p.subject_id === subject.id)
      const completed = subjectPlans.filter(p => p.is_completed).length
      const total = subjectPlans.length
      
      subjectStats[subject.name] = {
        completed,
        total,
        percentage: total > 0 ? (completed / total) * 100 : 0,
        hours: subjectPlans
          .filter(p => p.is_completed)
          .reduce((sum, p) => sum + parseFloat(p.planned_hours || 0), 0)
      }
    })

    // Calculate streak
    let currentStreak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const hasCompleted = userPlans.some(p => 
        p.study_date === dateStr && p.is_completed
      )
      
      if (hasCompleted) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }

    // Best study time analysis
    const hourCounts = {}
    userProgress.forEach(p => {
      const hour = new Date(p.completed_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    
    const bestHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b, 0
    )

    return {
      totalHours: totalHours.toFixed(1),
      totalSessions: userProgress.length,
      completionRate: userPlans.length > 0 
        ? ((userPlans.filter(p => p.is_completed).length / userPlans.length) * 100).toFixed(0)
        : 0,
      currentStreak,
      subjectStats,
      bestStudyTime: bestHour ? `${bestHour}:00 - ${parseInt(bestHour) + 1}:00` : 'Not enough data',
      insights: this.generateInsights(userPlans, userProgress, currentStreak)
    }
  }

  generateInsights(plans, progress, streak) {
    const insights = []

    if (streak >= 7) {
      insights.push(`🔥 Amazing ${streak}-day streak! You're on fire!`)
    } else if (streak >= 3) {
      insights.push(`💪 ${streak}-day streak! Keep it going!`)
    }

    const avgHoursPerSession = progress.length > 0
      ? progress.reduce((sum, p) => sum + parseFloat(p.actual_hours || 0), 0) / progress.length
      : 0

    if (avgHoursPerSession > 2) {
      insights.push('📚 You study for long sessions. Great focus!')
    } else if (avgHoursPerSession < 1 && progress.length > 0) {
      insights.push('⏰ Try longer study sessions for better retention')
    }

    const completedToday = plans.filter(p => 
      p.study_date === new Date().toISOString().split('T')[0] && 
      p.is_completed
    ).length

    if (completedToday > 0) {
      insights.push(`✅ ${completedToday} task${completedToday > 1 ? 's' : ''} completed today!`)
    }

    return insights
  }

  // PLANNER AGENT - Smart scheduling suggestions
  getSuggestedSchedule(userId, daysAhead = 7) {
    const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
    const exams = JSON.parse(localStorage.getItem('exams') || '[]')
    const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')

    const userSubjects = subjects.filter(s => s.user_id === userId)
    const userExams = exams.filter(e => e.user_id === userId)
    const userPlans = studyPlans.filter(p => p.user_id === userId)

    const suggestions = []
    const today = new Date()

    // Find subjects that need attention
    userSubjects.forEach(subject => {
      const subjectExams = userExams.filter(e => e.subject_id === subject.id)
      const upcomingExam = subjectExams.find(e => new Date(e.exam_date) > today)
      
      if (upcomingExam) {
        const daysUntilExam = Math.ceil((new Date(upcomingExam.exam_date) - today) / (1000 * 60 * 60 * 24))
        const existingPlans = userPlans.filter(p => 
          p.subject_id === subject.id && 
          new Date(p.study_date) >= today
        ).length

        if (daysUntilExam <= 7 && existingPlans < 3) {
          suggestions.push({
            subject: subject.name,
            reason: `Exam in ${daysUntilExam} days`,
            suggestedHours: 2,
            priority: 'high',
            days: Math.min(daysUntilExam, 5)
          })
        }
      }
    })

    return suggestions
  }
}

export const agentService = new AgentService()
