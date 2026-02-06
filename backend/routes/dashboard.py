"""
Dashboard routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import date
from decimal import Decimal
from config.database import get_db
from models.database_models import User, Subject, Exam, StudyPlan, Progress
from schemas.study_schemas import DashboardStats, TodayTask
from routes.auth import get_current_user_dependency
from typing import List

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    today = date.today()
    
    # Total subjects
    total_subjects = db.query(Subject).filter(Subject.user_id == current_user.id).count()
    
    # Upcoming exams (next 30 days)
    upcoming_exams = db.query(Exam).filter(
        and_(
            Exam.user_id == current_user.id,
            Exam.exam_date >= today
        )
    ).count()
    
    # Today's tasks
    today_tasks = db.query(StudyPlan).filter(
        and_(
            StudyPlan.user_id == current_user.id,
            StudyPlan.study_date == today
        )
    ).all()
    
    today_tasks_count = len(today_tasks)
    completed_tasks_today = len([task for task in today_tasks if task.is_completed])
    
    # Total study hours planned for today
    total_study_hours_today = sum([float(task.planned_hours) for task in today_tasks])
    
    # Completion percentage
    completion_percentage = 0.0
    if today_tasks_count > 0:
        completion_percentage = (completed_tasks_today / today_tasks_count) * 100
    
    return DashboardStats(
        total_subjects=total_subjects,
        upcoming_exams=upcoming_exams,
        today_tasks=today_tasks_count,
        completed_tasks_today=completed_tasks_today,
        total_study_hours_today=Decimal(str(total_study_hours_today)),
        completion_percentage=completion_percentage
    )

@router.get("/today-tasks", response_model=List[TodayTask])
async def get_today_tasks(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get today's study tasks for dashboard"""
    today = date.today()
    
    study_plans = db.query(StudyPlan).filter(
        and_(
            StudyPlan.user_id == current_user.id,
            StudyPlan.study_date == today
        )
    ).all()
    
    tasks = []
    for plan in study_plans:
        # Can only complete tasks on or after their scheduled date
        can_complete = plan.study_date <= today
        task = TodayTask(
            id=plan.id,
            subject_name=plan.subject.name if plan.subject else "Unknown",
            topic=plan.topic or "Study Session",
            planned_hours=plan.planned_hours,
            is_completed=plan.is_completed,
            study_date=plan.study_date,  # Added missing field
            description=plan.description,
            can_complete=can_complete  # Based on actual date, not sequential completion
        )
        tasks.append(task)
    
    return tasks

@router.get("/total-study-hours")
async def get_total_study_hours(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get total study hours from all progress records"""
    total_hours_result = db.query(func.sum(Progress.actual_hours)).filter(
        Progress.user_id == current_user.id
    ).scalar()
    
    total_hours = float(total_hours_result) if total_hours_result else 0.0
    
    return {
        "total_study_hours": total_hours,
        "total_sessions": db.query(Progress).filter(Progress.user_id == current_user.id).count()
    }