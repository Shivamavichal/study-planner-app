"""
Progress tracking routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List
from config.database import get_db
from models.database_models import User, Progress, StudyPlan
from schemas.study_schemas import ProgressCreate, ProgressResponse
from routes.auth import get_current_user_dependency

router = APIRouter()

@router.get("/", response_model=List[ProgressResponse])
async def get_progress(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get all progress records for current user"""
    progress_records = db.query(Progress).filter(
        Progress.user_id == current_user.id
    ).order_by(Progress.completed_at.desc()).all()
    return progress_records

@router.post("/", response_model=ProgressResponse)
async def create_progress(
    progress_data: ProgressCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Record progress for a study plan"""
    # Verify study plan belongs to user
    study_plan = db.query(StudyPlan).filter(
        StudyPlan.id == progress_data.study_plan_id,
        StudyPlan.user_id == current_user.id
    ).first()
    
    if not study_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )
    
    # Check if progress already exists for this study plan
    existing_progress = db.query(Progress).filter(
        Progress.study_plan_id == progress_data.study_plan_id,
        Progress.user_id == current_user.id
    ).first()
    
    if existing_progress:
        # Update existing progress
        existing_progress.actual_hours = progress_data.actual_hours
        existing_progress.notes = progress_data.notes
        existing_progress.completed_at = func.now()
        db.commit()
        db.refresh(existing_progress)
        
        # Mark study plan as completed
        study_plan.is_completed = True
        study_plan.completed_at = func.now()
        db.commit()
        
        return existing_progress
    else:
        # Create new progress record
        progress = Progress(
            user_id=current_user.id,
            study_plan_id=progress_data.study_plan_id,
            actual_hours=progress_data.actual_hours,
            notes=progress_data.notes
        )
        
        db.add(progress)
        db.commit()
        db.refresh(progress)
        
        # Mark study plan as completed
        study_plan.is_completed = True
        study_plan.completed_at = func.now()
        db.commit()
        
        return progress

@router.get("/{progress_id}", response_model=ProgressResponse)
async def get_progress_record(
    progress_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get a specific progress record"""
    progress = db.query(Progress).filter(
        Progress.id == progress_id,
        Progress.user_id == current_user.id
    ).first()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )
    
    return progress

@router.put("/{progress_id}", response_model=ProgressResponse)
async def update_progress(
    progress_id: int,
    progress_data: ProgressCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update a progress record"""
    progress = db.query(Progress).filter(
        Progress.id == progress_id,
        Progress.user_id == current_user.id
    ).first()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )
    
    progress.actual_hours = progress_data.actual_hours
    progress.notes = progress_data.notes
    progress.completed_at = func.now()
    
    db.commit()
    db.refresh(progress)
    return progress

@router.delete("/{progress_id}")
async def delete_progress(
    progress_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete a progress record"""
    progress = db.query(Progress).filter(
        Progress.id == progress_id,
        Progress.user_id == current_user.id
    ).first()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )
    
    # Also mark the associated study plan as incomplete
    study_plan = db.query(StudyPlan).filter(
        StudyPlan.id == progress.study_plan_id
    ).first()
    
    if study_plan:
        study_plan.is_completed = False
        study_plan.completed_at = None
    
    db.delete(progress)
    db.commit()
    return {"message": "Progress record deleted successfully"}