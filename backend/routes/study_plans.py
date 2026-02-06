"""
Study plans routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import date, timedelta
from config.database import get_db
from models.database_models import User, StudyPlan, Progress
from schemas.study_schemas import StudyPlanGenerateRequest, StudyPlanResponse, TodayTask
from services.study_plan_service import StudyPlanService
from routes.auth import get_current_user_dependency

router = APIRouter()

@router.post("/generate", response_model=List[StudyPlanResponse])
async def generate_study_plan(
    request: StudyPlanGenerateRequest,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Generate automated study plan"""
    study_plans = StudyPlanService.generate_study_plan(db, current_user.id, request)
    return study_plans

@router.get("/today", response_model=List[TodayTask])
async def get_today_tasks(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get today's study tasks"""
    study_plans = StudyPlanService.get_today_study_plans(db, current_user.id)
    
    tasks = []
    for plan in study_plans:
        task = TodayTask(
            id=plan.id,
            subject_name=plan.subject.name if plan.subject else "Unknown",
            topic=plan.topic or "Study Session",
            planned_hours=plan.planned_hours,
            is_completed=plan.is_completed,
            study_date=plan.study_date,  # Added missing field
            description=plan.description,
            can_complete=True  # Today's tasks can always be completed
        )
        tasks.append(task)
    
    return tasks

@router.get("/upcoming", response_model=List[TodayTask])
async def get_upcoming_tasks(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get upcoming study tasks (next 3 days including today) with completion logic"""
    today = date.today()
    end_date = today + timedelta(days=2)  # Today + next 2 days
    
    study_plans = db.query(StudyPlan).filter(
        and_(
            StudyPlan.user_id == current_user.id,
            StudyPlan.study_date >= today,
            StudyPlan.study_date <= end_date
        )
    ).order_by(StudyPlan.study_date, StudyPlan.id).all()
    
    tasks = []
    for plan in study_plans:
        # Determine if this task can be completed based on the actual date
        can_complete = plan.study_date <= today  # Can only complete tasks on or before today
        
        task = TodayTask(
            id=plan.id,
            subject_name=plan.subject.name if plan.subject else "Unknown",
            topic=plan.topic or "Study Session",
            planned_hours=plan.planned_hours,
            is_completed=plan.is_completed,
            study_date=plan.study_date,
            description=plan.description,
            can_complete=can_complete
        )
        tasks.append(task)
    
    return tasks

@router.get("/", response_model=List[StudyPlanResponse])
async def get_study_plans(
    start_date: date = None,
    end_date: date = None,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get study plans for a date range"""
    query = db.query(StudyPlan).filter(StudyPlan.user_id == current_user.id)
    
    if start_date:
        query = query.filter(StudyPlan.study_date >= start_date)
    if end_date:
        query = query.filter(StudyPlan.study_date <= end_date)
    
    study_plans = query.order_by(StudyPlan.study_date).all()
    return study_plans

@router.put("/{study_plan_id}/complete", response_model=StudyPlanResponse)
async def mark_study_plan_completed(
    study_plan_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Mark a study plan as completed with validation for sequential completion"""
    try:
        # Get the study plan
        study_plan = db.query(StudyPlan).filter(
            and_(
                StudyPlan.id == study_plan_id,
                StudyPlan.user_id == current_user.id
            )
        ).first()
        
        if not study_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Study plan not found"
            )
        
        today = date.today()
        
        # Validation logic - can only complete tasks on or after their scheduled date
        if study_plan.study_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only complete this task on or after {study_plan.study_date.strftime('%B %d, %Y')}"
            )
        
        # Mark as completed
        study_plan = StudyPlanService.mark_study_plan_completed(db, current_user.id, study_plan_id)
        
        # Check if progress record already exists
        existing_progress = db.query(Progress).filter(
            Progress.study_plan_id == study_plan_id,
            Progress.user_id == current_user.id
        ).first()
        
        # If no progress record exists, create one automatically with planned hours
        if not existing_progress:
            from sqlalchemy.sql import func
            progress = Progress(
                user_id=current_user.id,
                study_plan_id=study_plan_id,
                actual_hours=study_plan.planned_hours,  # Use planned hours as default
                notes="Task completed - hours calculated automatically"
            )
            db.add(progress)
            db.commit()
        
        return study_plan
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/{study_plan_id}", response_model=StudyPlanResponse)
async def get_study_plan(
    study_plan_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get a specific study plan"""
    study_plan = db.query(StudyPlan).filter(
        StudyPlan.id == study_plan_id,
        StudyPlan.user_id == current_user.id
    ).first()
    
    if not study_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )
    
    return study_plan

@router.delete("/{study_plan_id}")
async def delete_study_plan(
    study_plan_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete a study plan"""
    study_plan = db.query(StudyPlan).filter(
        StudyPlan.id == study_plan_id,
        StudyPlan.user_id == current_user.id
    ).first()
    
    if not study_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )
    
    db.delete(study_plan)
    db.commit()
    return {"message": "Study plan deleted successfully"}