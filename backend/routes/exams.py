"""
Exams routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import date
from config.database import get_db
from models.database_models import User, Exam, Subject
from schemas.study_schemas import ExamCreate, ExamResponse
from routes.auth import get_current_user_dependency

router = APIRouter()

@router.get("/", response_model=List[ExamResponse])
async def get_exams(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get all exams for current user"""
    exams = db.query(Exam).filter(Exam.user_id == current_user.id).order_by(Exam.exam_date).all()
    return exams

@router.get("/upcoming", response_model=List[ExamResponse])
async def get_upcoming_exams(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get upcoming exams for current user"""
    today = date.today()
    exams = db.query(Exam).filter(
        and_(
            Exam.user_id == current_user.id,
            Exam.exam_date >= today
        )
    ).order_by(Exam.exam_date).all()
    return exams

@router.post("/", response_model=ExamResponse)
async def create_exam(
    exam_data: ExamCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a new exam"""
    # Verify subject belongs to user
    subject = db.query(Subject).filter(
        Subject.id == exam_data.subject_id,
        Subject.user_id == current_user.id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    exam = Exam(
        subject_id=exam_data.subject_id,
        user_id=current_user.id,
        exam_name=exam_data.exam_name,
        exam_date=exam_data.exam_date,
        priority_level=exam_data.priority_level
    )
    
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam

@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get a specific exam"""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    return exam

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    exam_data: ExamCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update an exam"""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # Verify subject belongs to user
    subject = db.query(Subject).filter(
        Subject.id == exam_data.subject_id,
        Subject.user_id == current_user.id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    exam.subject_id = exam_data.subject_id
    exam.exam_name = exam_data.exam_name
    exam.exam_date = exam_data.exam_date
    exam.priority_level = exam_data.priority_level
    
    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete an exam"""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    db.delete(exam)
    db.commit()
    return {"message": "Exam deleted successfully"}