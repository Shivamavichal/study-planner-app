@echo off
echo ========================================
echo   Study Planner Admin Tools
echo ========================================
echo.
echo Choose an option:
echo 1. Command Line Admin Tool
echo 2. Web Admin Panel (Browser)
echo 3. Direct Database Access
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Starting Command Line Admin Tool...
    call venv\Scripts\activate.bat
    python admin_tool.py
) else if "%choice%"=="2" (
    echo.
    echo Starting Web Admin Panel...
    echo Open your browser and go to: http://localhost:8001
    call venv\Scripts\activate.bat
    python admin_web.py
) else if "%choice%"=="3" (
    echo.
    echo Database file location:
    echo %cd%\student_planner.db
    echo.
    echo You can open this file with:
    echo - DB Browser for SQLite
    echo - SQLite command line
    echo - Any SQLite viewer tool
    pause
) else (
    echo Invalid choice!
    pause
)