@echo off
echo ========================================
echo   Student Study Planner - Starting...
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo   Login: student@gmail.com
echo   Password: password123
echo ========================================
echo.
echo Press any key to continue...
pause >nul