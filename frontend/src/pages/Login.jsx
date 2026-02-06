import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authService } from '../services/authService'
import { BookOpen, Mail, Lock } from 'lucide-react'

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await authService.login(data.email, data.password)
      toast.success('Login successful!')
      onLogin(user)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <BookOpen size={48} style={{ color: '#3b82f6', margin: '0 auto 1rem' }} />
          <h1 className="auth-title">Welcome Back</h1>
          <p style={{ color: '#6b7280' }}>Sign in to your study planner</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
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
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && <div className="error">{errors.password.message}</div>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Sign up
          </Link>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Demo Account:
          </p>
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>
            Email: student@example.com<br />
            Password: password123
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login