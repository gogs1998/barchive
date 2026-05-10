import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_db
from app.models import Ingredient

router = APIRouter(tags=["ingredients"])


class IngredientOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    description: Optional[str]

    model_config = {"from_attributes": True}


class PaginatedIngredients(BaseModel):
    total: int
    page: int
    per_page: int
    items: list[IngredientOut]


@router.get("/ingredients", response_model=PaginatedIngredients)
async def list_ingredients(
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Ingredient).order_by(Ingredient.name)
    count_stmt = select(func.count()).select_from(Ingredient)

    if category:
        stmt = stmt.where(Ingredient.category == category)
        count_stmt = count_stmt.where(Ingredient.category == category)

    total = (await db.execute(count_stmt)).scalar_one()
    offset = (page - 1) * per_page
    result = await db.execute(stmt.offset(offset).limit(per_page))
    items = result.scalars().all()

    return PaginatedIngredients(total=total, page=page, per_page=per_page, items=items)


@router.get("/ingredients/{ingredient_id}", response_model=IngredientOut)
async def get_ingredient(ingredient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ingredient).where(Ingredient.id == ingredient_id))
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient
