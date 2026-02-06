"""
Student Study Planner - FastAPI Backend
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn

# Import routes
from routes.auth import router as auth_router
from routes.subjects import router as subjects_router
from routes.exams import router as exams_router
from routes.study_plans import router as study_plans_router
from routes.progress import router as progress_router
from routes.dashboard import router as dashboard_router

# Create FastAPI app
app = FastAPI(
    title="Student Study Planner API",
    description="API for managing student study plans and progress tracking",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security scheme
security = HTTPBearer()

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(subjects_router, prefix="/subjects", tags=["Subjects"])
app.include_router(exams_router, prefix="/exams", tags=["Exams"])
app.include_router(study_plans_router, prefix="/study-plans", tags=["Study Plans"])
app.include_router(progress_router, prefix="/progress", tags=["Progress"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Student Study Planner API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )