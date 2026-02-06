"""
Subjects routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from models.database_models import User, Subject
from schemas.study_schemas import SubjectCreate, SubjectResponse
from routes.auth import get_current_user_dependency

router = APIRouter()

@router.get("/", response_model=List[SubjectResponse])
async def get_subjects(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get all subjects for current user"""
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
    return subjects

@router.post("/", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a new subject"""
    # Check if subject already exists for user
    existing_subject = db.query(Subject).filter(
        Subject.user_id == current_user.id,
        Subject.name == subject_data.name
    ).first()
    
    if existing_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject with this name already exists"
        )
    
    subject = Subject(
        user_id=current_user.id,
        name=subject_data.name,
        description=subject_data.description
    )
    
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get a specific subject"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    return subject

@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    subject_data: SubjectCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update a subject"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    subject.name = subject_data.name
    subject.description = subject_data.description
    
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete a subject"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}