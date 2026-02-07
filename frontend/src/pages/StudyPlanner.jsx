import { useState, useEffect } from 'react'
import { studyService } from '../services/studyService'
import { useForm } from 'react-hook-form'
import { Calendar, Clock, BookOpen, AlertCircle, Zap } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { formatHoursMinutes, decimalToHoursMinutes, parseToDecimalHours } from '../utils/timeUtils'
import toast from 'react-hot-toast'

function StudyPlanner() {
  const [subjects, setSubjects] = useState([])
  const [exams, setExams] = useState([])
  const [studyPlans, setStudyPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      daily_hours: 4,
      daily_minutes: 0,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), 14), 'yyyy-MM-dd')
    }
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [subjectsData, examsData] = await Promise.all([
        studyService.getSubjects(),
        studyService.getUpcomingExams()
      ])
      setSubjects(subjectsData)
      setExams(examsData)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    setGenerating(true)
    try {
      const dailyStudyHours = parseToDecimalHours(data.daily_hours, data.daily_minutes)
      
      const planData = {
        daily_study_hours: dailyStudyHours,
        start_date: data.start_date,
        end_date: data.end_date
      }
      
      const plans = await studyService.generateStudyPlan(planData)
      setStudyPlans(plans)
      
      // Calculate total hours
      const totalHours = plans.reduce((sum, p) => sum + parseFloat(p.planned_hours), 0)
      toast.success(`Generated ${plans.length} study sessions (${formatHoursMinutes(totalHours)} total)!`)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate study plan')
    } finally {
      setGenerating(false)
    }
  }

  const loadExistingPlans = async () => {
    setLoading(true)
    try {
      const plans = await studyService.getStudyPlans()
      setStudyPlans(plans)
      toast.success(`Loaded ${plans.length} existing study sessions`)
    } catch (error) {
      toast.error('Failed to load existing plans')
    } finally {
      setLoading(false)
    }
  }

  const clearAllPlans = () => {
    if (window.confirm('Are you sure you want to clear all study plans? This cannot be undone.')) {
      setStudyPlans([])
      toast.success('All plans cleared. Generate a new plan to start fresh!')
    }
  }

  const groupPlansByDate = (plans) => {
    const grouped = {}
    plans.forEach(plan => {
      const date = plan.study_date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(plan)
    })
    return grouped
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject ? subject.name : 'Unknown Subject'
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  const groupedPlans = groupPlansByDate(studyPlans)

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Study Planner</h1>

      {/* Warnings */}
      {subjects.length === 0 && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
            <p style={{ color: '#92400e' }}>
              You need to add subjects first before generating a study plan.
            </p>
          </div>
        </div>
      )}

      {/* Study Plan Generator */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} />
          Generate Study Plan
        </h3>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-3">
            <div className="form-group">
              <label className="form-label">Daily Study Time</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    className="form-input"
                    placeholder="Hours"
                    {...register('daily_hours', { 
                      required: 'Hours is required',
                      min: { value: 0, message: 'Minimum 0 hours' },
                      max: { value: 12, message: 'Maximum 12 hours' }
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
                    {...register('daily_minutes', { 
                      min: { value: 0, message: 'Minimum 0 minutes' },
                      max: { value: 59, message: 'Maximum 59 minutes' }
                    })}
                  />
                  <small style={{ color: '#6b7280' }}>Minutes</small>
                </div>
              </div>
              {(errors.daily_hours || errors.daily_minutes) && (
                <div className="error">
                  {errors.daily_hours?.message || errors.daily_minutes?.message}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                {...register('start_date', { required: 'Start date is required' })}
              />
              {errors.start_date && <div className="error">{errors.start_date.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                {...register('end_date', { required: 'End date is required' })}
              />
              {errors.end_date && <div className="error">{errors.end_date.message}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={generating || subjects.length === 0}
            >
              {generating ? 'Generating...' : 'Generate Plan'}
            </button>
            
            <button 
              type="button"
              onClick={loadExistingPlans}
              className="btn btn-secondary"
            >
              Load Existing Plans
            </button>

            {studyPlans.length > 0 && (
              <button 
                type="button"
                onClick={clearAllPlans}
                className="btn btn-danger"
              >
                Clear All Plans
              </button>
            )}
          </div>
        </form>

        {/* Plan Generation Info */}
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>How it works:</h4>
          <ul style={{ color: '#6b7280', fontSize: '0.875rem', paddingLeft: '1.5rem' }}>
            <li>Prioritizes subjects with upcoming exams</li>
            <li>Allocates more time to high-priority exams</li>
            <li>Balances workload across available days</li>
            <li>Creates structured daily study sessions</li>
          </ul>
        </div>
      </div>

      {/* Upcoming Exams Summary */}
      {exams.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Upcoming Exams</h3>
          <div className="grid grid-3">
            {exams.slice(0, 6).map((exam) => (
              <div key={exam.id} style={{ 
                padding: '1rem', 
                backgroundColor: '#f9fafb', 
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{exam.exam_name}</h4>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {format(new Date(exam.exam_date), 'MMM dd, yyyy')}
                </p>
                <span style={{ 
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: exam.priority_level === 'high' ? '#fee2e2' : 
                                 exam.priority_level === 'medium' ? '#fef3c7' : '#dcfce7',
                  color: exam.priority_level === 'high' ? '#dc2626' : 
                         exam.priority_level === 'medium' ? '#d97706' : '#16a34a'
                }}>
                  {exam.priority_level} priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Study Plans */}
      {studyPlans.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Study Schedule</h3>
          
          {Object.keys(groupedPlans).sort().map((date) => (
            <div key={date} style={{ marginBottom: '2rem' }}>
              <h4 style={{ 
                marginBottom: '1rem', 
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Calendar size={16} />
                {format(new Date(date), 'EEEE, MMM dd, yyyy')}
              </h4>
              
              <div className="grid grid-2">
                {groupedPlans[date].map((plan) => (
                  <div key={plan.id} style={{ 
                    padding: '1rem', 
                    backgroundColor: plan.is_completed ? '#f0fdf4' : '#f9fafb', 
                    borderRadius: '6px',
                    border: `1px solid ${plan.is_completed ? '#bbf7d0' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ marginBottom: '0.25rem', color: '#1f2937' }}>
                          {getSubjectName(plan.subject_id)}
                        </h5>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          {plan.topic}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={14} style={{ color: '#6b7280' }} />
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {formatHoursMinutes(plan.planned_hours)}
                          </span>
                        </div>
                        {plan.description && (
                          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                            {plan.description}
                          </p>
                        )}
                      </div>
                      
                      {plan.is_completed && (
                        <div style={{ color: '#10b981', fontSize: '0.75rem' }}>
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {studyPlans.length === 0 && !generating && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpen size={64} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No study plan generated</h3>
          <p style={{ color: '#9ca3af' }}>
            Generate your personalized study plan based on your subjects and exams.
          </p>
        </div>
      )}
    </div>
  )
}

export default StudyPlanner