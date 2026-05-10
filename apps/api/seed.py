"""
Seed script: populates the database with 20+ classic cocktail recipes.
Usage: python seed.py
Requires DATABASE_URL env var (or uses default in config.py).
"""
import asyncio
import uuid

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.config import settings
from app.models import Base, Ingredient, Cocktail, CocktailIngredient, Tag, CocktailTag

# ---------------------------------------------------------------------------
# Raw data
# ---------------------------------------------------------------------------

INGREDIENTS_DATA = [
    # spirits
    ("Gin", "spirit", "London Dry style gin"),
    ("Vodka", "spirit", "Neutral grain spirit"),
    ("White Rum", "spirit", "Light Cuban-style rum"),
    ("Dark Rum", "spirit", "Aged molasses rum"),
    ("Tequila Blanco", "spirit", "Unaged agave spirit"),
    ("Bourbon", "spirit", "American straight bourbon whiskey"),
    ("Rye Whiskey", "spirit", "Spicy American rye whiskey"),
    ("Scotch Whisky", "spirit", "Blended Scotch whisky"),
    ("Brandy", "spirit", "Grape-based aged spirit"),
    ("Campari", "liqueur", "Italian bitter aperitivo"),
    ("Sweet Vermouth", "liqueur", "Italian sweet vermouth"),
    ("Dry Vermouth", "liqueur", "French dry vermouth"),
    ("Triple Sec", "liqueur", "Orange-flavoured liqueur"),
    ("Cointreau", "liqueur", "Premium orange liqueur"),
    ("Maraschino Liqueur", "liqueur", "Cherry-flavoured liqueur"),
    ("Peach Schnapps", "liqueur", "Peach-flavoured liqueur"),
    ("Amaretto", "liqueur", "Almond-flavoured Italian liqueur"),
    ("Kahlúa", "liqueur", "Coffee-flavoured liqueur"),
    ("Baileys Irish Cream", "liqueur", "Irish cream liqueur"),
    ("Blue Curaçao", "liqueur", "Blue orange liqueur"),
    ("Lime Juice", "mixer", "Freshly squeezed lime juice"),
    ("Lemon Juice", "mixer", "Freshly squeezed lemon juice"),
    ("Orange Juice", "mixer", "Fresh orange juice"),
    ("Cranberry Juice", "mixer", "Unsweetened cranberry juice"),
    ("Pineapple Juice", "mixer", "Fresh pineapple juice"),
    ("Grapefruit Juice", "mixer", "Fresh grapefruit juice"),
    ("Simple Syrup", "mixer", "Equal parts sugar and water"),
    ("Honey Syrup", "mixer", "Two parts honey to one part water"),
    ("Grenadine", "mixer", "Pomegranate syrup"),
    ("Angostura Bitters", "bitters", "Aromatic Trinidad bitters"),
    ("Orange Bitters", "bitters", "Orange-infused aromatic bitters"),
    ("Peychaud's Bitters", "bitters", "Anise-forward New Orleans bitters"),
    ("Soda Water", "mixer", "Plain carbonated water"),
    ("Tonic Water", "mixer", "Quinine-infused carbonated water"),
    ("Ginger Beer", "mixer", "Spicy non-alcoholic ginger brew"),
    ("Cola", "mixer", "Carbonated cola"),
    ("Coconut Cream", "mixer", "Rich coconut cream"),
    ("Egg White", "other", "Pasteurised egg white for foam"),
    ("Heavy Cream", "mixer", "Double cream"),
    ("Mint", "garnish", "Fresh mint leaves"),
    ("Lime Wheel", "garnish", "Thin lime wheel"),
    ("Lemon Twist", "garnish", "Expressed lemon peel"),
    ("Orange Twist", "garnish", "Expressed orange peel"),
    ("Cherry", "garnish", "Maraschino or Luxardo cherry"),
    ("Olive", "garnish", "Green cocktail olive"),
    ("Salt", "other", "Coarse kosher salt for rimming"),
    ("Sugar", "other", "White granulated sugar"),
    ("Absinthe", "spirit", "Anise-flavoured spirit"),
    ("Champagne", "mixer", "Dry sparkling wine"),
]

