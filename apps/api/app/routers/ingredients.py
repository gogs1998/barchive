import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Ingredient

router = APIRouter(tags=["ingredients"])


class IngredientOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    description: str | None

    model_config = {"from_attributes": True}


@router.get("/ingredients", response_model=list[IngredientOut])
async def list_ingredients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ingredient).order_by(Ingredient.name))
    return result.scalars().all()


@router.get("/ingredients/{ingredient_id}", response_model=IngredientOut)
async def get_ingredient(ingredient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ingredient).where(Ingredient.id == ingredient_id))
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient
