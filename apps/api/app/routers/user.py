"""User profile router — canonical /api/user/* routes."""

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models import User
from app.routers.auth import UserOut

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    """Return the authenticated user's profile: id, email, email_verified."""
    return UserOut(id=user.id, email=user.email, email_verified=user.email_verified)