COCKTAILS_DATA = [
    {
        "name": "Negroni",
        "slug": "negroni",
        "description": "A perfectly balanced Italian aperitivo of equal parts gin, Campari, and sweet vermouth.",
        "method": "Stir all ingredients with ice for 30 seconds. Strain into a rocks glass over a large ice cube.",
        "garnish": "Orange twist",
        "glassware": "Rocks glass",
        "ingredients": [
            ("Gin", "30", "ml", None),
            ("Campari", "30", "ml", None),
            ("Sweet Vermouth", "30", "ml", None),
        ],
        "tags": ["stirred", "aperitivo", "classic"],
    },
    {
        "name": "Old Fashioned",
        "slug": "old-fashioned",
        "description": "The original cocktail: whiskey, sugar, and bitters.",
        "method": "Muddle sugar cube with bitters and a splash of water. Add bourbon and ice, stir until chilled.",
        "garnish": "Orange twist and cherry",
        "glassware": "Rocks glass",
        "ingredients": [
            ("Bourbon", "60", "ml", None),
            ("Angostura Bitters", "2", "dashes", None),
            ("Simple Syrup", "5", "ml", "or 1 sugar cube"),
        ],
        "tags": ["stirred", "classic", "whiskey"],
    },
    {
        "name": "Martini",
        "slug": "martini",
        "description": "The quintessential cocktail: gin and dry vermouth, stirred or shaken.",
        "method": "Stir gin and dry vermouth with ice. Strain into a chilled martini glass.",
        "garnish": "Lemon twist or olive",
        "glassware": "Martini glass",
        "ingredients": [
            ("Gin", "60", "ml", None),
            ("Dry Vermouth", "10", "ml", None),
        ],
        "tags": ["stirred", "classic"],
    },
    {
        "name": "Margarita",
        "slug": "margarita",
        "description": "The world's most popular cocktail: tequila, lime, and triple sec.",
        "method": "Shake all ingredients with ice. Strain into a salt-rimmed glass.",
        "garnish": "Lime wheel",
        "glassware": "Coupe or rocks glass",
        "ingredients": [
            ("Tequila Blanco", "50", "ml", None),
            ("Cointreau", "20", "ml", None),
            ("Lime Juice", "25", "ml", "freshly squeezed"),
            ("Salt", None, None, "for rim"),
        ],
        "tags": ["shaken", "classic", "tequila"],
    },
    {
        "name": "Mojito",
        "slug": "mojito",
        "description": "Refreshing Cuban highball with rum, lime, sugar, and mint.",
        "method": "Muddle mint with lime juice and sugar syrup. Add rum, fill with soda water, stir gently.",
        "garnish": "Mint sprig and lime wheel",
        "glassware": "Highball glass",
        "ingredients": [
            ("White Rum", "50", "ml", None),
            ("Lime Juice", "25", "ml", None),
            ("Simple Syrup", "15", "ml", None),
            ("Mint", "8", "leaves", "muddled"),
            ("Soda Water", "60", "ml", "to top"),
        ],
        "tags": ["built", "classic", "rum", "refreshing"],
    },
    {
        "name": "Daiquiri",
        "slug": "daiquiri",
        "description": "A classic Cuban trio of rum, lime, and sugar.",
        "method": "Shake all ingredients with ice. Double strain into a chilled coupe.",
        "garnish": "Lime wheel",
        "glassware": "Coupe",
        "ingredients": [
            ("White Rum", "60", "ml", None),
            ("Lime Juice", "30", "ml", None),
            ("Simple Syrup", "15", "ml", None),
        ],
        "tags": ["shaken", "classic", "rum"],
    },
    {
        "name": "Manhattan",
        "slug": "manhattan",
        "description": "Rye whiskey and sweet vermouth with a dash of bitters.",
        "method": "Stir all ingredients with ice. Strain into a chilled coupe or martini glass.",
        "garnish": "Cherry",
        "glassware": "Coupe",
        "ingredients": [
            ("Rye Whiskey", "60", "ml", None),
            ("Sweet Vermouth", "30", "ml", None),
            ("Angostura Bitters", "2", "dashes", None),
        ],
        "tags": ["stirred", "classic", "whiskey"],
    },
    {
        "name": "Cosmopolitan",
        "slug": "cosmopolitan",
        "description": "The 1990s icon: vodka, Cointreau, cranberry, and lime.",
        "method": "Shake all ingredients with ice. Strain into a chilled martini glass.",
        "garnish": "Orange twist",
        "glassware": "Martini glass",
        "ingredients": [
            ("Vodka", "45", "ml", None),
            ("Cointreau", "15", "ml", None),
            ("Cranberry Juice", "30", "ml", None),
            ("Lime Juice", "15", "ml", None),
        ],
        "tags": ["shaken", "classic"],
    },
    {
        "name": "Whiskey Sour",
        "slug": "whiskey-sour",
        "description": "Bourbon shaken with lemon juice, sugar, and egg white for a silky foam.",
        "method": "Dry shake without ice, then shake again with ice. Strain into a rocks glass.",
        "garnish": "Lemon wheel and cherry",
        "glassware": "Rocks glass",
        "ingredients": [
            ("Bourbon", "60", "ml", None),
            ("Lemon Juice", "30", "ml", None),
            ("Simple Syrup", "20", "ml", None),
            ("Egg White", "1", "piece", "optional"),
        ],
        "tags": ["shaken", "sour", "whiskey"],
    },
    {
        "name": "Dark 'n' Stormy",
        "slug": "dark-n-stormy",
        "description": "Dark rum float over ginger beer — stormy by nature.",
        "method": "Fill glass with ice, pour ginger beer, float dark rum on top.",
        "garnish": "Lime wheel",
        "glassware": "Highball glass",
        "ingredients": [
            ("Dark Rum", "60", "ml", None),
            ("Ginger Beer", "120", "ml", None),
            ("Lime Juice", "15", "ml", None),
        ],
        "tags": ["built", "rum", "refreshing"],
    },
    {
        "name": "Aperol Spritz",
        "slug": "aperol-spritz",
        "description": "Italy's favourite aperitivo: Aperol, Prosecco, and a splash of soda.",
        "method": "Build over ice in a wine glass. Add Prosecco, then Aperol, then soda water.",
        "garnish": "Orange slice",
        "glassware": "Wine glass",
        "ingredients": [
            ("Campari", "60", "ml", "use Aperol for authentic version"),
            ("Champagne", "90", "ml", "use Prosecco"),
            ("Soda Water", "30", "ml", None),
        ],
        "tags": ["built", "sparkling", "aperitivo"],
    },
    {
        "name": "Moscow Mule",
        "slug": "moscow-mule",
        "description": "Vodka, lime, and ginger beer — classically served in a copper mug.",
        "method": "Fill a copper mug with ice, add vodka and lime juice, top with ginger beer.",
        "garnish": "Lime wheel and mint",
        "glassware": "Copper mug",
        "ingredients": [
            ("Vodka", "50", "ml", None),
            ("Ginger Beer", "120", "ml", None),
            ("Lime Juice", "15", "ml", None),
        ],
        "tags": ["built", "refreshing"],
    },
    {
        "name": "Tom Collins",
        "slug": "tom-collins",
        "description": "Gin sour lengthened with soda water over ice.",
        "method": "Shake gin, lemon juice, and syrup with ice. Strain into ice-filled highball, top with soda.",
        "garnish": "Lemon wheel and cherry",
        "glassware": "Highball glass",
        "ingredients": [
            ("Gin", "45", "ml", None),
            ("Lemon Juice", "30", "ml", None),
            ("Simple Syrup", "15", "ml", None),
            ("Soda Water", "60", "ml", "to top"),
        ],
        "tags": ["shaken", "sour", "gin", "refreshing"],
    },
    {
        "name": "Sazerac",
        "slug": "sazerac",
        "description": "The New Orleans classic: rye, Peychaud's bitters, and an absinthe rinse.",
        "method": "Rinse a chilled rocks glass with absinthe. Stir rye, bitters, and sugar over ice; strain into glass.",
        "garnish": "Lemon twist (expressed, not dropped)",
        "glassware": "Rocks glass",
        "ingredients": [
            ("Rye Whiskey", "60", "ml", None),
            ("Peychaud's Bitters", "2", "dashes", None),
            ("Angostura Bitters", "1", "dash", None),
            ("Simple Syrup", "5", "ml", None),
            ("Absinthe", "5", "ml", "for rinse"),
        ],
        "tags": ["stirred", "classic", "whiskey", "new-orleans"],
    },
    {
        "name": "Gimlet",
        "slug": "gimlet",
        "description": "Gin and lime — simple and sharp.",
        "method": "Shake gin and lime juice (or cordial) with ice. Strain into a chilled coupe.",
        "garnish": "Lime wheel",
        "glassware": "Coupe",
        "ingredients": [
            ("Gin", "60", "ml", None),
            ("Lime Juice", "20", "ml", "or Rose's lime cordial"),
            ("Simple Syrup", "10", "ml", "omit if using cordial"),
        ],
        "tags": ["shaken", "gin", "classic"],
    },
    {
        "name": "Aviation",
        "slug": "aviation",
        "description": "Gin shaken with maraschino, crème de violette, and lemon.",
        "method": "Shake all ingredients with ice. Double strain into a chilled coupe.",
        "garnish": "Cherry",
        "glassware": "Coupe",
        "ingredients": [
            ("Gin", "45", "ml", None),
            ("Maraschino Liqueur", "15", "ml", None),
            ("Lemon Juice", "20", "ml", None),
        ],
        "tags": ["shaken", "gin", "classic"],
    },
    {
        "name": "Paloma",
        "slug": "paloma",
        "description": "Mexico's most popular tequila drink: tequila and grapefruit soda.",
        "method": "Rim glass with salt. Build over ice: tequila, lime juice, grapefruit juice, top with soda.",
        "garnish": "Grapefruit wedge",
        "glassware": "Highball glass",
        "ingredients": [
            ("Tequila Blanco", "50", "ml", None),
            ("Grapefruit Juice", "100", "ml", None),
            ("Lime Juice", "15", "ml", None),
            ("Simple Syrup", "10", "ml", None),
            ("Soda Water", "30", "ml", "to top"),
            ("Salt", None, None, "for rim"),
        ],
        "tags": ["built", "tequila", "refreshing"],
    },
    {
        "name": "Pisco Sour",
        "slug": "pisco-sour",
        "description": "South America's signature cocktail with pisco, lemon, and egg white.",
        "method": "Dry shake all ingredients without ice, then add ice and shake vigorously. Strain into a coupe.",
        "garnish": "Dash of Angostura bitters on foam",
        "glassware": "Coupe",
        "ingredients": [
            ("Brandy", "60", "ml", "use Pisco"),
            ("Lemon Juice", "30", "ml", None),
            ("Simple Syrup", "20", "ml", None),
            ("Egg White", "1", "piece", None),
            ("Angostura Bitters", "2", "dashes", "to garnish"),
        ],
        "tags": ["shaken", "sour", "south-american"],
    },
    {
        "name": "Espresso Martini",
        "slug": "espresso-martini",
        "description": "Vodka, coffee liqueur, and espresso — the ultimate pick-me-up cocktail.",
        "method": "Shake all ingredients hard with ice to get a good crema. Double strain into a chilled coupe.",
        "garnish": "Three coffee beans",
        "glassware": "Coupe",
        "ingredients": [
            ("Vodka", "50", "ml", None),
            ("Kahlúa", "20", "ml", None),
            ("Simple Syrup", "10", "ml", None),
        ],
        "tags": ["shaken", "coffee", "modern-classic"],
    },
    {
        "name": "French 75",
        "slug": "french-75",
        "description": "Gin sour topped with Champagne — named after a WWI artillery piece.",
        "method": "Shake gin, lemon juice, and syrup with ice. Strain into a flute; top with Champagne.",
        "garnish": "Lemon twist",
        "glassware": "Champagne flute",
        "ingredients": [
            ("Gin", "30", "ml", None),
            ("Lemon Juice", "15", "ml", None),
            ("Simple Syrup", "10", "ml", None),
            ("Champagne", "90", "ml", "to top"),
        ],
        "tags": ["shaken", "sparkling", "gin", "classic"],
    },
    {
        "name": "Piña Colada",
        "slug": "pina-colada",
        "description": "Tropical blended rum, coconut cream, and pineapple.",
        "method": "Blend all ingredients with a cup of ice until smooth. Pour into a hurricane glass.",
        "garnish": "Pineapple wedge and cherry",
        "glassware": "Hurricane glass",
        "ingredients": [
            ("White Rum", "60", "ml", None),
            ("Coconut Cream", "30", "ml", None),
            ("Pineapple Juice", "90", "ml", None),
        ],
        "tags": ["blended", "tropical", "rum"],
    },
    {
        "name": "Clover Club",
        "slug": "clover-club",
        "description": "Pre-Prohibition gin sour with raspberry syrup and egg white.",
        "method": "Dry shake all ingredients, add ice and shake again. Double strain into a chilled coupe.",
        "garnish": "Three raspberries",
        "glassware": "Coupe",
        "ingredients": [
            ("Gin", "45", "ml", None),
            ("Lemon Juice", "20", "ml", None),
            ("Grenadine", "15", "ml", "or raspberry syrup"),
            ("Egg White", "1", "piece", None),
        ],
        "tags": ["shaken", "sour", "gin", "classic"],
    },
]


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(Cocktail))
        if result.scalars().first():
            print("Database already seeded. Skipping.")
            await engine.dispose()
            return

        print("Seeding ingredients...")
        ingredient_map: dict[str, Ingredient] = {}
        for name, category, description in INGREDIENTS_DATA:
            ing = Ingredient(id=uuid.uuid4(), name=name, category=category, description=description)
            session.add(ing)
            ingredient_map[name] = ing

        print("Seeding tags...")
        tag_map: dict[str, Tag] = {}
        all_tags: set[str] = set()
        for c in COCKTAILS_DATA:
            all_tags.update(c.get("tags", []))
        for tag_name in all_tags:
            t = Tag(id=uuid.uuid4(), name=tag_name)
            session.add(t)
            tag_map[tag_name] = t

        await session.flush()

        print("Seeding cocktails...")
        for data in COCKTAILS_DATA:
            cocktail = Cocktail(
                id=uuid.uuid4(),
                name=data["name"],
                slug=data["slug"],
                description=data.get("description"),
                method=data.get("method"),
                garnish=data.get("garnish"),
                glassware=data.get("glassware"),
            )
            session.add(cocktail)
            await session.flush()

            for ing_name, quantity, unit, notes in data["ingredients"]:
                if ing_name in ingredient_map:
                    ci = CocktailIngredient(
                        cocktail_id=cocktail.id,
                        ingredient_id=ingredient_map[ing_name].id,
                        quantity=quantity,
                        unit=unit,
                        notes=notes,
                    )
                    session.add(ci)

            for tag_name in data.get("tags", []):
                if tag_name in tag_map:
                    ct = CocktailTag(
                        cocktail_id=cocktail.id,
                        tag_id=tag_map[tag_name].id,
                    )
                    session.add(ct)

        await session.commit()
        print(f"Seeded {len(COCKTAILS_DATA)} cocktails and {len(INGREDIENTS_DATA)} ingredients.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
