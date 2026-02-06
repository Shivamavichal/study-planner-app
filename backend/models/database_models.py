"""
SQLAlchemy database models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Numeric, Boolean, ForeignKey, Enum, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    progress = relationship("Progress", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subjects")
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="subject", cascade="all, delete-orphan")

class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_name = Column(String(255), nullable=False)
    exam_date = Column(Date, nullable=False)
    priority_level = Column(Enum('low', 'medium', 'high', name='priority_enum'), default='medium')
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    subject = relationship("Subject", back_populates="exams")
    user = relationship("User", back_populates="exams")

class StudyPlan(Base):
    __tablename__ = "study_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    study_date = Column(Date, nullable=False)
    planned_hours = Column(Numeric(3, 1), nullable=False)
    topic = Column(String(255))
    description = Column(Text)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="study_plans")
    subject = relationship("Subject", back_populates="study_plans")
    progress = relationship("Progress", back_populates="study_plan", cascade="all, delete-orphan")

class Progress(Base):
    __tablename__ = "progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    study_plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False)
    actual_hours = Column(Numeric(3, 1), nullable=False)
    notes = Column(Text)
    completed_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="progress")
    study_plan = relationship("StudyPlan", back_populates="progress")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    daily_study_hours = Column(Numeric(3, 1), default=4.0)
    preferred_start_time = Column(Time, default="09:00:00")
    preferred_end_time = Column(Time, default="17:00:00")
    break_duration_minutes = Column(Integer, default=15)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="preferences")