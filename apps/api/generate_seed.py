#!/usr/bin/env python3
"""
generate_seed.py — emit seed SQL for the D1 production database.

Reads the static cocktail data encoded directly in this script
(mirroring cocktails.ts) and writes INSERT statements that:
  - Upsert all cocktails with every column the Worker / frontend needs.
  - Upsert all ingredients referenced by those cocktails.
  - Upsert all tags referenced by those cocktails.
  - Upsert the join-table rows (cocktail_ingredients, cocktail_tags).

Run:  python3 generate_seed.py > migrations/d1/0006_seed_cocktails.sql

The resulting SQL file is idempotent (uses INSERT OR REPLACE / INSERT OR IGNORE).
"""

import json
import uuid

# ── deterministic UUID5 namespaces ──────────────────────────────────────────
NS_COCKTAIL    = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
NS_INGREDIENT  = uuid.UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")
NS_TAG         = uuid.UUID("c3d4e5f6-a7b8-9012-cdef-123456789012")

def uid_cocktail(name: str) -> str:
    return str(uuid.uuid5(NS_COCKTAIL, name))

def uid_ingredient(name: str) -> str:
    return str(uuid.uuid5(NS_INGREDIENT, name.lower().strip()))

def uid_tag(name: str) -> str:
    return str(uuid.uuid5(NS_TAG, name.lower().strip()))


