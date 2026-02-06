"""
Study plan generation and management service
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from models.database_models import StudyPlan, Subject, Exam, UserPreference
from schemas.study_schemas import StudyPlanGenerateRequest, StudyPlanCreate
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict
import math

class StudyPlanService:
    
    @staticmethod
    def generate_study_plan(db: Session, user_id: int, request: StudyPlanGenerateRequest) -> List[StudyPlan]:
        """Generate automated study plan based on exams and available time"""
        
        # Get user's subjects and upcoming exams
        subjects = db.query(Subject).filter(Subject.user_id == user_id).all()
        exams = db.query(Exam).filter(
            and_(
                Exam.user_id == user_id,
                Exam.exam_date >= request.start_date,
                Exam.exam_date <= request.end_date + timedelta(days=30)  # Include exams slightly after end date
            )
        ).order_by(Exam.exam_date).all()
        
        if not subjects:
            return []
        
        # Clear existing study plans in the date range
        db.query(StudyPlan).filter(
            and_(
                StudyPlan.user_id == user_id,
                StudyPlan.study_date >= request.start_date,
                StudyPlan.study_date <= request.end_date
            )
        ).delete()
        
        # Calculate total available study days
        total_days = (request.end_date - request.start_date).days + 1
        total_study_hours = request.daily_study_hours * total_days
        
        # Create study plan allocation
        study_plans = []
        current_date = request.start_date
        
        # If there are exams, prioritize based on exam dates and priority
        if exams:
            study_plans = StudyPlanService._generate_exam_based_plan(
                db, user_id, exams, current_date, request.end_date, request.daily_study_hours
            )
        else:
            # If no exams, distribute time equally among subjects
            study_plans = StudyPlanService._generate_balanced_plan(
                db, user_id, subjects, current_date, request.end_date, request.daily_study_hours
            )
        
        # Save all study plans
        for plan in study_plans:
            db.add(plan)
        
        db.commit()
        return study_plans
    
    @staticmethod
    def _generate_exam_based_plan(db: Session, user_id: int, exams: List[Exam], 
                                 start_date: date, end_date: date, daily_hours: Decimal) -> List[StudyPlan]:
        """Generate study plan prioritizing upcoming exams"""
        study_plans = []
        current_date = start_date
        
        # Group exams by subject
        subject_exams = {}
        for exam in exams:
            if exam.subject_id not in subject_exams:
                subject_exams[exam.subject_id] = []
            subject_exams[exam.subject_id].append(exam)
        
        while current_date <= end_date:
            remaining_hours = float(daily_hours)
            
            # Calculate priority scores for each subject based on upcoming exams
            subject_priorities = StudyPlanService._calculate_subject_priorities(
                subject_exams, current_date
            )
            
            # Allocate time based on priorities
            total_priority = sum(subject_priorities.values())
            if total_priority > 0:
                for subject_id, priority in subject_priorities.items():
                    if remaining_hours <= 0:
                        break
                    
                    # Calculate hours for this subject (minimum 0.5 hours)
                    allocated_hours = max(0.5, (priority / total_priority) * float(daily_hours))
                    allocated_hours = min(allocated_hours, remaining_hours)
                    
                    if allocated_hours >= 0.5:  # Only create plan if at least 30 minutes
                        # Get subject and nearest exam for topic
                        subject_exam_list = subject_exams.get(subject_id, [])
                        nearest_exam = min(subject_exam_list, key=lambda x: abs((x.exam_date - current_date).days))
                        
                        topic = f"Preparation for {nearest_exam.exam_name}"
                        description = f"Study session for {nearest_exam.exam_name} (Due: {nearest_exam.exam_date})"
                        
                        study_plan = StudyPlan(
                            user_id=user_id,
                            subject_id=subject_id,
                            study_date=current_date,
                            planned_hours=Decimal(str(round(allocated_hours, 1))),
                            topic=topic,
                            description=description
                        )
                        study_plans.append(study_plan)
                        remaining_hours -= allocated_hours
            
            current_date += timedelta(days=1)
        
        return study_plans
    
    @staticmethod
    def _generate_balanced_plan(db: Session, user_id: int, subjects: List[Subject],
                               start_date: date, end_date: date, daily_hours: Decimal) -> List[StudyPlan]:
        """Generate balanced study plan when no exams are scheduled"""
        study_plans = []
        current_date = start_date
        subject_index = 0
        
        while current_date <= end_date:
            remaining_hours = float(daily_hours)
            subjects_today = []
            
            # Distribute hours among 2-3 subjects per day
            subjects_per_day = min(3, len(subjects))
            hours_per_subject = float(daily_hours) / subjects_per_day
            
            for i in range(subjects_per_day):
                if remaining_hours < 0.5:
                    break
                
                subject = subjects[(subject_index + i) % len(subjects)]
                allocated_hours = min(hours_per_subject, remaining_hours)
                
                if allocated_hours >= 0.5:
                    study_plan = StudyPlan(
                        user_id=user_id,
                        subject_id=subject.id,
                        study_date=current_date,
                        planned_hours=Decimal(str(round(allocated_hours, 1))),
                        topic="Regular Study Session",
                        description=f"Regular study session for {subject.name}"
                    )
                    study_plans.append(study_plan)
                    remaining_hours -= allocated_hours
            
            subject_index = (subject_index + subjects_per_day) % len(subjects)
            current_date += timedelta(days=1)
        
        return study_plans
    
    @staticmethod
    def _calculate_subject_priorities(subject_exams: Dict, current_date: date) -> Dict[int, float]:
        """Calculate priority scores for subjects based on exam proximity and priority level"""
        priorities = {}
        
        for subject_id, exams in subject_exams.items():
            subject_priority = 0
            
            for exam in exams:
                days_until_exam = (exam.exam_date - current_date).days
                
                # Skip past exams
                if days_until_exam < 0:
                    continue
                
                # Base priority based on time until exam (closer = higher priority)
                if days_until_exam == 0:
                    time_priority = 10  # Exam today - highest priority
                elif days_until_exam <= 3:
                    time_priority = 8
                elif days_until_exam <= 7:
                    time_priority = 6
                elif days_until_exam <= 14:
                    time_priority = 4
                else:
                    time_priority = 2
                
                # Multiply by exam priority level
                priority_multiplier = {
                    'high': 1.5,
                    'medium': 1.0,
                    'low': 0.7
                }.get(exam.priority_level, 1.0)
                
                exam_priority = time_priority * priority_multiplier
                subject_priority = max(subject_priority, exam_priority)  # Take highest priority exam
            
            if subject_priority > 0:
                priorities[subject_id] = subject_priority
        
        return priorities
    
    @staticmethod
    def get_today_study_plans(db: Session, user_id: int) -> List[StudyPlan]:
        """Get today's study plans for a user"""
        today = date.today()
        return db.query(StudyPlan).filter(
            and_(
                StudyPlan.user_id == user_id,
                StudyPlan.study_date == today
            )
        ).all()
    
    @staticmethod
    def mark_study_plan_completed(db: Session, user_id: int, study_plan_id: int) -> StudyPlan:
        """Mark a study plan as completed"""
        study_plan = db.query(StudyPlan).filter(
            and_(
                StudyPlan.id == study_plan_id,
                StudyPlan.user_id == user_id
            )
        ).first()
        
        if not study_plan:
            raise ValueError("Study plan not found")
        
        study_plan.is_completed = True
        study_plan.completed_at = func.now()
        db.commit()
        db.refresh(study_plan)
        
        return study_plan