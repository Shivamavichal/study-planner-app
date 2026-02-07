import { useState, useEffect } from 'react'
import { studyService } from '../services/studyService'
import { authService } from '../services/authService'
import { agentService } from '../services/agentService'
import { 
  User, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Target,
  Award,
  Flame,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { formatHoursMinutes } from '../utils/timeUtils'
import { format } from 'date-fns'

function Sidebar() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [todayTasks, setTodayTasks] = useState([])
  const [upcomingExams, setUpcomingExams] = useState([])
  const [progressAnalysis, setProgressAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSidebarData()
    
    // Refresh every 2 minutes
    const interval = setInterval(loadSidebarData, 120000)
    return () => clearInterval(interval)
  }, [])

  const loadSidebarData = async () => {
    try {
      const [userData, statsData, tasksData, examsData] = await Promise.all([
        authService.getCurrentUser(),
        studyService.getDashboardStats(),
        studyService.getDashboardTasks(),
        studyService.getExams()
      ])
      
      setUser(userData)
      setStats(statsData)
      setTodayTasks(tasksData)
      
      // Get upcoming exams (next 7 days)
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)
      
      const upcoming = examsData.filter(exam => {
        const examDate = new Date(exam.exam_date)
        return examDate >= today && examDate <= nextWeek
      }).sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
      
      setUpcomingExams(upcoming.slice(0, 3))
      
      // Get progress analysis
      if (userData) {
        const analysis = agentService.analyzeProgress(userData.id)
        setProgressAnalysis(analysis)
      }
    } catch (error) {
      console.error('Failed to load sidebar data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="sidebar">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  const completedToday = todayTasks.filter(t => t.is_completed).length
  const totalToday = todayTasks.length
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  return (
    <div className="sidebar">
      {/* User Profile */}
      <div className="sidebar-section" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user?.name || 'Student'}</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>
              {user?.email}
            </p>
          </div>
        </div>
        
        {/* Study Streak */}
        {progressAnalysis && progressAnalysis.currentStreak > 0 && (
          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '0.75rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Flame size={20} style={{ color: '#fbbf24' }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                {progressAnalysis.currentStreak} Days
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Study Streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Progress */}
      <div className="sidebar-section">
        <h4 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '1rem',
          color: '#374151'
        }}>
          <Target size={18} />
          Today's Progress
        </h4>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <span style={{ color: '#6b7280' }}>Tasks Completed</span>
            <span style={{ fontWeight: '600', color: '#3b82f6' }}>
              {completedToday}/{totalToday}
            </span>
          </div>
          <div style={{ 
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%',
              width: `${completionRate}%`,
              backgroundColor: completionRate === 100 ? '#10b981' : '#3b82f6',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ 
            textAlign: 'center',
            marginTop: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: completionRate === 100 ? '#10b981' : '#3b82f6'
          }}>
            {completionRate}%
          </div>
        </div>

        {/* Today's Tasks */}
        {todayTasks.length > 0 ? (
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {todayTasks.slice(0, 3).map((task) => (
              <div 
                key={task.id}
                style={{ 
                  padding: '0.5rem',
                  backgroundColor: task.is_completed ? '#f0fdf4' : '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  borderLeft: `3px solid ${task.is_completed ? '#10b981' : '#3b82f6'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {task.is_completed ? (
                    <CheckCircle size={14} style={{ color: '#10b981' }} />
                  ) : (
                    <Clock size={14} style={{ color: '#3b82f6' }} />
                  )}
                  <span style={{ 
                    fontSize: '0.75rem',
                    color: '#374151',
                    flex: 1,
                    textDecoration: task.is_completed ? 'line-through' : 'none'
                  }}>
                    {task.subject_name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {formatHoursMinutes(task.planned_hours)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
            No tasks for today
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="sidebar-section">
        <h4 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '1rem',
          color: '#374151'
        }}>
          <TrendingUp size={18} />
          Quick Stats
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ 
            padding: '0.75rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <BookOpen size={20} style={{ color: '#3b82f6', margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {stats?.total_subjects || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Subjects</div>
          </div>

          <div style={{ 
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Calendar size={20} style={{ color: '#f59e0b', margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats?.upcoming_exams || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Exams</div>
          </div>

          <div style={{ 
            padding: '0.75rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Clock size={20} style={{ color: '#10b981', margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
              {progressAnalysis?.totalHours || '0'}h
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Total Hours</div>
          </div>

          <div style={{ 
            padding: '0.75rem',
            backgroundColor: '#fce7f3',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Award size={20} style={{ color: '#ec4899', margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ec4899' }}>
              {progressAnalysis?.totalSessions || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Sessions</div>
          </div>
        </div>
      </div>

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <div className="sidebar-section">
          <h4 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#374151'
          }}>
            <AlertCircle size={18} />
            Upcoming Exams
          </h4>
          
          {upcomingExams.map((exam) => {
            const daysUntil = Math.ceil((new Date(exam.exam_date) - new Date()) / (1000 * 60 * 60 * 24))
            const isUrgent = daysUntil <= 3
            
            return (
              <div 
                key={exam.id}
                style={{ 
                  padding: '0.75rem',
                  backgroundColor: isUrgent ? '#fef2f2' : '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  borderLeft: `3px solid ${isUrgent ? '#ef4444' : '#f59e0b'}`
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  {exam.exam_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  {exam.subject?.name || 'Unknown Subject'}
                </div>
                <div style={{ 
                  fontSize: '0.7rem',
                  color: isUrgent ? '#ef4444' : '#f59e0b',
                  fontWeight: '600'
                }}>
                  {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Motivational Quote */}
      <div className="sidebar-section" style={{ 
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💪</div>
        <div style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
          "Success is the sum of small efforts repeated day in and day out."
        </div>
      </div>
    </div>
  )
}

export default Sidebar
