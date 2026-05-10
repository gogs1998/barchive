import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models import Cocktail, CocktailIngredient, CocktailTag

router = APIRouter(tags=["cocktails"])


class IngredientLineOut(BaseModel):
    ingredient_id: uuid.UUID
    name: str
    category: str
    quantity: Optional[str]
    unit: Optional[str]
    notes: Optional[str]

    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


class CocktailOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    method: Optional[str]
    garnish: Optional[str]
    glassware: Optional[str]

    model_config = {"from_attributes": True}


class CocktailDetailOut(CocktailOut):
    ingredients: list[IngredientLineOut] = []
    tags: list[TagOut] = []


class PaginatedCocktails(BaseModel):
    total: int
    page: int
    per_page: int
    items: list[CocktailOut]


@router.get("/cocktails", response_model=PaginatedCocktails)
async def list_cocktails(
    q: Optional[str] = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Cocktail).order_by(Cocktail.name)
    count_stmt = select(func.count()).select_from(Cocktail)

    if q:
        stmt = stmt.where(Cocktail.name.ilike(f"%{q}%"))
        count_stmt = count_stmt.where(Cocktail.name.ilike(f"%{q}%"))

    total = (await db.execute(count_stmt)).scalar_one()
    offset = (page - 1) * per_page
    result = await db.execute(stmt.offset(offset).limit(per_page))
    items = result.scalars().all()

    return PaginatedCocktails(total=total, page=page, per_page=per_page, items=items)


@router.get("/cocktails/{slug}", response_model=CocktailDetailOut)
async def get_cocktail(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Cocktail)
        .options(
            selectinload(Cocktail.ingredients).selectinload(CocktailIngredient.ingredient),
            selectinload(Cocktail.tags).selectinload(CocktailTag.tag),
        )
        .where(Cocktail.slug == slug)
    )
    cocktail = result.scalar_one_or_none()
    if not cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")

    ingredients = [
        IngredientLineOut(
            ingredient_id=ci.ingredient_id,
            name=ci.ingredient.name,
            category=ci.ingredient.category,
            quantity=ci.quantity,
            unit=ci.unit,
            notes=ci.notes,
        )
        for ci in cocktail.ingredients
    ]
    tags = [TagOut(id=ct.tag.id, name=ct.tag.name) for ct in cocktail.tags]

    return CocktailDetailOut(
        id=cocktail.id,
        name=cocktail.name,
        slug=cocktail.slug,
        description=cocktail.description,
        method=cocktail.method,
        garnish=cocktail.garnish,
        glassware=cocktail.glassware,
        ingredients=ingredients,
        tags=tags,
    )
