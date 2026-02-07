import { useState, useEffect } from 'react'
import { agentService } from '../services/agentService'
import { Bell, TrendingUp, Lightbulb, Calendar, X } from 'lucide-react'

function AgentInsights({ userId }) {
  const [recommendations, setRecommendations] = useState([])
  const [reminders, setReminders] = useState([])
  const [progressAnalysis, setProgressAnalysis] = useState(null)
  const [showInsights, setShowInsights] = useState(true)

  useEffect(() => {
    loadAgentData()
    
    // Refresh every minute
    const interval = setInterval(loadAgentData, 60000)
    return () => clearInterval(interval)
  }, [userId])

  const loadAgentData = () => {
    const recs = agentService.getRecommendations(userId)
    const rems = agentService.getActiveReminders()
    const analysis = agentService.analyzeProgress(userId)
    
    setRecommendations(recs)
    setReminders(rems)
    setProgressAnalysis(analysis)
  }

  const dismissReminder = (reminderId) => {
    agentService.dismissReminder(reminderId)
    loadAgentData()
  }

  if (!showInsights) {
    return (
      <button 
        onClick={() => setShowInsights(true)}
        className="btn btn-secondary"
        style={{ marginBottom: '1rem' }}
      >
        <Lightbulb size={16} />
        Show AI Insights
      </button>
    )
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'urgent': return '🚨'
      case 'warning': return '⚠️'
      case 'success': return '✅'
      case 'info': return 'ℹ️'
      default: return '💡'
    }
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={20} />
          AI Study Assistant
        </h3>
        <button 
          onClick={() => setShowInsights(false)}
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
        >
          Hide
        </button>
      </div>

      {/* Active Reminders */}
      {reminders.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Bell size={18} style={{ color: '#f59e0b' }} />
            <h4 style={{ color: '#92400e' }}>Today's Reminders</h4>
          </div>
          {reminders.map((reminder) => (
            <div 
              key={reminder.id}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>{reminder.message}</span>
              <button
                onClick={() => dismissReminder(reminder.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} />
            Smart Recommendations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommendations.slice(0, 3).map((rec, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${getPriorityColor(rec.priority)}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{getTypeIcon(rec.type)}</span>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ fontSize: '0.875rem', marginBottom: '0.25rem', color: '#1f2937' }}>
                      {rec.title}
                    </h5>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      {rec.message}
                    </p>
                    {rec.action && (
                      <span style={{ 
                        fontSize: '0.75rem',
                        color: getPriorityColor(rec.priority),
                        fontWeight: '500'
                      }}>
                        → {rec.action}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Analysis */}
      {progressAnalysis && progressAnalysis.insights.length > 0 && (
        <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#10b981' }}>
          <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46' }}>
            <Calendar size={18} />
            Your Progress Insights
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {progressAnalysis.insights.map((insight, index) => (
              <p key={index} style={{ fontSize: '0.875rem', color: '#065f46', margin: 0 }}>
                {insight}
              </p>
            ))}
          </div>
          {progressAnalysis.currentStreak > 0 && (
            <div style={{ 
              marginTop: '0.75rem', 
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                {progressAnalysis.currentStreak}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                day streak
              </span>
            </div>
          )}
        </div>
      )}

      {recommendations.length === 0 && reminders.length === 0 && (!progressAnalysis || progressAnalysis.insights.length === 0) && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <Lightbulb size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ color: '#6b7280' }}>
            Keep studying! Your AI assistant will provide insights as you progress.
          </p>
        </div>
      )}
    </div>
  )
}

export default AgentInsights
