"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from config.database import get_db
from config.auth import verify_token
from schemas.user_schemas import UserCreate, UserLogin, UserResponse, Token
from services.auth_service import AuthService

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    user = AuthService.create_user(db, user_data)
    return user

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = AuthService.authenticate_user(db, user_data.email, user_data.password)
    token_data = AuthService.create_user_token(user)
    return token_data

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    user_id = verify_token(credentials.credentials)
    user = AuthService.get_user_by_id(db, user_id)
    return user

# Dependency to get current user
async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Dependency to get current authenticated user"""
    user_id = verify_token(credentials.credentials)
    return AuthService.get_user_by_id(db, user_id)