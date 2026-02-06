import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authService } from '../services/authService'
import { BookOpen, Mail, Lock, User } from 'lucide-react'

function Register({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await authService.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name
      })
      toast.success('Registration successful!')
      onLogin(user)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <BookOpen size={48} style={{ color: '#3b82f6', margin: '0 auto 1rem' }} />
          <h1 className="auth-title">Create Account</h1>
          <p style={{ color: '#6b7280' }}>Join us to start planning your studies</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ marginRight: '0.5rem' }} />
              Full Name
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your full name"
              {...register('full_name', { required: 'Full name is required' })}
            />
            {errors.full_name && <div className="error">{errors.full_name.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Mail size={16} style={{ marginRight: '0.5rem' }} />
              Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && <div className="error">{errors.email.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} style={{ marginRight: '0.5rem' }} />
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
            />
            {errors.password && <div className="error">{errors.password.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} style={{ marginRight: '0.5rem' }} />
              Confirm Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Confirm your password"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && <div className="error">{errors.confirmPassword.message}</div>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register