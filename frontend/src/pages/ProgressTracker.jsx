import { useState, useEffect } from 'react'
import { studyService } from '../services/studyService'
import { useForm } from 'react-hook-form'
import { Plus, Clock, CheckCircle, TrendingUp, Calendar, Lock } from 'lucide-react'
import { format, isToday, isTomorrow, addDays } from 'date-fns'
import { formatHoursMinutes, decimalToHoursMinutes, parseToDecimalHours } from '../utils/timeUtils'
import toast from 'react-hot-toast'

function ProgressTracker() {
  const [progress, setProgress] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [progressData, upcomingTasksData] = await Promise.all([
        studyService.getProgress(),
        studyService.getUpcomingTasks()
      ])
      setProgress(progressData)
      setUpcomingTasks(upcomingTasksData)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      const actualHours = parseToDecimalHours(data.hours, data.minutes)
      
      const progressData = {
        study_plan_id: selectedTask.id,
        actual_hours: actualHours,
        notes: data.notes
      }
      
      await studyService.createProgress(progressData)
      toast.success('Progress recorded successfully!')
      
      reset()
      setShowForm(false)
      setSelectedTask(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record progress')
    }
  }

  const handleRecordProgress = (task) => {
    setSelectedTask(task)
    const { hours, minutes } = decimalToHoursMinutes(task.planned_hours)
    reset({
      hours: hours,
      minutes: minutes,
      notes: ''
    })
    setShowForm(true)
  }

  const handleCompleteTask = async (taskId, canComplete, taskDate) => {
    if (!canComplete) {
      const taskDateObj = new Date(taskDate)
      const today = new Date()
      
      if (taskDateObj > today) {
        const dateStr = format(taskDateObj, 'MMMM dd, yyyy')
        toast.error(`You can only complete this task on or after ${dateStr}`)
      } else {
        toast.error('This task cannot be completed yet!')
      }
      return
    }
    
    try {
      await studyService.markStudyPlanCompleted(taskId)
      toast.success('Task completed! Study hours added to your total automatically.')
      loadData()
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to complete task'
      toast.error(errorMessage)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setSelectedTask(null)
    reset()
  }

  const calculateTotalHours = () => {
    return progress.reduce((total, record) => total + parseFloat(record.actual_hours), 0)
  }

  const getCompletionRate = () => {
    const todayTasks = upcomingTasks.filter(task => {
      const taskDate = new Date(task.study_date)
      return isToday(taskDate)
    })
    if (todayTasks.length === 0) return 0
    const completed = todayTasks.filter(task => task.is_completed).length
    return Math.round((completed / todayTasks.length) * 100)
  }

  const groupTasksByDate = (tasks) => {
    const grouped = {}
    const today = new Date()
    const dayAfterTomorrow = addDays(today, 2)
    
    tasks.forEach(task => {
      const taskDate = new Date(task.study_date)
      let dateKey = 'other'
      let dateLabel = format(taskDate, 'MMM dd, yyyy')
      
      if (isToday(taskDate)) {
        dateKey = 'today'
        dateLabel = 'Today'
      } else if (isTomorrow(taskDate)) {
        dateKey = 'tomorrow'
        dateLabel = 'Tomorrow'
      } else if (taskDate.getTime() === dayAfterTomorrow.getTime()) {
        dateKey = 'dayAfter'
        dateLabel = 'Day After Tomorrow'
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          label: dateLabel,
          tasks: [],
          date: taskDate
        }
      }
      grouped[dateKey].tasks.push(task)
    })
    
    return grouped
  }

  const getDateLabel = (dateKey) => {
    switch (dateKey) {
      case 'today': return 'Today'
      case 'tomorrow': return 'Tomorrow'
      case 'dayAfter': return 'Day After Tomorrow'
      default: return dateKey
    }
  }

  const getDateColor = (dateKey) => {
    switch (dateKey) {
      case 'today': return '#3b82f6'
      case 'tomorrow': return '#f59e0b'
      case 'dayAfter': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  const groupedTasks = groupTasksByDate(upcomingTasks)

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Progress Tracker</h1>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <Clock size={32} style={{ color: '#3b82f6', margin: '0 auto 1rem' }} />
          <div className="stat-number">{formatHoursMinutes(calculateTotalHours())}</div>
          <div className="stat-label">Total Hours Studied</div>
        </div>

        <div className="stat-card">
          <CheckCircle size={32} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
          <div className="stat-number">{progress.length}</div>
          <div className="stat-label">Sessions Completed</div>
        </div>

        <div className="stat-card">
          <TrendingUp size={32} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
          <div className="stat-number">{getCompletionRate()}%</div>
          <div className="stat-label">Today's Completion</div>
        </div>

        <div className="stat-card">
          <Calendar size={32} style={{ color: '#8b5cf6', margin: '0 auto 1rem' }} />
          <div className="stat-number">{upcomingTasks.length}</div>
          <div className="stat-label">Upcoming Tasks</div>
        </div>
      </div>

      {/* Progress Form */}
      {showForm && selectedTask && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>Record Progress for: {selectedTask.subject_name} - {selectedTask.topic}</h3>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Actual Time Studied</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="form-input"
                    placeholder="Hours"
                    {...register('hours', { 
                      required: 'Hours is required',
                      min: { value: 0, message: 'Hours cannot be negative' },
                      max: { value: 23, message: 'Maximum 23 hours' }
                    })}
                  />
                  <small style={{ color: '#6b7280' }}>Hours</small>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="form-input"
                    placeholder="Minutes"
                    {...register('minutes', { 
                      min: { value: 0, message: 'Minutes cannot be negative' },
                      max: { value: 59, message: 'Maximum 59 minutes' }
                    })}
                  />
                  <small style={{ color: '#6b7280' }}>Minutes</small>
                </div>
              </div>
              {(errors.hours || errors.minutes) && (
                <div className="error">
                  {errors.hours?.message || errors.minutes?.message}
                </div>
              )}
              <small style={{ color: '#6b7280' }}>
                Planned: {formatHoursMinutes(selectedTask.planned_hours)}
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="form-textarea"
                placeholder="What did you accomplish? Any challenges or insights?"
                {...register('notes')}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Record Progress
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming Study Tasks */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Upcoming Study Tasks</h3>
        
        {upcomingTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No upcoming study tasks scheduled.</p>
            <p style={{ fontSize: '0.875rem' }}>
              Visit the Study Planner to create your schedule.
            </p>
          </div>
        ) : (
          <div>
            {/* Ensure proper ordering: Today, Tomorrow, Day After Tomorrow */}
            {['today', 'tomorrow', 'dayAfter'].map((dateKey) => {
              if (!groupedTasks[dateKey]) return null
              
              return (
                <div key={dateKey} style={{ marginBottom: '2rem' }}>
                  <h4 style={{ 
                    marginBottom: '1rem', 
                    color: getDateColor(dateKey),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    <Calendar size={18} />
                    {getDateLabel(dateKey)} ({groupedTasks[dateKey].tasks.length} tasks)
                  </h4>
                  
                  {groupedTasks[dateKey].tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`task-item ${task.is_completed ? 'task-completed' : ''}`}
                      style={{ 
                        marginBottom: '0.75rem',
                        borderLeft: `4px solid ${getDateColor(dateKey)}`,
                        opacity: task.can_complete ? 1 : 0.6
                      }}
                    >
                      <div className="task-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4>{task.subject_name} - {task.topic}</h4>
                          {!task.can_complete && !task.is_completed && (
                            <Lock size={16} style={{ color: '#ef4444' }} title={
                            new Date(task.study_date) > new Date() 
                              ? `Available on ${format(new Date(task.study_date), 'MMM dd, yyyy')}`
                              : 'Cannot complete yet'
                          } />
                          )}
                        </div>
                        <p>{formatHoursMinutes(task.planned_hours)} planned</p>
                        {task.description && (
                          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#6b7280' }}>
                            {task.description}
                          </p>
                        )}
                        {!task.can_complete && !task.is_completed && (
                          <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                            {new Date(task.study_date) > new Date() 
                              ? `Available on ${format(new Date(task.study_date), 'MMMM dd, yyyy')}`
                              : 'Cannot complete yet'
                            }
                          </p>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!task.is_completed && (
                          <>
                            <button
                              onClick={() => handleRecordProgress(task)}
                              className="btn btn-primary"
                              disabled={!task.can_complete}
                              style={{ 
                                opacity: task.can_complete ? 1 : 0.5,
                                cursor: task.can_complete ? 'pointer' : 'not-allowed'
                              }}
                            >
                              <Plus size={16} />
                              Record Progress
                            </button>
                            <button
                              onClick={() => handleCompleteTask(task.id, task.can_complete, task.study_date)}
                              className="btn btn-success"
                              disabled={!task.can_complete}
                              style={{ 
                                opacity: task.can_complete ? 1 : 0.5,
                                cursor: task.can_complete ? 'pointer' : 'not-allowed'
                              }}
                            >
                              <CheckCircle size={16} />
                              Complete
                            </button>
                          </>
                        )}
                        
                        {task.is_completed && (
                          <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Progress History */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Progress History</h3>
        
        {progress.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <TrendingUp size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No progress recorded yet.</p>
            <p style={{ fontSize: '0.875rem' }}>
              Complete study tasks to start tracking your progress.
            </p>
          </div>
        ) : (
          <div>
            {progress.map((record) => (
              <div key={record.id} style={{ 
                padding: '1rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px', 
                marginBottom: '1rem',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                      Study Session Completed
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        <Clock size={14} style={{ marginRight: '0.25rem' }} />
                        {formatHoursMinutes(record.actual_hours)} studied
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {format(new Date(record.completed_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {record.notes && (
                      <p style={{ fontSize: '0.875rem', color: '#374151', fontStyle: 'italic' }}>
                        "{record.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProgressTracker