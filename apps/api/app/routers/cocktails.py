import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Cocktail

router = APIRouter(tags=["cocktails"])


class CocktailOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    method: str | None
    garnish: str | None
    glassware: str | None

    model_config = {"from_attributes": True}


@router.get("/cocktails", response_model=list[CocktailOut])
async def list_cocktails(
    q: str | None = Query(None, description="Search by name"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Cocktail).order_by(Cocktail.name)
    if q:
        stmt = stmt.where(Cocktail.name.ilike(f"%{q}%"))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/cocktails/{slug}", response_model=CocktailOut)
async def get_cocktail(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cocktail).where(Cocktail.slug == slug))
    cocktail = result.scalar_one_or_none()
    if not cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")
    return cocktail