def esc(s):
    """Escape a value for SQL: return NULL if None, otherwise single-quoted string."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def slugify(name: str) -> str:
    import re, unicodedata
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


# ── Static cocktail data (matches cocktails.ts exactly) ─────────────────────
# Format: (id, name, category, glass, img_url, color, ingredients[(name,amount)],
#          steps[], tags[], abv, time, vegan, gluten_free)
COCKTAILS = [
    # Tequila
    ("11007","Margarita","Tequila","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg","#D4E8A8",
     [("Tequila Blanco","2 oz"),("Fresh Lime Juice","1 oz"),("Cointreau","0.75 oz"),("Agave Syrup","0.25 oz"),("Kosher Salt","rim")],
     ["Rim chilled coupe with salt (half rim only).","Combine all liquids in shaker with ice.","Shake hard 12 seconds until well-chilled.","Double-strain into prepared coupe.","Garnish with a lime wheel."],
     ["classic","citrus","summer"],"22%","2 min",True,True),

    ("11008","Tommy's Margarita","Tequila","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/loezxn1504373874.jpg","#D4E8A8",
     [("Tequila Blanco","2 oz"),("Fresh Lime Juice","1 oz"),("Agave Syrup","0.5 oz")],
     ["Combine all in shaker with ice.","Shake hard 12 seconds.","Strain over fresh ice in a rocks glass.","Garnish with a lime wheel."],
     ["classic","citrus","vegan"],"18%","2 min",True,True),

    ("11009","Paloma","Tequila","Highball",
     "https://www.thecocktaildb.com/images/media/drink/samm5j1513706393.jpg","#FFB347",
     [("Tequila Blanco","2 oz"),("Fresh Grapefruit Juice","3 oz"),("Fresh Lime Juice","0.5 oz"),("Agave Syrup","0.5 oz"),("Pinch of Salt","pinch"),("Soda Water","top")],
     ["Salt rim a highball glass (optional).","Build tequila, grapefruit, lime, agave over ice.","Top with soda water.","Stir gently. Garnish with grapefruit wedge."],
     ["classic","citrus","refreshing"],"12%","2 min",True,True),

    ("11010","Jalapeño Margarita","Tequila","Coupe",
     "https://images.unsplash.com/photo-1587596898940-aa2f18fa9d97?w=800&q=80","#A8D8A8",
     [("Tequila Blanco","2 oz"),("Fresh Lime Juice","1 oz"),("Cointreau","0.75 oz"),("Agave Syrup","0.25 oz"),("Fresh Jalapeño","2 slices")],
     ["Muddle jalapeño slices in shaker.","Add remaining ingredients with ice.","Shake hard 12 seconds.","Double-strain into chilled coupe.","Garnish with a jalapeño wheel."],
     ["spicy","citrus","modern"],"22%","3 min",True,True),

    # Rum
    ("11004","Daiquiri","Rum","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/mrz9091589574515.jpg","#F5E6CA",
     [("White Rum","2 oz"),("Fresh Lime Juice","0.75 oz"),("Simple Syrup","0.75 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Double-strain into chilled coupe.","No garnish — let the balance speak."],
     ["classic","citrus","simple"],"18%","2 min",True,True),

    ("11005","Mojito","Rum","Highball",
     "https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg","#C8E6C9",
     [("White Rum","2 oz"),("Fresh Lime Juice","0.75 oz"),("Simple Syrup","0.75 oz"),("Fresh Mint","8 leaves"),("Soda Water","top")],
     ["Gently muddle mint with syrup in highball glass.","Add lime juice and rum.","Fill with crushed ice.","Top with soda water. Stir briefly.","Garnish with mint sprig."],
     ["classic","refreshing","summer"],"14%","3 min",True,True),

    ("11006","Piña Colada","Rum","Hurricane",
     "https://www.thecocktaildb.com/images/media/drink/upgsue1668419912.jpg","#FFF8DC",
     [("White Rum","2 oz"),("Coconut Cream","1.5 oz"),("Pineapple Juice","2 oz")],
     ["Blend all ingredients with 1 cup crushed ice until smooth.","Pour into chilled hurricane glass.","Garnish with a pineapple wedge and cherry."],
     ["tropical","frozen","sweet"],"14%","3 min",True,True),

    ("11091","Dark 'n' Stormy","Rum","Highball",
     "https://www.thecocktaildb.com/images/media/drink/t1tn0s1504374905.jpg","#3D2B1F",
     [("Gosling's Black Seal Rum","2 oz"),("Ginger Beer","4 oz"),("Fresh Lime Juice","0.5 oz")],
     ["Fill highball glass with ice.","Pour lime juice over ice.","Add rum.","Top with ginger beer — do not stir.","Garnish with a lime wedge."],
     ["classic","ginger","tropical"],"10%","1 min",True,True),

    ("11092","Hurricane","Rum","Hurricane",
     "https://www.thecocktaildb.com/images/media/drink/nwx02s1515795822.jpg","#FF4500",
     [("White Rum","1 oz"),("Dark Rum","1 oz"),("Passionfruit Syrup","1 oz"),("Fresh Lime Juice","0.5 oz"),("Fresh Orange Juice","1 oz"),("Grenadine","0.25 oz")],
     ["Combine all in shaker with ice.","Shake and strain into hurricane glass over ice.","Garnish with orange slice and cherry."],
     ["tropical","fruity","new-orleans"],"14%","2 min",True,True),

    ("11093","Mai Tai","Rum","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/twyrrp1439907470.jpg","#FF8C00",
     [("Aged Jamaican Rum","1.5 oz"),("Martinique Rhum","0.5 oz"),("Fresh Lime Juice","1 oz"),("Orange Curaçao","0.5 oz"),("Orgeat","0.5 oz")],
     ["Combine all in shaker with ice.","Shake and strain over crushed ice in rocks glass.","Float dark rum on top.","Garnish with spent lime hull, mint sprig, cherry."],
     ["tiki","tropical","classic"],"18%","3 min",True,True),

    ("11094","Jungle Bird","Rum","Rocks",
     "https://images.unsplash.com/photo-1570869031823-8d42a0e32f43?w=800&q=80","#D44000",
     [("Blackstrap Rum","1.5 oz"),("Campari","0.75 oz"),("Fresh Lime Juice","0.5 oz"),("Pineapple Juice","1.5 oz"),("Simple Syrup","0.5 oz")],
     ["Combine all in shaker with ice.","Shake vigorously.","Strain over large ice in rocks glass.","Garnish with pineapple wedge."],
     ["tiki","bitter","tropical"],"16%","2 min",True,True),

    ("11095","Hemingway Daiquiri","Rum","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/jfcvps1504369888.jpg","#C8E6C9",
     [("White Rum","2 oz"),("Fresh Lime Juice","0.75 oz"),("Fresh Grapefruit Juice","0.5 oz"),("Maraschino Liqueur","0.5 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Double-strain into chilled coupe.","Garnish with a lime wheel."],
     ["classic","citrus","papa"],"20%","2 min",True,True),

    ("11096","Caipirinha","Cachaça","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/jgvn7p1582484435.jpg","#D4E8A8",
     [("Cachaça","2 oz"),("Fresh Lime","half (quartered)"),("Caster Sugar","2 tsp")],
     ["Muddle lime quarters with sugar in rocks glass.","Fill glass with crushed ice.","Pour cachaça over ice.","Stir briefly.","Garnish with a lime wedge."],
     ["classic","citrus","brazilian"],"20%","2 min",True,True),

    ("11120","Jungle Bird Riff","Rum","Rocks",
     "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&q=80","#8B2635",
     [("Smith & Cross Rum","1.5 oz"),("Campari","0.75 oz"),("Pineapple Juice","1.5 oz"),("Fresh Lime Juice","0.5 oz"),("Demerara Syrup","0.5 oz")],
     ["Combine all in shaker with ice.","Shake vigorously.","Strain over large ice in rocks glass.","Garnish with a dehydrated pineapple wheel."],
     ["tiki","bitter","tropical"],"16%","2 min",True,True),

    ("11123","Dark Side","Rum","Coupe",
     "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&q=80","#1A0F00",
     [("Dark Rum","1.5 oz"),("Blackberry Liqueur","0.5 oz"),("Fresh Lime Juice","0.75 oz"),("Simple Syrup","0.5 oz"),("Egg White","1")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Double-strain into chilled coupe.","Garnish with fresh blackberries."],
     ["modern","fruity","tropical"],"18%","3 min",True,True),

    # Whiskey
    ("11001","Old Fashioned","Whiskey","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/vrwquq1478252802.jpg","#D4A56A",
     [("Bourbon or Rye","2 oz"),("Simple Syrup","0.25 oz"),("Angostura Bitters","2 dashes"),("Orange Bitters","1 dash")],
     ["Add sugar, bitters and a splash of water to rocks glass.","Stir until sugar dissolves.","Add a large ice cube.","Pour bourbon over ice.","Express orange peel, rub rim, garnish."],
     ["classic","stirred","spirit-forward"],"32%","3 min",True,True),

    ("11002","Manhattan","Whiskey","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/yk70e31606771240.jpg","#8B2635",
     [("Rye Whiskey","2 oz"),("Sweet Vermouth","1 oz"),("Angostura Bitters","2 dashes")],
     ["Combine all ingredients in mixing glass with ice.","Stir 30 seconds until well-chilled.","Strain into chilled coupe.","Garnish with a brandied cherry."],
     ["classic","stirred","spirit-forward"],"28%","3 min",True,True),

    ("11003","Whiskey Sour","Whiskey","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/hbkfsh1589574990.jpg","#F5CBA7",
     [("Bourbon","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Simple Syrup","0.75 oz"),("Egg White","1 (optional)")],
     ["Dry shake all ingredients (no ice) 15 seconds if using egg white.","Add ice and shake hard 12 seconds.","Strain into rocks glass over ice.","Garnish with a lemon wheel and cherry."],
     ["classic","citrus","sour"],"20%","3 min",True,True),

    ("11014","Sazerac","Whiskey","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/vvpxwy1439907208.jpg","#D4A56A",
     [("Rye Whiskey","2 oz"),("Demerara Syrup","0.25 oz"),("Peychaud's Bitters","3 dashes"),("Angostura Bitters","1 dash"),("Absinthe","rinse")],
     ["Rinse a chilled rocks glass with absinthe, discard excess.","In mixing glass, combine rye, syrup, bitters with ice.","Stir 30 seconds.","Strain into prepared glass.","Express lemon peel over drink; discard peel (or garnish)."],
     ["classic","stirred","new-orleans"],"32%","4 min",True,True),

    ("11015","Mint Julep","Whiskey","Julep Tin",
     "https://www.thecocktaildb.com/images/media/drink/squyyq1439907312.jpg","#C8E6C9",
     [("Bourbon","2.5 oz"),("Simple Syrup","0.5 oz"),("Fresh Mint","10 leaves"),("Powdered Sugar","pinch")],
     ["Gently muddle mint with syrup in julep tin.","Pack tin with crushed ice.","Pour bourbon over ice.","Stir briefly, top with more crushed ice.","Garnish with a bouquet of mint, dust with powdered sugar."],
     ["classic","refreshing","derby"],"26%","3 min",True,True),

    ("11080","Penicillin","Whiskey","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/hc9b1a1521853096.jpg","#D4A56A",
     [("Blended Scotch","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Honey-Ginger Syrup","0.75 oz"),("Islay Scotch Float","0.25 oz")],
     ["Combine blended scotch, lemon, and syrup in shaker with ice.","Shake vigorously 12 seconds.","Strain over large ice cube in rocks glass.","Float Islay scotch on top by pouring over back of spoon.","Garnish with candied ginger."],
     ["modern","smoky","citrus"],"22%","3 min",True,True),

    ("11084","Paper Plane","Whiskey","Coupe",
     "https://images.unsplash.com/photo-1590945000906-5a9cfad5ea3e?w=800&q=80","#F5CBA7",
     [("Bourbon","0.75 oz"),("Aperol","0.75 oz"),("Amaro Nonino","0.75 oz"),("Fresh Lemon Juice","0.75 oz")],
     ["Combine equal parts in shaker with ice.","Shake well and double-strain into chilled coupe.","No garnish."],
     ["modern","equal-parts","citrus"],"22%","2 min",True,True),

    ("11085","Gold Rush","Whiskey","Rocks",
     "https://images.unsplash.com/photo-1580170770946-cf7d0af98bd6?w=800&q=80","#F5CBA7",
     [("Bourbon","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Honey Syrup","0.75 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Strain over large ice cube in rocks glass.","Garnish with a lemon twist."],
     ["modern","citrus","easy"],"22%","2 min",True,True),

    ("11097","Rob Roy","Whiskey","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/typuyq1439456976.jpg","#8B2635",
     [("Scotch Whisky","2 oz"),("Sweet Vermouth","1 oz"),("Angostura Bitters","2 dashes")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds until well-chilled.","Strain into chilled coupe.","Garnish with a brandied cherry."],
     ["classic","stirred","scotch"],"28%","3 min",True,True),

    ("11098","Rusty Nail","Whiskey","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/yqsvtw1478252982.jpg","#D4A56A",
     [("Scotch Whisky","2 oz"),("Drambuie","0.5 oz")],
     ["Add both ingredients to rocks glass with a large ice cube.","Stir gently to combine.","Garnish with a lemon twist."],
     ["classic","stirred","scotch"],"32%","1 min",True,True),

    ("11099","Boulevardier","Whiskey","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/km84qi1513705868.jpg","#8B2635",
     [("Bourbon","1.5 oz"),("Campari","1 oz"),("Sweet Vermouth","1 oz")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds.","Strain into chilled coupe.","Express orange peel and garnish."],
     ["classic","stirred","bitter"],"26%","3 min",True,True),

    ("11100","Toronto","Whiskey","Coupe",
     "https://images.unsplash.com/photo-1549919027-5af8791cba96?w=800&q=80","#D4A56A",
     [("Rye Whiskey","2 oz"),("Fernet-Branca","0.25 oz"),("Simple Syrup","0.25 oz"),("Angostura Bitters","2 dashes")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds.","Strain into chilled coupe.","Garnish with an orange twist."],
     ["modern","stirred","amaro"],"28%","3 min",True,True),

    ("11101","Black Manhattan","Whiskey","Coupe",
     "https://images.unsplash.com/photo-1591343395082-e120087004b4?w=800&q=80","#3D1A1A",
     [("Rye Whiskey","2 oz"),("Averna Amaro","1 oz"),("Angostura Bitters","1 dash"),("Orange Bitters","1 dash")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds.","Strain into chilled coupe.","Garnish with a brandied cherry."],
     ["modern","stirred","amaro"],"28%","3 min",True,True),

    ("11102","Irish Coffee","Whiskey","Heatproof Mug",
     "https://www.thecocktaildb.com/images/media/drink/sywsqw1439906999.jpg","#3D2B1F",
     [("Irish Whiskey","1.5 oz"),("Hot Coffee","4 oz"),("Brown Sugar","1 tsp"),("Heavy Cream","1 oz (lightly whipped)")],
     ["Warm heatproof mug with hot water, discard.","Add sugar and coffee, stir to dissolve.","Add whiskey.","Float lightly whipped cream on top.","Drink through the cream."],
     ["classic","hot","coffee"],"10%","3 min",True,True),

    ("11118","Vieux Carré","Whiskey","Rocks",
     "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=800&q=80","#D4A56A",
     [("Rye Whiskey","0.75 oz"),("Cognac","0.75 oz"),("Sweet Vermouth","0.75 oz"),("Bénédictine","1 tsp"),("Peychaud's Bitters","2 dashes"),("Angostura Bitters","2 dashes")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds.","Strain over large ice cube in rocks glass.","Garnish with a lemon or orange twist."],
     ["classic","stirred","new-orleans"],"26%","3 min",True,True),

    ("11121","New York Sour","Whiskey","Rocks",
     "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80","#8B2635",
     [("Bourbon","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Simple Syrup","0.75 oz"),("Egg White","1"),("Dry Red Wine","0.5 oz (float)")],
     ["Dry shake whiskey, lemon, syrup, and egg white 15 seconds.","Add ice and shake hard 12 seconds.","Strain over large ice in rocks glass.","Float red wine over back of spoon.","Garnish with a lemon wheel."],
     ["modern","citrus","visual"],"20%","3 min",True,True),

    ("11122","Rattlesnake","Whiskey","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/rtohqp1504889750.jpg","#F5E6CA",
     [("Rye Whiskey","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Simple Syrup","0.75 oz"),("Egg White","1"),("Absinthe","2 dashes")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Double-strain into chilled coupe.","Garnish with a lemon twist."],
     ["classic","citrus","prohibition"],"22%","3 min",True,True),

    # Gin
    ("11020","Negroni","Gin","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/qgdu971561574065.jpg","#D44000",
     [("Gin","1 oz"),("Campari","1 oz"),("Sweet Vermouth","1 oz")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds until well-chilled.","Strain over large ice cube in rocks glass.","Express orange peel, garnish."],
     ["classic","bitter","aperitivo"],"24%","3 min",True,True),

    ("11021","Martini","Gin","Martini",
     "https://www.thecocktaildb.com/images/media/drink/71t8581504353095.jpg","#F0F0E8",
     [("Gin","2.5 oz"),("Dry Vermouth","0.5 oz"),("Orange Bitters","1 dash")],
     ["Chill martini glass with ice water.","Combine gin and vermouth in mixing glass with ice.","Stir 40 seconds (very cold).","Strain into chilled martini glass.","Garnish with lemon twist or olive."],
     ["classic","stirred","spirit-forward"],"32%","4 min",True,True),

    ("11022","Gimlet","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/3xgldt1513707271.jpg","#C8E6C9",
     [("Gin","2 oz"),("Fresh Lime Juice","0.75 oz"),("Simple Syrup","0.75 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Double-strain into chilled coupe.","Garnish with a lime wheel."],
     ["classic","citrus","simple"],"22%","2 min",True,True),

    ("11023","Tom Collins","Gin","Collins",
     "https://www.thecocktaildb.com/images/media/drink/7cll921606854636.jpg","#E8F5E9",
     [("Gin","2 oz"),("Fresh Lemon Juice","1 oz"),("Simple Syrup","0.75 oz"),("Soda Water","2 oz")],
     ["Shake gin, lemon juice, and syrup with ice.","Strain into ice-filled Collins glass.","Top with soda water.","Stir gently. Garnish with lemon wheel and cherry."],
     ["classic","refreshing","long"],"12%","2 min",True,True),

    ("11024","French 75","Gin","Flute",
     "https://www.thecocktaildb.com/images/media/drink/hrxfbl1606773109.jpg","#F5E6CA",
     [("Gin","1.5 oz"),("Fresh Lemon Juice","0.75 oz"),("Simple Syrup","0.5 oz"),("Champagne","3 oz")],
     ["Combine gin, lemon, and syrup in shaker with ice.","Shake well and strain into flute.","Top with chilled champagne.","Garnish with a lemon twist."],
     ["classic","sparkling","celebration"],"18%","2 min",True,True),

    ("11081","Bramble","Gin","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/twtbh51630406392.jpg","#8B2635",
     [("Gin","2 oz"),("Fresh Lemon Juice","1 oz"),("Simple Syrup","0.5 oz"),("Crème de Mûre","0.5 oz (float)")],
     ["Shake gin, lemon, and syrup with ice.","Strain into rocks glass packed with crushed ice.","Drizzle crème de mûre over the top.","Garnish with blackberries and lemon wheel."],
     ["modern","fruity","british"],"20%","2 min",True,True),

    ("11082","Bee's Knees","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/tx8ne41582475326.jpg","#F5CBA7",
     [("Gin","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Honey Syrup","0.75 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Double-strain into chilled coupe.","Garnish with a lemon twist."],
     ["classic","citrus","prohibition"],"22%","2 min",True,True),

    ("11083","Last Word","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/91oule1513702624.jpg","#C8E6C9",
     [("Gin","0.75 oz"),("Green Chartreuse","0.75 oz"),("Maraschino Liqueur","0.75 oz"),("Fresh Lime Juice","0.75 oz")],
     ["Combine equal parts in shaker with ice.","Shake well and double-strain into chilled coupe.","No garnish needed."],
     ["classic","equal-parts","herbal"],"28%","2 min",True,True),

    ("11086","Aviation","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/trbplb1606855233.jpg","#C9B3D5",
     [("Gin","2 oz"),("Maraschino Liqueur","0.5 oz"),("Crème de Violette","0.25 oz"),("Fresh Lemon Juice","0.75 oz")],
     ["Combine all in shaker with ice.","Shake and double-strain into chilled coupe.","Garnish with a brandied cherry."],
     ["classic","floral","citrus"],"22%","2 min",True,True),

    ("11087","Vesper Martini","Gin","Martini",
     "https://www.thecocktaildb.com/images/media/drink/mtdxpa1504374514.jpg","#F0F0E8",
     [("Gin","3 oz"),("Vodka","1 oz"),("Lillet Blanc","0.5 oz")],
     ["Combine all in shaker with ice.","Shake until ice-cold (James Bond shakes his).","Strain into chilled martini glass.","Garnish with a long lemon twist."],
     ["classic","stirred","spirit-forward"],"32%","3 min",True,True),

    ("11088","Clover Club","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/t0aja61504348715.jpg","#FFB6C1",
     [("Gin","2 oz"),("Fresh Lemon Juice","0.75 oz"),("Raspberry Syrup","0.75 oz"),("Egg White","1")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Double-strain into chilled coupe.","Garnish with fresh raspberries."],
     ["classic","fruity","prohibition"],"18%","3 min",True,True),

    ("11089","White Lady","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/jofsaz1504352991.jpg","#F0F0E8",
     [("Gin","1.5 oz"),("Cointreau","1 oz"),("Fresh Lemon Juice","0.75 oz"),("Egg White","1")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Double-strain into chilled coupe.","Garnish with a lemon twist."],
     ["classic","citrus","prohibition"],"22%","3 min",True,True),

    ("11090","Singapore Sling","Gin","Collins",
     "https://www.thecocktaildb.com/images/media/drink/7dozeg1582578095.jpg","#FF69B4",
     [("Gin","1.5 oz"),("Cherry Heering","0.5 oz"),("Cointreau","0.25 oz"),("Bénédictine","0.25 oz"),("Grenadine","0.25 oz"),("Fresh Lime Juice","0.5 oz"),("Pineapple Juice","4 oz"),("Angostura Bitters","1 dash")],
     ["Combine all in shaker with ice.","Shake and strain into ice-filled Collins glass.","Garnish with pineapple slice and cherry."],
     ["classic","tropical","long"],"15%","3 min",True,True),

    ("11114","Elderflower Collins","Gin","Collins",
     "https://images.unsplash.com/photo-1496318447583-f524534e9ce1?w=800&q=80","#E8F5E9",
     [("Gin","1.5 oz"),("St-Germain Elderflower Liqueur","1 oz"),("Fresh Lemon Juice","0.75 oz"),("Soda Water","2 oz")],
     ["Shake gin, elderflower, and lemon with ice.","Strain into ice-filled Collins glass.","Top with soda water.","Garnish with cucumber slice and lemon wheel."],
     ["modern","floral","refreshing"],"14%","2 min",True,True),

    ("11117","Corpse Reviver No. 2","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/gifgao1513704334.jpg","#F5E6CA",
     [("Gin","0.75 oz"),("Cointreau","0.75 oz"),("Lillet Blanc","0.75 oz"),("Fresh Lemon Juice","0.75 oz"),("Absinthe","rinse")],
     ["Rinse chilled coupe with absinthe, discard excess.","Shake remaining ingredients with ice.","Double-strain into prepared coupe.","No garnish."],
     ["classic","equal-parts","brunch"],"22%","2 min",True,True),

    ("11124","Hanky Panky","Gin","Coupe",
     "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80","#D44000",
     [("Gin","1.5 oz"),("Sweet Vermouth","1.5 oz"),("Fernet-Branca","1 tsp")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds.","Strain into chilled coupe.","Garnish with an orange twist."],
     ["classic","stirred","amaro"],"24%","3 min",True,True),

    ("11125","Naked Martini","Gin","Martini",
     "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80","#F0F0E8",
     [("Gin","3 oz")],
     ["Chill martini glass thoroughly with ice water.","Strain ice-cold gin directly into glass.","Express lemon peel, garnish."],
     ["spirit-forward","minimal","stirred"],"40%","2 min",True,True),

    ("11126","Pink Lady","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/5ia6j21504887829.jpg","#FFB6C1",
     [("Gin","1.5 oz"),("Applejack","0.5 oz"),("Grenadine","0.5 oz"),("Fresh Lemon Juice","0.75 oz"),("Egg White","1")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Double-strain into chilled coupe.","Garnish with a cherry."],
     ["classic","fruity","prohibition"],"20%","3 min",True,True),

    ("11130","Tuxedo","Gin","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/4u0nbl1504352551.jpg","#F0F0E8",
     [("Gin","1.5 oz"),("Dry Sherry","1.5 oz"),("Maraschino Liqueur","0.25 oz"),("Orange Bitters","2 dashes"),("Absinthe","2 dashes")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds.","Strain into chilled coupe.","Garnish with a lemon twist and cherry."],
     ["classic","stirred","sherry"],"22%","3 min",True,True),

    # Vodka
    ("11030","Espresso Martini","Vodka","Martini",
     "https://www.thecocktaildb.com/images/media/drink/n0sx531504372951.jpg","#3D2B1F",
     [("Vodka","1.5 oz"),("Kahlúa","1 oz"),("Freshly Brewed Espresso","1 oz"),("Simple Syrup","0.25 oz")],
     ["Brew espresso and let cool slightly.","Combine all ingredients in shaker with ice.","Shake vigorously 15 seconds.","Double-strain into chilled martini glass.","Garnish with 3 coffee beans."],
     ["modern","coffee","after-dinner"],"20%","3 min",True,True),

    ("11031","Cosmopolitan","Vodka","Martini",
     "https://www.thecocktaildb.com/images/media/drink/kpsajh1504368362.jpg","#FF69B4",
     [("Citrus Vodka","1.5 oz"),("Cointreau","0.75 oz"),("Fresh Lime Juice","0.5 oz"),("Cranberry Juice","0.5 oz")],
     ["Combine all ingredients in shaker with ice.","Shake hard 12 seconds.","Strain into chilled martini glass.","Garnish with a lime wheel or flamed orange peel."],
     ["classic","fruity","citrus"],"22%","2 min",True,True),

    ("11032","Moscow Mule","Vodka","Copper Mug",
     "https://www.thecocktaildb.com/images/media/drink/3pylqc1504370988.jpg","#C8E6C9",
     [("Vodka","2 oz"),("Fresh Lime Juice","0.75 oz"),("Ginger Beer","4 oz")],
     ["Fill copper mug with ice.","Add vodka and lime juice.","Top with ginger beer.","Stir gently. Garnish with lime wedge and fresh mint."],
     ["classic","refreshing","ginger"],"10%","2 min",True,True),

    ("11033","Bloody Mary","Vodka","Pint",
     "https://www.thecocktaildb.com/images/media/drink/t6caa21582485702.jpg","#8B0000",
     [("Vodka","2 oz"),("Tomato Juice","4 oz"),("Fresh Lemon Juice","0.5 oz"),("Worcestershire Sauce","3 dashes"),("Hot Sauce","to taste"),("Celery Salt","pinch"),("Black Pepper","pinch")],
     ["Rim pint glass with celery salt.","Combine all ingredients in shaker without ice.","Roll gently between shaker tins.","Pour into prepared glass over ice.","Garnish with celery stalk, lemon wedge, olives."],
     ["brunch","savory","classic"],"12%","3 min",True,True),

    ("11103","Sex on the Beach","Vodka","Highball",
     "https://www.thecocktaildb.com/images/media/drink/fi67641668420787.jpg","#FF8C00",
     [("Vodka","1.5 oz"),("Peach Schnapps","1 oz"),("Orange Juice","2 oz"),("Cranberry Juice","2 oz")],
     ["Fill highball glass with ice.","Add vodka and peach schnapps.","Pour orange juice.","Float cranberry juice on top.","Garnish with an orange slice and cherry."],
     ["classic","fruity","sweet"],"12%","1 min",True,True),

    ("11104","Harvey Wallbanger","Vodka","Highball",
     "https://www.thecocktaildb.com/images/media/drink/7os4gs1606854357.jpg","#FFA500",
     [("Vodka","1.5 oz"),("Fresh Orange Juice","4 oz"),("Galliano","0.5 oz (float)")],
     ["Fill highball glass with ice.","Add vodka and orange juice, stir.","Float Galliano on top.","Garnish with an orange slice and cherry."],
     ["classic","fruity","retro"],"12%","1 min",True,True),

    ("11105","White Russian","Vodka","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/vsrupw1472405732.jpg","#F5E6CA",
     [("Vodka","2 oz"),("Kahlúa","1 oz"),("Heavy Cream","1 oz")],
     ["Fill rocks glass with ice.","Add vodka and Kahlúa.","Float cream on top.","Stir gently if desired."],
     ["classic","coffee","creamy"],"18%","1 min",True,True),

    ("11106","Black Russian","Vodka","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/8oxlqf1606772765.jpg","#1A0F00",
     [("Vodka","2 oz"),("Kahlúa","1 oz")],
     ["Fill rocks glass with ice.","Add vodka then Kahlúa.","Stir gently."],
     ["classic","coffee","simple"],"22%","1 min",True,True),

    ("11107","Pornstar Martini","Vodka","Martini",
     "https://www.thecocktaildb.com/images/media/drink/xjhjdf1630406071.jpg","#FFA500",
     [("Vanilla Vodka","2 oz"),("Passionfruit Liqueur","1 oz"),("Passionfruit Purée","0.5 oz"),("Fresh Lime Juice","0.5 oz"),("Prosecco","2 oz (side shot)")],
     ["Combine vodka, liqueur, purée, and lime in shaker with ice.","Shake vigorously 12 seconds.","Strain into chilled martini glass.","Float halved passionfruit on top.","Serve Prosecco in a shot glass on the side."],
     ["modern","fruity","tropical"],"18%","3 min",True,True),

    # Mezcal
    ("11040","Mezcal Negroni","Mezcal","Rocks",
     "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&q=80","#D44000",
     [("Mezcal","1 oz"),("Campari","1 oz"),("Sweet Vermouth","1 oz")],
     ["Combine all in mixing glass with ice.","Stir 30 seconds until well-chilled.","Strain over large ice cube in rocks glass.","Express orange peel, garnish."],
     ["smoky","bitter","aperitivo"],"24%","3 min",True,True),

    ("11041","Oaxacan Old Fashioned","Mezcal","Rocks",
     "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=800&q=80","#D4A56A",
     [("Reposado Tequila","1.5 oz"),("Mezcal","0.5 oz"),("Agave Syrup","1 tsp"),("Mole Bitters","2 dashes")],
     ["Combine all ingredients in mixing glass with ice.","Stir 30 seconds until well-chilled.","Strain over large ice cube in rocks glass.","Garnish with flamed orange peel."],
     ["smoky","stirred","modern"],"32%","3 min",True,True),

    ("11110","Naked and Famous","Mezcal","Coupe",
     "https://images.unsplash.com/photo-1559628233-100c798642d7?w=800&q=80","#FF8C00",
     [("Mezcal","0.75 oz"),("Aperol","0.75 oz"),("Yellow Chartreuse","0.75 oz"),("Fresh Lime Juice","0.75 oz")],
     ["Combine equal parts in shaker with ice.","Shake and double-strain into chilled coupe.","No garnish."],
     ["modern","equal-parts","smoky"],"22%","2 min",True,True),

    # Tequila additions
    ("11108","Tequila Sunrise","Tequila","Highball",
     "https://www.thecocktaildb.com/images/media/drink/quqyqp1480879103.jpg","#FF4500",
     [("Tequila Blanco","2 oz"),("Fresh Orange Juice","4 oz"),("Grenadine","0.5 oz")],
     ["Fill highball glass with ice.","Add tequila and orange juice, stir.","Slowly pour grenadine down the side.","Do not stir — let it create the sunrise gradient.","Garnish with an orange slice and cherry."],
     ["classic","fruity","visual"],"12%","1 min",True,True),

    ("11109","El Diablo","Tequila","Collins",
     "https://images.unsplash.com/photo-1583418855763-6c51a16f9b72?w=800&q=80","#8B0000",
     [("Tequila Reposado","1.5 oz"),("Crème de Cassis","0.5 oz"),("Fresh Lime Juice","0.5 oz"),("Ginger Beer","3 oz")],
     ["Fill Collins glass with ice.","Add tequila, cassis, and lime.","Top with ginger beer.","Stir gently. Garnish with a lime wedge."],
     ["classic","fruity","ginger"],"12%","1 min",True,True),

    # Aperitivo
    ("11050","Aperol Spritz","Aperitivo","Wine",
     "https://www.thecocktaildb.com/images/media/drink/iloasq1587661955.jpg","#FF8C00",
     [("Aperol","3 oz"),("Prosecco","3 oz"),("Soda Water","1 oz")],
     ["Fill wine glass with ice.","Add Aperol.","Top with Prosecco.","Add a splash of soda water.","Stir gently. Garnish with orange slice."],
     ["classic","low-abv","aperitivo","sparkling"],"11%","1 min",True,True),

    ("11051","Americano","Aperitivo","Rocks",
     "https://www.thecocktaildb.com/images/media/drink/709s6m1613655124.jpg","#D44000",
     [("Campari","1.5 oz"),("Sweet Vermouth","1.5 oz"),("Soda Water","splash")],
     ["Fill rocks glass with ice.","Add Campari and sweet vermouth.","Top with a splash of soda water.","Stir gently. Garnish with orange peel."],
     ["classic","low-abv","aperitivo"],"12%","1 min",True,True),

    ("11112","Garibaldi","Aperitivo","Highball",
     "https://images.unsplash.com/photo-1525385444278-b7968a0f4284?w=800&q=80","#FF4500",
     [("Campari","2 oz"),("Fluffy Orange Juice","4 oz (freshly juiced)")],
     ["Fill highball with ice.","Add Campari.","Juice oranges directly into glass (or pour and fluff).","Stir gently. Garnish with orange slice."],
     ["low-abv","aperitivo","simple"],"10%","1 min",True,True),

    ("11115","Aperol Hugo","Aperitivo","Wine",
     "https://images.unsplash.com/photo-1502819682485-4bfc47a3ef35?w=800&q=80","#FFA500",
     [("Aperol","1 oz"),("St-Germain Elderflower Liqueur","0.5 oz"),("Prosecco","3 oz"),("Soda Water","1 oz"),("Fresh Mint","2 sprigs")],
     ["Fill wine glass with ice.","Add Aperol and elderflower liqueur.","Top with Prosecco and soda.","Stir gently. Garnish with mint and lime wheel."],
     ["low-abv","sparkling","floral","aperitivo"],"10%","1 min",True,True),

    # Champagne
    ("11070","Bellini","Champagne","Flute",
     "https://www.thecocktaildb.com/images/media/drink/eaag491504367543.jpg","#FFDAB9",
     [("Prosecco","4 oz"),("White Peach Purée","2 oz")],
     ["Pour peach purée into chilled flute.","Slowly pour Prosecco over purée.","Stir gently once.","Serve immediately."],
     ["brunch","sweet","sparkling","low-abv"],"10%","1 min",True,True),

    ("11071","Mimosa","Champagne","Flute",
     "https://www.thecocktaildb.com/images/media/drink/juhcuu1504370685.jpg","#FFA500",
     [("Champagne or Prosecco","3 oz"),("Fresh Orange Juice","3 oz")],
     ["Chill flute.","Pour orange juice first.","Slowly top with champagne.","Do not stir."],
     ["brunch","classic","low-abv"],"8%","1 min",True,True),

    ("11113","Kir Royale","Champagne","Flute",
     "https://www.thecocktaildb.com/images/media/drink/yt9i7n1504370388.jpg","#8B2635",
     [("Crème de Cassis","0.5 oz"),("Champagne or Prosecco","5 oz")],
     ["Pour crème de cassis into chilled flute.","Slowly top with chilled champagne.","Do not stir.","Garnish with a fresh blackberry."],
     ["classic","sparkling","celebration","low-abv"],"10%","1 min",True,True),

    # Brandy
    ("11060","Sidecar","Brandy","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/x72sik1606854964.jpg","#F5E6CA",
     [("Cognac","2 oz"),("Cointreau","0.75 oz"),("Fresh Lemon Juice","0.75 oz")],
     ["Sugar rim coupe (optional).","Combine all in shaker with ice.","Shake hard 12 seconds.","Strain into prepared coupe.","Garnish with a lemon twist."],
     ["classic","citrus","elegant"],"26%","2 min",True,True),

    ("11116","Brandy Alexander","Brandy","Coupe",
     "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&q=80","#F5E6CA",
     [("Cognac","1.5 oz"),("Crème de Cacao (dark)","1 oz"),("Heavy Cream","1 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Strain into chilled coupe.","Garnish with fresh grated nutmeg."],
     ["classic","creamy","after-dinner"],"22%","2 min",True,True),

    ("11128","Stinger","Brandy","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/2ahv791504352433.jpg","#F0F0E8",
     [("Cognac","2 oz"),("Crème de Menthe (white)","0.75 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Strain into chilled coupe.","Garnish with a mint leaf."],
     ["classic","after-dinner","minty"],"28%","2 min",True,True),

    ("11129","Between the Sheets","Brandy","Coupe",
     "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80","#F5E6CA",
     [("Cognac","1 oz"),("White Rum","1 oz"),("Cointreau","1 oz"),("Fresh Lemon Juice","0.5 oz")],
     ["Combine all in shaker with ice.","Shake and double-strain into chilled coupe.","Garnish with a lemon twist."],
     ["classic","citrus","prohibition"],"26%","2 min",True,True),

    # Other
    ("11111","Pisco Sour","Pisco","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/tsssur1439907622.jpg","#F5E6CA",
     [("Pisco","2 oz"),("Fresh Lime Juice","1 oz"),("Simple Syrup","0.75 oz"),("Egg White","1")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Strain into chilled coupe.","Apply 3 drops Angostura bitters on foam, draw pattern with toothpick."],
     ["classic","citrus","south-american"],"20%","3 min",True,True),

    ("11119","Amaretto Sour","Amaretto","Rocks",
     "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80","#D4A56A",
     [("Amaretto","1.5 oz"),("Cask-strength Bourbon","0.75 oz"),("Fresh Lemon Juice","1 oz"),("Simple Syrup","0.25 oz"),("Egg White","1")],
     ["Dry shake all ingredients 15 seconds.","Add ice and shake hard 12 seconds.","Strain over large ice in rocks glass.","Garnish with a lemon wheel and brandied cherry."],
     ["modern","citrus","nutty"],"20%","3 min",True,True),

    ("11127","Grasshopper","Liqueur","Coupe",
     "https://www.thecocktaildb.com/images/media/drink/aqm9el1504369613.jpg","#C8E6C9",
     [("Crème de Menthe (green)","1 oz"),("Crème de Cacao (white)","1 oz"),("Heavy Cream","1 oz")],
     ["Combine all in shaker with ice.","Shake vigorously 12 seconds.","Strain into chilled coupe.","Garnish with a mint sprig."],
     ["classic","creamy","after-dinner"],"18%","2 min",True,True),
]

assert len(COCKTAILS) == 79, f"Expected 79 cocktails, got {len(COCKTAILS)}"


def main():
    lines = []
    lines.append("-- D1 seed: 0006_seed_cocktails.sql")
    lines.append("-- Auto-generated by generate_seed.py — do not edit by hand.")
    lines.append("-- Uses INSERT OR REPLACE so re-runs are idempotent.")
    lines.append("")

    # Collect all unique ingredients and tags
    all_ingredient_names = set()
    all_tag_names = set()
    for row in COCKTAILS:
        _, _, _, _, _, _, ings, _, tags, *_ = row
        for ing_name, _ in ings:
            all_ingredient_names.add(ing_name)
        for tag in tags:
            all_tag_names.add(tag)

    # Insert / replace ingredients
    lines.append("-- ── Ingredients ────────────────────────────────────────────────────────────")
    for name in sorted(all_ingredient_names):
        iid = uid_ingredient(name)
        # Best-effort category assignment
        cat = "Other"
        nl = name.lower()
        if any(w in nl for w in ["rum","cachaça"]):          cat = "Rum"
        elif any(w in nl for w in ["tequila","mezcal","agave"]):  cat = "Tequila"
        elif "gin" in nl and "ginger" not in nl:             cat = "Gin"
        elif any(w in nl for w in ["whiskey","whisky","bourbon","scotch","rye","fernet","drambuie","amaro","averna"]):
                                                              cat = "Whiskey"
        elif any(w in nl for w in ["vodka"]):                cat = "Vodka"
        elif any(w in nl for w in ["cognac","brandy","pisco","applejack","armagnac"]): cat = "Brandy"
        elif any(w in nl for w in ["champagne","prosecco"]):  cat = "Champagne"
        elif any(w in nl for w in ["campari","aperol","vermouth","lillet","chartreuse","cointreau","kahlúa","maraschino","curaçao","liqueur","schnapps","crème","créme"]): cat = "Liqueur"
        elif any(w in nl for w in ["juice","soda","water","ginger beer","coffee","espresso","cream","egg","milk","tomato","coconut","pineapple"]): cat = "Mixer"
        elif any(w in nl for w in ["bitters","syrup","sugar","honey","salt","pepper","sauce","orgeat","grenadine","purée","puree"]): cat = "Modifier"
        elif any(w in nl for w in ["lime","lemon","orange","grapefruit","mint","blackberry","raspberry","cucumber","jalapeño"]): cat = "Garnish/Fresh"

        lines.append(
            f"INSERT OR REPLACE INTO ingredients (id, name, category) VALUES "
            f"({esc(iid)}, {esc(name)}, {esc(cat)});"
        )
    lines.append("")

    # Insert / replace tags
    lines.append("-- ── Tags ────────────────────────────────────────────────────────────────────")
    for name in sorted(all_tag_names):
        tid = uid_tag(name)
        lines.append(
            f"INSERT OR IGNORE INTO tags (id, name) VALUES ({esc(tid)}, {esc(name)});"
        )
    lines.append("")

    # Insert / replace cocktails
    lines.append("-- ── Cocktails ───────────────────────────────────────────────────────────────")
    for row in COCKTAILS:
        (cid, name, category, glass, img, color,
         ings, steps, tags, abv, time_to_make, vegan, gluten_free) = row
        slug = slugify(name)
        low_abv = int(abv.rstrip("%")) < 15
        steps_json = json.dumps(steps)
        # method = first step for backward compat
        method = steps[0] if steps else ""

        lines.append(
            f"INSERT OR REPLACE INTO cocktails "
            f"(id, name, slug, description, method, garnish, glassware, "
            f" category, img, color, abv, time_to_make, vegan, gluten_free, steps_json) "
            f"VALUES ("
            f"{esc(cid)}, {esc(name)}, {esc(slug)}, NULL, {esc(method)}, NULL, {esc(glass)}, "
            f"{esc(category)}, {esc(img)}, {esc(color)}, {esc(abv)}, {esc(time_to_make)}, "
            f"{1 if vegan else 0}, {1 if gluten_free else 0}, {esc(steps_json)}"
            f");"
        )

        # cocktail_ingredients
        for ing_name, amount in ings:
            iid = uid_ingredient(ing_name)
            lines.append(
                f"INSERT OR REPLACE INTO cocktail_ingredients "
                f"(cocktail_id, ingredient_id, amount, quantity, unit) "
                f"VALUES ({esc(cid)}, {esc(iid)}, {esc(amount)}, NULL, NULL);"
            )

        # cocktail_tags
        for tag in tags:
            tid = uid_tag(tag)
            lines.append(
                f"INSERT OR IGNORE INTO cocktail_tags (cocktail_id, tag_id) "
                f"VALUES ({esc(cid)}, {esc(tid)});"
            )

        lines.append("")

    print("\n".join(lines))


if __name__ == "__main__":
    main()
