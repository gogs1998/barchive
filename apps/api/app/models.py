import uuid
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # spirit/liqueur/mixer/garnish/other
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cocktail_links: Mapped[list["CocktailIngredient"]] = relationship(back_populates="ingredient")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)

    cocktail_links: Mapped[list["CocktailTag"]] = relationship(back_populates="tag")


class Cocktail(Base):
    __tablename__ = "cocktails"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    method: Mapped[str | None] = mapped_column(Text)
    garnish: Mapped[str | None] = mapped_column(String(255))
    glassware: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ingredients: Mapped[list["CocktailIngredient"]] = relationship(back_populates="cocktail", cascade="all, delete-orphan")
    tags: Mapped[list["CocktailTag"]] = relationship(back_populates="cocktail", cascade="all, delete-orphan")


class CocktailIngredient(Base):
    __tablename__ = "cocktail_ingredients"

    cocktail_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cocktails.id", ondelete="CASCADE"), primary_key=True)
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True)
    quantity: Mapped[str | None] = mapped_column(String(50))
    unit: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)

    cocktail: Mapped["Cocktail"] = relationship(back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="cocktail_links")


class CocktailTag(Base):
    __tablename__ = "cocktail_tags"

    cocktail_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cocktails.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    cocktail: Mapped["Cocktail"] = relationship(back_populates="tags")
    tag: Mapped["Tag"] = relationship(back_populates="cocktail_links")
