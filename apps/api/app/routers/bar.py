"""My Bar router — /api/user/bar endpoints.

Lets authenticated users manage which ingredients they have in stock.

Endpoints:
  GET    /api/user/bar                  — list all ingredients in user's bar
  POST   /api/user/bar/{ingredientId}   — add ingredient (idempotent)
  DELETE /api/user/bar/{ingredientId}   — remove ingredient
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import Ingredient, User, UserBar

router = APIRouter(prefix="/api/user/bar", tags=["my-bar"])


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------


class IngredientOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str | None = None
    category: str
    description: str | None = None

    model_config = {"from_attributes": True}


class BarInventory(BaseModel):
    items: list[IngredientOut]
    total: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=BarInventory)
async def list_bar(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BarInventory:
    """Return all ingredients the authenticated user has in their bar."""
    result = await db.execute(
        select(Ingredient)
        .join(UserBar, UserBar.ingredient_id == Ingredient.id)
        .where(UserBar.user_id == user.id)
        .order_by(Ingredient.name)
    )
    ingredients = result.scalars().all()
    return BarInventory(items=list(ingredients), total=len(ingredients))


@router.post("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_to_bar(
    ingredient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Add an ingredient to the user's bar. Idempotent — adding twice is a no-op."""
    # Verify ingredient exists
    result = await db.execute(select(Ingredient).where(Ingredient.id == ingredient_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    # Upsert — ignore conflict on composite PK (idempotent)
    try:
        # PostgreSQL-style upsert; falls back to plain INSERT for SQLite test env
        stmt = pg_insert(UserBar).values(
            user_id=user.id,
            ingredient_id=ingredient_id,
        ).on_conflict_do_nothing(index_elements=["user_id", "ingredient_id"])
        await db.execute(stmt)
    except Exception:
        # SQLite (test env) doesn't support pg_insert — use a raw INSERT OR IGNORE
        from sqlalchemy import text
        await db.execute(
            text(
                "INSERT OR IGNORE INTO user_bar (user_id, ingredient_id) VALUES (:uid, :iid)"
            ),
            {"uid": str(user.id), "iid": str(ingredient_id)},
        )
    await db.commit()


@router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_bar(
    ingredient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove an ingredient from the user's bar. Returns 404 if not present."""
    result = await db.execute(
        delete(UserBar)
        .where(UserBar.user_id == user.id, UserBar.ingredient_id == ingredient_id)
        .returning(UserBar.ingredient_id)
    )
    deleted = result.fetchone()
    if deleted is None:
        raise HTTPException(status_code=404, detail="Ingredient not in your bar")
    await db.commit()
