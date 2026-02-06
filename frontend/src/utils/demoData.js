// Demo data for the application
export const initializeDemoData = () => {
  // Only initialize if no data exists
  if (localStorage.getItem('demo_initialized')) {
    return
  }

  // Demo users
  const demoUsers = [
    {
      id: 1,
      name: 'Demo Student',
      email: 'student@example.com',
      password: 'password123',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      created_at: new Date().toISOString()
    }
  ]

  // Demo subjects for user 1
  const demoSubjects = [
    {
      id: 1,
      user_id: 1,
      name: 'Mathematics',
      description: 'Calculus and Linear Algebra',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 1,
      name: 'Computer Science',
      description: 'Data Structures and Algorithms',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      user_id: 1,
      name: 'Physics',
      description: 'Quantum Mechanics',
      created_at: new Date().toISOString()
    }
  ]

  // Demo exams
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 7)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 14)

  const demoExams = [
    {
      id: 1,
      user_id: 1,
      subject_id: 1,
      exam_name: 'Midterm Exam',
      exam_date: tomorrow.toISOString().split('T')[0],
      priority_level: 'high',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 1,
      subject_id: 2,
      exam_name: 'Final Project',
      exam_date: nextWeek.toISOString().split('T')[0],
      priority_level: 'medium',
      created_at: new Date().toISOString()
    }
  ]

  // Demo study plans for today and next few days
  const today = new Date()
  const demoStudyPlans = []
  let planId = 1

  for (let i = 0; i < 5; i++) {
    const studyDate = new Date(today)
    studyDate.setDate(today.getDate() + i)
    
    demoSubjects.forEach((subject, index) => {
      demoStudyPlans.push({
        id: planId++,
        user_id: 1,
        subject_id: subject.id,
        study_date: studyDate.toISOString().split('T')[0],
        planned_hours: 1.5 + (index * 0.5), // 1.5, 2.0, 2.5 hours
        topic: `Chapter ${i + 1}`,
        description: `Study ${subject.name} - Chapter ${i + 1}`,
        is_completed: i === 0 && index === 0, // Mark first task as completed
        created_at: new Date().toISOString(),
        completed_at: i === 0 && index === 0 ? new Date().toISOString() : null
      })
    })
  }

  // Demo progress records
  const demoProgress = [
    {
      id: 1,
      user_id: 1,
      study_plan_id: 1,
      actual_hours: 1.5,
      notes: 'Completed chapter 1 exercises',
      completed_at: new Date().toISOString()
    }
  ]

  // Save to localStorage
  localStorage.setItem('users', JSON.stringify(demoUsers))
  localStorage.setItem('subjects', JSON.stringify(demoSubjects))
  localStorage.setItem('exams', JSON.stringify(demoExams))
  localStorage.setItem('study_plans', JSON.stringify(demoStudyPlans))
  localStorage.setItem('progress', JSON.stringify(demoProgress))
  localStorage.setItem('demo_initialized', 'true')
}

// Reset demo data (for development)
export const resetDemoData = () => {
  localStorage.removeItem('users')
  localStorage.removeItem('subjects')
  localStorage.removeItem('exams')
  localStorage.removeItem('study_plans')
  localStorage.removeItem('progress')
  localStorage.removeItem('demo_initialized')
  localStorage.removeItem('token')
  
  initializeDemoData()
  console.log('Demo data reset!')
}