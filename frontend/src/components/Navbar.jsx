import { Link, useLocation } from 'react-router-dom'
import { LogOut, BookOpen } from 'lucide-react'

function Navbar({ user, onLogout }) {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link'
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <BookOpen size={24} />
            Study Planner
          </Link>
          
          <div className="navbar-nav">
            <Link to="/dashboard" className={isActive('/dashboard') || isActive('/')}>
              Dashboard
            </Link>
            <Link to="/subjects" className={isActive('/subjects')}>
              Subjects
            </Link>
            <Link to="/exams" className={isActive('/exams')}>
              Exams
            </Link>
            <Link to="/study-planner" className={isActive('/study-planner')}>
              Study Planner
            </Link>
            <Link to="/progress" className={isActive('/progress')}>
              Progress
            </Link>
            
            <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Welcome, {user?.full_name}
              </span>
              <button 
                onClick={onLogout}
                className="btn btn-secondary"
                style={{ padding: '0.5rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar