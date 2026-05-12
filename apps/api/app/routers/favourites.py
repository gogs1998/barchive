"""Saved favourites API.

Endpoints:
    GET    /api/user/favourites            — list user's saved recipes
    POST   /api/user/favourites/{recipeId} — save recipe (idempotent)
    DELETE /api/user/favourites/{recipeId} — unsave recipe

The GET /api/v1/cocktails/{slug} endpoint is also extended via an optional
dependency so that `isFavourited: bool` is included in the response when the
caller is authenticated.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import Cocktail, CocktailIngredient, CocktailTag, User, UserFavourite
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/user", tags=["favourites"])


# ---------------------------------------------------------------------------
# Shared response schemas
# ---------------------------------------------------------------------------


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


class FavouritedCocktailOut(BaseModel):
    """Full recipe card enriched with favourited timestamp info."""

    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    method: Optional[str]
    garnish: Optional[str]
    glassware: Optional[str]
    isFavourited: bool = True
    ingredients: list[IngredientLineOut] = []
    tags: list[TagOut] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _cocktail_to_out(cocktail: Cocktail) -> FavouritedCocktailOut:
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
    return FavouritedCocktailOut(
        id=cocktail.id,
        name=cocktail.name,
        slug=cocktail.slug,
        description=cocktail.description,
        method=cocktail.method,
        garnish=cocktail.garnish,
        glassware=cocktail.glassware,
        isFavourited=True,
        ingredients=ingredients,
        tags=tags,
    )


async def _get_recipe_or_404(recipe_id: uuid.UUID, db: AsyncSession) -> Cocktail:
    result = await db.execute(select(Cocktail).where(Cocktail.id == recipe_id))
    cocktail = result.scalar_one_or_none()
    if cocktail is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return cocktail


# ---------------------------------------------------------------------------
# GET /api/user/favourites
# ---------------------------------------------------------------------------


@router.get("/favourites", response_model=list[FavouritedCocktailOut])
async def list_favourites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated user's saved recipes with full recipe cards."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Cocktail)
        .join(UserFavourite, UserFavourite.recipe_id == Cocktail.id)
        .where(UserFavourite.user_id == current_user.id)
        .options(
            selectinload(Cocktail.ingredients).selectinload(CocktailIngredient.ingredient),
            selectinload(Cocktail.tags).selectinload(CocktailTag.tag),
        )
        .order_by(UserFavourite.created_at.desc())
    )
    cocktails = result.scalars().all()
    return [_cocktail_to_out(c) for c in cocktails]


# ---------------------------------------------------------------------------
# POST /api/user/favourites/{recipeId} — idempotent save
# ---------------------------------------------------------------------------


@router.post(
    "/favourites/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def save_favourite(
    recipe_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a recipe to the user's favourites. Idempotent — returns 204 even if
    already saved."""
    # Validate recipe exists
    await _get_recipe_or_404(recipe_id, db)

    favourite = UserFavourite(user_id=current_user.id, recipe_id=recipe_id)
    db.add(favourite)
    try:
        await db.commit()
    except IntegrityError:
        # Already saved — that's fine, swallow the duplicate and return 204
        await db.rollback()


# ---------------------------------------------------------------------------
# DELETE /api/user/favourites/{recipeId} — unsave
# ---------------------------------------------------------------------------


@router.delete(
    "/favourites/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_favourite(
    recipe_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a recipe from the user's favourites.

    Returns 204 whether or not the recipe was previously saved (idempotent).
    """
    await db.execute(
        delete(UserFavourite).where(
            UserFavourite.user_id == current_user.id,
            UserFavourite.recipe_id == recipe_id,
        )
    )
    await db.commit()
