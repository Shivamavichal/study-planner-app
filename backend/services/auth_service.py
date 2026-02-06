"""
Authentication service
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.database_models import User
from schemas.user_schemas import UserCreate
import hashlib
from datetime import timedelta

# Simple hash for demo - not for production
def simple_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_simple_hash(password: str, hashed: str) -> bool:
    return simple_hash(password) == hashed

class AuthService:
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password and create user
        hashed_password = simple_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """Authenticate user credentials"""
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_simple_hash(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        return user
    
    @staticmethod
    def create_user_token(user: User) -> dict:
        """Create access token for user"""
        from config.auth import create_access_token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        """Get user by ID"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user