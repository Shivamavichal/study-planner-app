// Demo data for the application
export const initializeDemoData = () => {
  // Check if users exist, if not initialize
  const existingUsers = localStorage.getItem('users')
  
  if (!existingUsers) {
    // First time initialization - create empty arrays
    localStorage.setItem('users', JSON.stringify([]))
    localStorage.setItem('subjects', JSON.stringify([]))
    localStorage.setItem('exams', JSON.stringify([]))
    localStorage.setItem('study_plans', JSON.stringify([]))
    localStorage.setItem('progress', JSON.stringify([]))
  }

  // Check if demo user exists
  const users = JSON.parse(localStorage.getItem('users') || '[]')
  const demoUserExists = users.find(u => u.email === 'student@example.com')
  
  if (demoUserExists) {
    return // Demo user already set up
  }

  // Create demo user
  const demoUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name: 'Demo Student',
    email: 'student@example.com',
    password: 'password123',
    created_at: new Date().toISOString()
  }
  
  users.push(demoUser)
  localStorage.setItem('users', JSON.stringify(users))

  // Get existing data
  const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
  const exams = JSON.parse(localStorage.getItem('exams') || '[]')
  const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
  const progress = JSON.parse(localStorage.getItem('progress') || '[]')

  // Generate IDs
  const getNextId = (arr) => arr.length > 0 ? Math.max(...arr.map(item => item.id)) + 1 : 1

  // Demo subjects for demo user
  const demoSubjects = [
    {
      id: getNextId(subjects),
      user_id: demoUser.id,
      name: 'Mathematics',
      description: 'Calculus and Linear Algebra',
      created_at: new Date().toISOString()
    },
    {
      id: getNextId(subjects) + 1,
      user_id: demoUser.id,
      name: 'Computer Science',
      description: 'Data Structures and Algorithms',
      created_at: new Date().toISOString()
    },
    {
      id: getNextId(subjects) + 2,
      user_id: demoUser.id,
      name: 'Physics',
      description: 'Quantum Mechanics',
      created_at: new Date().toISOString()
    }
  ]

  subjects.push(...demoSubjects)
  localStorage.setItem('subjects', JSON.stringify(subjects))

  // Demo exams
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 7)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 14)

  const demoExams = [
    {
      id: getNextId(exams),
      user_id: demoUser.id,
      subject_id: demoSubjects[0].id,
      exam_name: 'Midterm Exam',
      exam_date: tomorrow.toISOString().split('T')[0],
      priority_level: 'high',
      created_at: new Date().toISOString()
    },
    {
      id: getNextId(exams) + 1,
      user_id: demoUser.id,
      subject_id: demoSubjects[1].id,
      exam_name: 'Final Project',
      exam_date: nextWeek.toISOString().split('T')[0],
      priority_level: 'medium',
      created_at: new Date().toISOString()
    }
  ]

  exams.push(...demoExams)
  localStorage.setItem('exams', JSON.stringify(exams))

  // Demo study plans for today and next few days
  const today = new Date()
  const demoStudyPlansData = []
  let planIdCounter = 0

  for (let i = 0; i < 5; i++) {
    const studyDate = new Date(today)
    studyDate.setDate(today.getDate() + i)
    
    demoSubjects.forEach((subject, index) => {
      demoStudyPlansData.push({
        id: getNextId(studyPlans) + planIdCounter++,
        user_id: demoUser.id,
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

  studyPlans.push(...demoStudyPlansData)
  localStorage.setItem('study_plans', JSON.stringify(studyPlans))

  // Demo progress records
  const demoProgressData = [
    {
      id: getNextId(progress),
      user_id: demoUser.id,
      study_plan_id: demoStudyPlansData[0].id,
      actual_hours: 1.5,
      notes: 'Completed chapter 1 exercises',
      completed_at: new Date().toISOString()
    }
  ]

  progress.push(...demoProgressData)
  localStorage.setItem('progress', JSON.stringify(progress))
}

// Reset all data (for development/testing)
export const resetAllData = () => {
  localStorage.clear()
  console.log('All data cleared!')
}

// Reset demo data only (keeps other users)
export const resetDemoData = () => {
  const users = JSON.parse(localStorage.getItem('users') || '[]')
  const demoUser = users.find(u => u.email === 'student@example.com')
  
  if (!demoUser) {
    console.log('Demo user not found')
    return
  }

  // Remove demo user's data
  const subjects = JSON.parse(localStorage.getItem('subjects') || '[]')
  const exams = JSON.parse(localStorage.getItem('exams') || '[]')
  const studyPlans = JSON.parse(localStorage.getItem('study_plans') || '[]')
  const progress = JSON.parse(localStorage.getItem('progress') || '[]')

  localStorage.setItem('subjects', JSON.stringify(subjects.filter(s => s.user_id !== demoUser.id)))
  localStorage.setItem('exams', JSON.stringify(exams.filter(e => e.user_id !== demoUser.id)))
  localStorage.setItem('study_plans', JSON.stringify(studyPlans.filter(p => p.user_id !== demoUser.id)))
  localStorage.setItem('progress', JSON.stringify(progress.filter(p => p.user_id !== demoUser.id)))
  
  // Remove demo user
  localStorage.setItem('users', JSON.stringify(users.filter(u => u.email !== 'student@example.com')))
  
  // Re-initialize demo data
  initializeDemoData()
  console.log('Demo data reset!')
}