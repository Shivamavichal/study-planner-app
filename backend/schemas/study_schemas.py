"""
Pydantic schemas for study-related operations
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

# Subject schemas
class SubjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Exam schemas
class ExamBase(BaseModel):
    exam_name: str
    exam_date: date
    priority_level: Optional[str] = "medium"

class ExamCreate(ExamBase):
    subject_id: int

class ExamResponse(ExamBase):
    id: int
    subject_id: int
    user_id: int
    created_at: datetime
    subject: Optional[SubjectResponse] = None
    
    class Config:
        from_attributes = True

# Study Plan schemas
class StudyPlanBase(BaseModel):
    study_date: date
    planned_hours: Decimal
    topic: Optional[str] = None
    description: Optional[str] = None

class StudyPlanCreate(StudyPlanBase):
    subject_id: int

class StudyPlanResponse(StudyPlanBase):
    id: int
    user_id: int
    subject_id: int
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    subject: Optional[SubjectResponse] = None
    
    class Config:
        from_attributes = True

# Progress schemas
class ProgressBase(BaseModel):
    actual_hours: Decimal
    notes: Optional[str] = None

class ProgressCreate(ProgressBase):
    study_plan_id: int

class ProgressResponse(ProgressBase):
    id: int
    user_id: int
    study_plan_id: int
    completed_at: datetime
    study_plan: Optional[StudyPlanResponse] = None
    
    class Config:
        from_attributes = True

# Study Plan Generation Request
class StudyPlanGenerateRequest(BaseModel):
    daily_study_hours: Decimal
    start_date: date
    end_date: date

# Dashboard schemas
class DashboardStats(BaseModel):
    total_subjects: int
    upcoming_exams: int
    today_tasks: int
    completed_tasks_today: int
    total_study_hours_today: Decimal
    completion_percentage: float

class TodayTask(BaseModel):
    id: int
    subject_name: str
    topic: str
    planned_hours: Decimal
    is_completed: bool
    study_date: date  # Added study_date field
    description: Optional[str] = None
    can_complete: bool = True  # Added field to control if task can be completed