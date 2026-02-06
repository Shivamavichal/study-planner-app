"""
Simple web-based admin panel to view user data
"""
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import sqlite3
import os
from datetime import datetime

app = FastAPI(title="Study Planner Admin Panel")

def get_all_users():
    """Get all users from database"""
    try:
        conn = sqlite3.connect("student_planner.db")
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, email, full_name, created_at 
            FROM users 
            ORDER BY created_at DESC
        """)
        users = cursor.fetchall()
        conn.close()
        return users
    except Exception as e:
        print(f"Error: {e}")
        return []

def get_database_stats():
    """Get database statistics"""
    try:
        conn = sqlite3.connect("student_planner.db")
        cursor = conn.cursor()
        
        stats = {}
        cursor.execute("SELECT COUNT(*) FROM users")
        stats['users'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM subjects")
        stats['subjects'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM exams")
        stats['exams'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM study_plans")
        stats['study_plans'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM progress")
        stats['progress'] = cursor.fetchone()[0]
        
        conn.close()
        return stats
    except Exception as e:
        print(f"Error: {e}")
        return {}

@app.get("/", response_class=HTMLResponse)
async def admin_panel():
    """Main admin panel"""
    users = get_all_users()
    stats = get_database_stats()
    
    # Known passwords for demo accounts
    known_passwords = {
        "student@example.com": "password123"
    }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Study Planner Admin Panel</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            h1 {{
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }}
            .stats {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            .stat-card {{
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                border-left: 4px solid #007bff;
            }}
            .stat-number {{
                font-size: 2em;
                font-weight: bold;
                color: #007bff;
            }}
            .stat-label {{
                color: #666;
                margin-top: 5px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th, td {{
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }}
            th {{
                background-color: #007bff;
                color: white;
            }}
            tr:hover {{
                background-color: #f5f5f5;
            }}
            .password {{
                background-color: #e8f5e8;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
            }}
            .no-password {{
                color: #666;
                font-style: italic;
            }}
            .refresh-btn {{
                background-color: #28a745;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-bottom: 20px;
            }}
            .refresh-btn:hover {{
                background-color: #218838;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎓 Study Planner Admin Panel</h1>
            
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">{stats.get('users', 0)}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{stats.get('subjects', 0)}</div>
                    <div class="stat-label">Subjects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{stats.get('exams', 0)}</div>
                    <div class="stat-label">Exams</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{stats.get('study_plans', 0)}</div>
                    <div class="stat-label">Study Plans</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{stats.get('progress', 0)}</div>
                    <div class="stat-label">Progress Records</div>
                </div>
            </div>
            
            <h2>👥 Registered Users</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Password</th>
                        <th>Created Date</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    if not users:
        html_content += """
                    <tr>
                        <td colspan="5" style="text-align: center; color: #666;">
                            No users found in database
                        </td>
                    </tr>
        """
    else:
        for user in users:
            user_id, email, full_name, created_at = user
            password_display = f'<span class="password">{known_passwords[email]}</span>' if email in known_passwords else '<span class="no-password">User-created (cannot recover)</span>'
            
            html_content += f"""
                    <tr>
                        <td>{user_id}</td>
                        <td>{email}</td>
                        <td>{full_name}</td>
                        <td>{password_display}</td>
                        <td>{created_at}</td>
                    </tr>
            """
    
    html_content += """
                </tbody>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3>🔑 Password Recovery Notes:</h3>
                <ul>
                    <li><strong>Demo Account:</strong> student@example.com / password123</li>
                    <li><strong>User-created accounts:</strong> Passwords are hashed and cannot be recovered</li>
                    <li><strong>For forgotten passwords:</strong> Users need to register a new account</li>
                    <li><strong>Database location:</strong> student-study-planner/backend/student_planner.db</li>
                </ul>
            </div>
            
            <div style="margin-top: 20px; text-align: center; color: #666; font-size: 0.9em;">
                <p>Admin Panel - Last updated: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_content

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Admin Panel...")
    print("📱 Access at: http://localhost:8001")
    print("🔑 This shows all user data including passwords")
    uvicorn.run(app, host="0.0.0.0", port=8001)