import { useState, useEffect } from 'react'
import { studyService } from '../services/studyService'
import { useForm } from 'react-hook-form'
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      const data = await studyService.getSubjects()
      setSubjects(data)
    } catch (error) {
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      if (editingSubject) {
        await studyService.updateSubject(editingSubject.id, data)
        toast.success('Subject updated successfully!')
      } else {
        await studyService.createSubject(data)
        toast.success('Subject created successfully!')
      }
      
      reset()
      setShowForm(false)
      setEditingSubject(null)
      loadSubjects()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed')
    }
  }

  const handleEdit = (subject) => {
    setEditingSubject(subject)
    reset({
      name: subject.name,
      description: subject.description
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await studyService.deleteSubject(id)
        toast.success('Subject deleted successfully!')
        loadSubjects()
      } catch (error) {
        toast.error('Failed to delete subject')
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingSubject(null)
    reset()
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
        <h1>Subjects</h1>
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Add Subject
        </button>
      </div>

      {/* Subject Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Subject Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Mathematics, Physics"
                {...register('name', { required: 'Subject name is required' })}
              />
              {errors.name && <div className="error">{errors.name.message}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Brief description of the subject"
                {...register('description')}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                {editingSubject ? 'Update Subject' : 'Add Subject'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpen size={64} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No subjects yet</h3>
          <p style={{ color: '#9ca3af' }}>Add your first subject to get started with study planning.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>{subject.name}</h3>
                  {subject.description && (
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      {subject.description}
                    </p>
                  )}
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    Created: {new Date(subject.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(subject)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Subjects