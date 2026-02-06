# Student Study Planner App

A full-stack application to help students plan and track their studies effectively.

## 🚀 **Live Demo & Deployment**
- **GitHub Repository**: Upload entire project to GitHub
- **Vercel Deployment**: Frontend can be deployed to Vercel
- **See**: `README_DEPLOYMENT.md` for detailed deployment instructions

## Tech Stack
- **Backend**: Python (FastAPI)
- **Frontend**: React (Vite)
- **Database**: SQLite (local) / MySQL (production)

## Project Structure
```
student-study-planner/
├── frontend/          # React frontend
├── backend/           # FastAPI backend  
├── database/          # Database scripts
├── vercel.json        # Vercel deployment config
├── .gitignore         # Git ignore rules
└── README_DEPLOYMENT.md # Deployment guide
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+

### Quick Setup
1. **Database Setup**
   ```sql
   CREATE DATABASE student_planner;
   ```

2. **Run database scripts**
   ```bash
   cd database
   mysql -u your_username -p student_planner < models.sql
   mysql -u your_username -p student_planner < seed_data.sql
   ```

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

4. **Configure Database Connection**
   Update environment variables or modify `config/database.py`:
   ```python
   DATABASE_CONFIG = {
       'host': 'localhost',
       'user': 'your_username',
       'password': 'your_password',
       'database': 'student_planner'
   }
   ```

5. **Start Backend Server**
   ```bash
   uvicorn main:app --reload
   ```
   Backend will run on: http://localhost:8000

6. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend will run on: http://localhost:3000

## Features
- User Authentication (Register/Login)
- Study Planner (Add subjects, exams, study hours)
- Automated Study Plan Generation
- Progress Tracking
- Dashboard with today's tasks and progress

## API Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /subjects` - Get user subjects
- `POST /subjects` - Add subject
- `POST /study-plans` - Generate study plan
- `GET /study-plans/today` - Get today's tasks
- `POST /progress` - Update progress

## Default Login
- Email: student@example.com
- Password: password123