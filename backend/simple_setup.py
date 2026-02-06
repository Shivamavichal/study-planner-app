"""
Simple database setup without bcrypt issues
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from models.database_models import User, Subject, Exam, StudyPlan, Progress, UserPreference, Base
from datetime import date, datetime, timedelta
from decimal import Decimal
import hashlib

# Create engine
engine = create_engine("sqlite:///./student_planner.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def simple_hash(password: str) -> str:
    """Simple hash for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")

def seed_data():
    """Add initial seed data"""
    db = SessionLocal()
    
    try:
        print("Adding seed data...")
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "student@example.com").first()
        if existing_user:
            print("Seed data already exists!")
            return
        
        # Create demo user with simple hash
        demo_user = User(
            email="student@example.com",
            password_hash=simple_hash("password123"),
            full_name="John Student"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        
        # Create subjects
        subjects_data = [
            {"name": "Mathematics", "description": "Calculus and Linear Algebra"},
            {"name": "Physics", "description": "Mechanics and Thermodynamics"},
            {"name": "Computer Science", "description": "Data Structures and Algorithms"},
            {"name": "Chemistry", "description": "Organic Chemistry"}
        ]
        
        subjects = []
        for subject_data in subjects_data:
            subject = Subject(
                user_id=demo_user.id,
                name=subject_data["name"],
                description=subject_data["description"]
            )
            db.add(subject)
            subjects.append(subject)
        
        db.commit()
        
        # Create exams
        today = date.today()
        exams_data = [
            {"subject_idx": 0, "name": "Calculus Midterm", "days_ahead": 15, "priority": "high"},
            {"subject_idx": 1, "name": "Physics Final", "days_ahead": 30, "priority": "high"},
            {"subject_idx": 2, "name": "CS Assignment", "days_ahead": 7, "priority": "medium"},
            {"subject_idx": 3, "name": "Chemistry Quiz", "days_ahead": 20, "priority": "medium"}
        ]
        
        for exam_data in exams_data:
            exam = Exam(
                subject_id=subjects[exam_data["subject_idx"]].id,
                user_id=demo_user.id,
                exam_name=exam_data["name"],
                exam_date=today + timedelta(days=exam_data["days_ahead"]),
                priority_level=exam_data["priority"]
            )
            db.add(exam)
        
        # Create user preferences
        from datetime import time
        preferences = UserPreference(
            user_id=demo_user.id,
            daily_study_hours=Decimal("6.0"),
            preferred_start_time=time(9, 0),
            preferred_end_time=time(18, 0)
        )
        db.add(preferences)
        
        # Create some sample study plans
        study_plans_data = [
            {"subject_idx": 0, "days_ahead": 1, "hours": 2.0, "topic": "Derivatives", "desc": "Practice derivative problems"},
            {"subject_idx": 2, "days_ahead": 1, "hours": 1.5, "topic": "Binary Trees", "desc": "Implement tree traversal algorithms"},
            {"subject_idx": 1, "days_ahead": 2, "hours": 2.5, "topic": "Newton Laws", "desc": "Review mechanics problems"},
            {"subject_idx": 3, "days_ahead": 2, "hours": 1.0, "topic": "Molecular Structure", "desc": "Study organic compounds"}
        ]
        
        for plan_data in study_plans_data:
            study_plan = StudyPlan(
                user_id=demo_user.id,
                subject_id=subjects[plan_data["subject_idx"]].id,
                study_date=today + timedelta(days=plan_data["days_ahead"]),
                planned_hours=Decimal(str(plan_data["hours"])),
                topic=plan_data["topic"],
                description=plan_data["desc"]
            )
            db.add(study_plan)
        
        db.commit()
        print("✅ Seed data added successfully!")
        
    except Exception as e:
        print(f"❌ Error adding seed data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    seed_data()
    print("\n🎉 Database setup complete!")
    print("Demo login: student@example.com / password123")
    print("Note: Using simple hash for demo - not for production!")