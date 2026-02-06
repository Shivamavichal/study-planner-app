import { useState, useEffect } from 'react'
import { studyService } from '../services/studyService'
import { useForm } from 'react-hook-form'
import { Plus, Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function Exams() {
  const [exams, setExams] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [examsData, subjectsData] = await Promise.all([
        studyService.getExams(),
        studyService.getSubjects()
      ])
      setExams(examsData)
      setSubjects(subjectsData)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      const examData = {
        ...data,
        subject_id: parseInt(data.subject_id)
      }

      if (editingExam) {
        await studyService.updateExam(editingExam.id, examData)
        toast.success('Exam updated successfully!')
      } else {
        await studyService.createExam(examData)
        toast.success('Exam created successfully!')
      }
      
      reset()
      setShowForm(false)
      setEditingExam(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed')
    }
  }

  const handleEdit = (exam) => {
    setEditingExam(exam)
    reset({
      exam_name: exam.exam_name,
      exam_date: format(new Date(exam.exam_date), 'yyyy-MM-dd'),
      subject_id: exam.subject_id,
      priority_level: exam.priority_level
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await studyService.deleteExam(id)
        toast.success('Exam deleted successfully!')
        loadData()
      } catch (error) {
        toast.error('Failed to delete exam')
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingExam(null)
    reset()
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getDaysUntilExam = (examDate) => {
    const today = new Date()
    const exam = new Date(examDate)
    const diffTime = exam - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Exams</h1>
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
          disabled={subjects.length === 0}
        >
          <Plus size={16} />
          Add Exam
        </button>
      </div>

      {subjects.length === 0 && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
            <p style={{ color: '#92400e' }}>
              You need to add subjects first before creating exams.
            </p>
          </div>
        </div>
      )}

      {/* Exam Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>{editingExam ? 'Edit Exam' : 'Add New Exam'}</h3>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Exam Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Midterm Exam, Final Project"
                {...register('exam_name', { required: 'Exam name is required' })}
              />
              {errors.exam_name && <div className="error">{errors.exam_name.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <select
                className="form-select"
                {...register('subject_id', { required: 'Subject is required' })}
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {errors.subject_id && <div className="error">{errors.subject_id.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Exam Date</label>
              <input
                type="date"
                className="form-input"
                {...register('exam_date', { required: 'Exam date is required' })}
              />
              {errors.exam_date && <div className="error">{errors.exam_date.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-select"
                {...register('priority_level')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                {editingExam ? 'Update Exam' : 'Add Exam'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exams List */}
      {exams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Calendar size={64} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No exams scheduled</h3>
          <p style={{ color: '#9ca3af' }}>Add your first exam to start planning your study schedule.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {exams.map((exam) => {
            const daysUntil = getDaysUntilExam(exam.exam_date)
            const subjectName = subjects.find(s => s.id === exam.subject_id)?.name || 'Unknown Subject'
            
            return (
              <div key={exam.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ color: '#1f2937' }}>{exam.exam_name}</h3>
                      <span 
                        style={{ 
                          backgroundColor: getPriorityColor(exam.priority_level),
                          color: 'white',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize'
                        }}
                      >
                        {exam.priority_level}
                      </span>
                    </div>
                    
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Subject: {subjectName}
                    </p>
                    
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Date: {format(new Date(exam.exam_date), 'MMM dd, yyyy')}
                    </p>
                    
                    <p style={{ 
                      fontSize: '0.875rem',
                      color: daysUntil < 0 ? '#ef4444' : daysUntil <= 7 ? '#f59e0b' : '#10b981'
                    }}>
                      {daysUntil < 0 
                        ? `${Math.abs(daysUntil)} days ago` 
                        : daysUntil === 0 
                        ? 'Today!' 
                        : `${daysUntil} days remaining`
                      }
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEdit(exam)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Exams