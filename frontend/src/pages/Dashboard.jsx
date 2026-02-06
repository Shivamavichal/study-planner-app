import { useState, useEffect } from 'react'
import { studyService } from '../services/studyService'
import { BookOpen, Calendar, CheckCircle, Clock } from 'lucide-react'
import { formatHoursMinutes } from '../utils/timeUtils'
import toast from 'react-hot-toast'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [todayTasks, setTodayTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, tasksData] = await Promise.all([
        studyService.getDashboardStats(),
        studyService.getDashboardTasks()
      ])
      setStats(statsData)
      setTodayTasks(tasksData)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId) => {
    try {
      await studyService.markStudyPlanCompleted(taskId)
      toast.success('Task completed! Study hours added to your total automatically.')
      loadDashboardData() // Refresh data
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to complete task'
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: '#1f2937' }}>Dashboard</h1>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <BookOpen size={32} style={{ color: '#3b82f6', margin: '0 auto 1rem' }} />
          <div className="stat-number">{stats?.total_subjects || 0}</div>
          <div className="stat-label">Total Subjects</div>
        </div>

        <div className="stat-card">
          <Calendar size={32} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
          <div className="stat-number">{stats?.upcoming_exams || 0}</div>
          <div className="stat-label">Upcoming Exams</div>
        </div>

        <div className="stat-card">
          <CheckCircle size={32} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
          <div className="stat-number">{stats?.completed_tasks_today || 0}</div>
          <div className="stat-label">Completed Today</div>
        </div>

        <div className="stat-card">
          <Clock size={32} style={{ color: '#8b5cf6', margin: '0 auto 1rem' }} />
          <div className="stat-number">{formatHoursMinutes(stats?.total_study_hours_today || 0)}</div>
          <div className="stat-label">Hours Planned Today</div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Today's Progress</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.completion_percentage}%` }}
            ></div>
          </div>
          <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            {Math.round(stats.completion_percentage)}% completed
          </p>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Today's Study Tasks</h3>
        
        {todayTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No study tasks scheduled for today.</p>
            <p style={{ fontSize: '0.875rem' }}>
              Visit the Study Planner to create your schedule.
            </p>
          </div>
        ) : (
          <div>
            {todayTasks.map((task) => (
              <div 
                key={task.id} 
                className={`task-item ${task.is_completed ? 'task-completed' : ''}`}
              >
                <div className="task-info">
                  <h4>{task.subject_name} - {task.topic}</h4>
                  <p>{formatHoursMinutes(task.planned_hours)} planned</p>
                  {task.description && (
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {task.description}
                    </p>
                  )}
                </div>
                
                {!task.is_completed && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="btn btn-success"
                  >
                    <CheckCircle size={16} />
                    Complete
                  </button>
                )}
                
                {task.is_completed && (
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} />
                    Completed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard