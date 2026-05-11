/**
 * Typed cocktail data extracted from the BarIQ standalone HTML template.
 * Shape mirrors TheCocktailDB with BarIQ-specific extensions.
 */

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Cocktail {
  id: string;
  name: string;
  category: string;
  glass: string;
  img: string;
  color: string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  abv: string;
  time: string;
  vegan: boolean;
  glutenFree: boolean;
  lowAbv: boolean;
  /** URL-safe slug derived from name */
  slug: string;
}

// Unsplash image map (fallback URLs matching source template)
const IMG: Record<string, string> = {
  margarita:   "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
  oldfashioned:"https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800&q=80",
  negroni:     "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=800&q=80",
  daiquiri:    "https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=800&q=80",
  espresso:    "https://images.unsplash.com/photo-1686098180667-19da1afdd8aa?w=800&q=80",
  sour:        "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&q=80",
  mojito:      "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80",
  manhattan:   "https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=800&q=80",
  spritz:      "https://images.unsplash.com/photo-1560963689-b5682b6440f8?w=800&q=80",
  penicillin:  "https://images.unsplash.com/photo-1609345216223-ad979fd90091?w=800&q=80",
  paloma:      "https://images.unsplash.com/photo-1541546006121-5c3bc5e8c7b9?w=800&q=80",
  martini:     "https://images.unsplash.com/photo-1575023782549-62ca19d4b3fa?w=800&q=80",
  cosmo:       "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80",
  moscowmule:  "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=800&q=80",
  bloodymary:  "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=800&q=80",
  pinacolada:  "https://images.unsplash.com/photo-1601924575611-b1ad13a85d22?w=800&q=80",
  mintjulep:   "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80",
  sazerac:     "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&q=80",
  gimlet:      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
  tequilasunrise: "https://images.unsplash.com/photo-1569338100773-f4f0e2c63c0d?w=800&q=80",
  darkandstormy:  "https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=800&q=80",
  hurricane:      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80",
  mai_tai:        "https://images.unsplash.com/photo-1560679906-8c90c8640b3d?w=800&q=80",
  singapore:      "https://images.unsplash.com/photo-1570869031823-8d42a0e32f43?w=800&q=80",
  caipirinha:     "https://images.unsplash.com/photo-1625329561695-1d38a2b6a72f?w=800&q=80",
  pisco:          "https://images.unsplash.com/photo-1524592714635-d77511a4834d?w=800&q=80",
  elderflower:    "https://images.unsplash.com/photo-1580170770946-cf7d0af98bd6?w=800&q=80",
  pornstar:       "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&q=80",
  kir:            "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&q=80",
};

function img(key: string): string {
  return IMG[key] ?? IMG.margarita;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function C(
  id: string,
  name: string,
  category: string,
  glass: string,
  imgKey: string,
  color: string,
  rawIngredients: [string, string][],
  steps: string[],
  tags: string[] = [],
  abv = "20%",
  time = "2 min",
  dietary: { vegan?: boolean; glutenFree?: boolean } = {}
): Cocktail {
  return {
    id,
    name,
    category,
    glass,
    img: img(imgKey),
    color,
    ingredients: rawIngredients.map(([n, a]) => ({ name: n, amount: a })),
    steps,
    tags,
    abv,
    time,
    vegan: dietary.vegan !== false,
    glutenFree: dietary.glutenFree !== false,
    lowAbv: parseInt(abv) < 15,
    slug: slugify(name),
  };
}

export const COCKTAILS: Cocktail[] = [
  // ── Tequila ──────────────────────────────────────────────────────────────
  C("11007", "Margarita", "Tequila", "Coupe", "margarita", "#D4E8A8",
    [["Tequila Blanco", "2 oz"], ["Fresh Lime Juice", "1 oz"], ["Cointreau", "0.75 oz"], ["Agave Syrup", "0.25 oz"], ["Kosher Salt", "rim"]],
    ["Rim chilled coupe with salt (half rim only).", "Combine all liquids in shaker with ice.", "Shake hard 12 seconds until well-chilled.", "Double-strain into prepared coupe.", "Garnish with a lime wheel."],
    ["classic", "citrus", "summer"], "22%", "2 min"),

  C("11008", "Tommy's Margarita", "Tequila", "Rocks", "margarita", "#D4E8A8",
    [["Tequila Blanco", "2 oz"], ["Fresh Lime Juice", "1 oz"], ["Agave Syrup", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake hard 12 seconds.", "Strain over fresh ice in a rocks glass.", "Garnish with a lime wheel."],
    ["classic", "citrus", "vegan"], "18%", "2 min", { vegan: true }),

  C("11009", "Paloma", "Tequila", "Highball", "paloma", "#FFB347",
    [["Tequila Blanco", "2 oz"], ["Fresh Grapefruit Juice", "3 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Agave Syrup", "0.5 oz"], ["Pinch of Salt", "pinch"], ["Soda Water", "top"]],
    ["Salt rim a highball glass (optional).", "Build tequila, grapefruit, lime, agave over ice.", "Top with soda water.", "Stir gently. Garnish with grapefruit wedge."],
    ["classic", "citrus", "refreshing"], "12%", "2 min", { vegan: true }),

  C("11010", "Jalapeño Margarita", "Tequila", "Coupe", "margarita", "#A8D8A8",
    [["Tequila Blanco", "2 oz"], ["Fresh Lime Juice", "1 oz"], ["Cointreau", "0.75 oz"], ["Agave Syrup", "0.25 oz"], ["Fresh Jalapeño", "2 slices"]],
    ["Muddle jalapeño slices in shaker.", "Add remaining ingredients with ice.", "Shake hard 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a jalapeño wheel."],
    ["spicy", "citrus", "modern"], "22%", "3 min"),

  // ── Rum ──────────────────────────────────────────────────────────────────
  C("11004", "Daiquiri", "Rum", "Coupe", "daiquiri", "#F5E6CA",
    [["White Rum", "2 oz"], ["Fresh Lime Juice", "0.75 oz"], ["Simple Syrup", "0.75 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Double-strain into chilled coupe.", "No garnish — let the balance speak."],
    ["classic", "citrus", "simple"], "18%", "2 min", { vegan: true }),

  C("11005", "Mojito", "Rum", "Highball", "mojito", "#C8E6C9",
    [["White Rum", "2 oz"], ["Fresh Lime Juice", "0.75 oz"], ["Simple Syrup", "0.75 oz"], ["Fresh Mint", "8 leaves"], ["Soda Water", "top"]],
    ["Gently muddle mint with syrup in highball glass.", "Add lime juice and rum.", "Fill with crushed ice.", "Top with soda water. Stir briefly.", "Garnish with mint sprig."],
    ["classic", "refreshing", "summer"], "14%", "3 min", { vegan: true }),

  C("11006", "Piña Colada", "Rum", "Hurricane", "pinacolada", "#FFF8DC",
    [["White Rum", "2 oz"], ["Coconut Cream", "1.5 oz"], ["Pineapple Juice", "2 oz"]],
    ["Blend all ingredients with 1 cup crushed ice until smooth.", "Pour into chilled hurricane glass.", "Garnish with a pineapple wedge and cherry."],
    ["tropical", "frozen", "sweet"], "14%", "3 min", { vegan: true }),

  // ── Whiskey ───────────────────────────────────────────────────────────────
  C("11001", "Old Fashioned", "Whiskey", "Rocks", "oldfashioned", "#D4A56A",
    [["Bourbon or Rye", "2 oz"], ["Simple Syrup", "0.25 oz"], ["Angostura Bitters", "2 dashes"], ["Orange Bitters", "1 dash"]],
    ["Add sugar, bitters and a splash of water to rocks glass.", "Stir until sugar dissolves.", "Add a large ice cube.", "Pour bourbon over ice.", "Express orange peel, rub rim, garnish."],
    ["classic", "stirred", "spirit-forward"], "32%", "3 min"),

  C("11002", "Manhattan", "Whiskey", "Coupe", "manhattan", "#8B2635",
    [["Rye Whiskey", "2 oz"], ["Sweet Vermouth", "1 oz"], ["Angostura Bitters", "2 dashes"]],
    ["Combine all ingredients in mixing glass with ice.", "Stir 30 seconds until well-chilled.", "Strain into chilled coupe.", "Garnish with a brandied cherry."],
    ["classic", "stirred", "spirit-forward"], "28%", "3 min"),

  C("11003", "Whiskey Sour", "Whiskey", "Rocks", "sour", "#F5CBA7",
    [["Bourbon", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Simple Syrup", "0.75 oz"], ["Egg White", "1 (optional)"]],
    ["Dry shake all ingredients (no ice) 15 seconds if using egg white.", "Add ice and shake hard 12 seconds.", "Strain into rocks glass over ice.", "Garnish with a lemon wheel and cherry."],
    ["classic", "citrus", "sour"], "20%", "3 min"),

  C("11014", "Sazerac", "Whiskey", "Rocks", "sazerac", "#D4A56A",
    [["Rye Whiskey", "2 oz"], ["Demerara Syrup", "0.25 oz"], ["Peychaud's Bitters", "3 dashes"], ["Angostura Bitters", "1 dash"], ["Absinthe", "rinse"]],
    ["Rinse a chilled rocks glass with absinthe, discard excess.", "In mixing glass, combine rye, syrup, bitters with ice.", "Stir 30 seconds.", "Strain into prepared glass.", "Express lemon peel over drink; discard peel (or garnish)."],
    ["classic", "stirred", "new-orleans"], "32%", "4 min"),

  C("11015", "Mint Julep", "Whiskey", "Julep Tin", "mintjulep", "#C8E6C9",
    [["Bourbon", "2.5 oz"], ["Simple Syrup", "0.5 oz"], ["Fresh Mint", "10 leaves"], ["Powdered Sugar", "pinch"]],
    ["Gently muddle mint with syrup in julep tin.", "Pack tin with crushed ice.", "Pour bourbon over ice.", "Stir briefly, top with more crushed ice.", "Garnish with a bouquet of mint, dust with powdered sugar."],
    ["classic", "refreshing", "derby"], "26%", "3 min"),

  // ── Gin ──────────────────────────────────────────────────────────────────
  C("11020", "Negroni", "Gin", "Rocks", "negroni", "#D44000",
    [["Gin", "1 oz"], ["Campari", "1 oz"], ["Sweet Vermouth", "1 oz"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds until well-chilled.", "Strain over large ice cube in rocks glass.", "Express orange peel, garnish."],
    ["classic", "bitter", "aperitivo"], "24%", "3 min"),

  C("11021", "Martini", "Gin", "Martini", "martini", "#F0F0E8",
    [["Gin", "2.5 oz"], ["Dry Vermouth", "0.5 oz"], ["Orange Bitters", "1 dash"]],
    ["Chill martini glass with ice water.", "Combine gin and vermouth in mixing glass with ice.", "Stir 40 seconds (very cold).", "Strain into chilled martini glass.", "Garnish with lemon twist or olive."],
    ["classic", "stirred", "spirit-forward"], "32%", "4 min"),

  C("11022", "Gimlet", "Gin", "Coupe", "gimlet", "#C8E6C9",
    [["Gin", "2 oz"], ["Fresh Lime Juice", "0.75 oz"], ["Simple Syrup", "0.75 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a lime wheel."],
    ["classic", "citrus", "simple"], "22%", "2 min"),

  C("11023", "Tom Collins", "Gin", "Collins", "negroni", "#E8F5E9",
    [["Gin", "2 oz"], ["Fresh Lemon Juice", "1 oz"], ["Simple Syrup", "0.75 oz"], ["Soda Water", "2 oz"]],
    ["Shake gin, lemon juice, and syrup with ice.", "Strain into ice-filled Collins glass.", "Top with soda water.", "Stir gently. Garnish with lemon wheel and cherry."],
    ["classic", "refreshing", "long"], "12%", "2 min"),

  C("11024", "French 75", "Gin", "Flute", "spritz", "#F5E6CA",
    [["Gin", "1.5 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Simple Syrup", "0.5 oz"], ["Champagne", "3 oz"]],
    ["Combine gin, lemon, and syrup in shaker with ice.", "Shake well and strain into flute.", "Top with chilled champagne.", "Garnish with a lemon twist."],
    ["classic", "sparkling", "celebration"], "18%", "2 min"),

  // ── Vodka ─────────────────────────────────────────────────────────────────
  C("11030", "Espresso Martini", "Vodka", "Martini", "espresso", "#3D2B1F",
    [["Vodka", "1.5 oz"], ["Kahlúa", "1 oz"], ["Freshly Brewed Espresso", "1 oz"], ["Simple Syrup", "0.25 oz"]],
    ["Brew espresso and let cool slightly.", "Combine all ingredients in shaker with ice.", "Shake vigorously 15 seconds.", "Double-strain into chilled martini glass.", "Garnish with 3 coffee beans."],
    ["modern", "coffee", "after-dinner"], "20%", "3 min"),

  C("11031", "Cosmopolitan", "Vodka", "Martini", "cosmo", "#FF69B4",
    [["Citrus Vodka", "1.5 oz"], ["Cointreau", "0.75 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Cranberry Juice", "0.5 oz"]],
    ["Combine all ingredients in shaker with ice.", "Shake hard 12 seconds.", "Strain into chilled martini glass.", "Garnish with a lime wheel or flamed orange peel."],
    ["classic", "fruity", "citrus"], "22%", "2 min"),

  C("11032", "Moscow Mule", "Vodka", "Copper Mug", "moscowmule", "#C8E6C9",
    [["Vodka", "2 oz"], ["Fresh Lime Juice", "0.75 oz"], ["Ginger Beer", "4 oz"]],
    ["Fill copper mug with ice.", "Add vodka and lime juice.", "Top with ginger beer.", "Stir gently. Garnish with lime wedge and fresh mint."],
    ["classic", "refreshing", "ginger"], "10%", "2 min", { vegan: true }),

  C("11033", "Bloody Mary", "Vodka", "Pint", "bloodymary", "#8B0000",
    [["Vodka", "2 oz"], ["Tomato Juice", "4 oz"], ["Fresh Lemon Juice", "0.5 oz"], ["Worcestershire Sauce", "3 dashes"], ["Hot Sauce", "to taste"], ["Celery Salt", "pinch"], ["Black Pepper", "pinch"]],
    ["Rim pint glass with celery salt.", "Combine all ingredients in shaker without ice.", "Roll gently between shaker tins.", "Pour into prepared glass over ice.", "Garnish with celery stalk, lemon wedge, olives."],
    ["brunch", "savory", "classic"], "12%", "3 min"),

  // ── Mezcal ───────────────────────────────────────────────────────────────
  C("11040", "Mezcal Negroni", "Mezcal", "Rocks", "negroni", "#D44000",
    [["Mezcal", "1 oz"], ["Campari", "1 oz"], ["Sweet Vermouth", "1 oz"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds until well-chilled.", "Strain over large ice cube in rocks glass.", "Express orange peel, garnish."],
    ["smoky", "bitter", "aperitivo"], "24%", "3 min"),

  C("11041", "Oaxacan Old Fashioned", "Mezcal", "Rocks", "oldfashioned", "#D4A56A",
    [["Reposado Tequila", "1.5 oz"], ["Mezcal", "0.5 oz"], ["Agave Syrup", "1 tsp"], ["Mole Bitters", "2 dashes"]],
    ["Combine all ingredients in mixing glass with ice.", "Stir 30 seconds until well-chilled.", "Strain over large ice cube in rocks glass.", "Garnish with flamed orange peel."],
    ["smoky", "stirred", "modern"], "32%", "3 min"),

  // ── Aperitivo ─────────────────────────────────────────────────────────────
  C("11050", "Aperol Spritz", "Aperitivo", "Wine", "spritz", "#FF8C00",
    [["Aperol", "3 oz"], ["Prosecco", "3 oz"], ["Soda Water", "1 oz"]],
    ["Fill wine glass with ice.", "Add Aperol.", "Top with Prosecco.", "Add a splash of soda water.", "Stir gently. Garnish with orange slice."],
    ["classic", "low-abv", "aperitivo", "sparkling"], "11%", "1 min", { vegan: true }),

  C("11051", "Americano", "Aperitivo", "Rocks", "negroni", "#D44000",
    [["Campari", "1.5 oz"], ["Sweet Vermouth", "1.5 oz"], ["Soda Water", "splash"]],
    ["Fill rocks glass with ice.", "Add Campari and sweet vermouth.", "Top with a splash of soda water.", "Stir gently. Garnish with orange peel."],
    ["classic", "low-abv", "aperitivo"], "12%", "1 min"),

  // ── Brandy/Cognac ─────────────────────────────────────────────────────────
  C("11060", "Sidecar", "Brandy", "Coupe", "daiquiri", "#F5E6CA",
    [["Cognac", "2 oz"], ["Cointreau", "0.75 oz"], ["Fresh Lemon Juice", "0.75 oz"]],
    ["Sugar rim coupe (optional).", "Combine all in shaker with ice.", "Shake hard 12 seconds.", "Strain into prepared coupe.", "Garnish with a lemon twist."],
    ["classic", "citrus", "elegant"], "26%", "2 min"),

  // ── Champagne / Wine ──────────────────────────────────────────────────────
  C("11070", "Bellini", "Champagne", "Flute", "spritz", "#FFDAB9",
    [["Prosecco", "4 oz"], ["White Peach Purée", "2 oz"]],
    ["Pour peach purée into chilled flute.", "Slowly pour Prosecco over purée.", "Stir gently once.", "Serve immediately."],
    ["brunch", "sweet", "sparkling", "low-abv"], "10%", "1 min", { vegan: true }),

  C("11071", "Mimosa", "Champagne", "Flute", "spritz", "#FFA500",
    [["Champagne or Prosecco", "3 oz"], ["Fresh Orange Juice", "3 oz"]],
    ["Chill flute.", "Pour orange juice first.", "Slowly top with champagne.", "Do not stir."],
    ["brunch", "classic", "low-abv"], "8%", "1 min", { vegan: true }),

  // ── Modern Classics ───────────────────────────────────────────────────────
  C("11080", "Penicillin", "Whiskey", "Rocks", "penicillin", "#D4A56A",
    [["Blended Scotch", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Honey-Ginger Syrup", "0.75 oz"], ["Islay Scotch Float", "0.25 oz"]],
    ["Combine blended scotch, lemon, and syrup in shaker with ice.", "Shake vigorously 12 seconds.", "Strain over large ice cube in rocks glass.", "Float Islay scotch on top by pouring over back of spoon.", "Garnish with candied ginger."],
    ["modern", "smoky", "citrus"], "22%", "3 min"),

  C("11081", "Bramble", "Gin", "Rocks", "negroni", "#8B2635",
    [["Gin", "2 oz"], ["Fresh Lemon Juice", "1 oz"], ["Simple Syrup", "0.5 oz"], ["Crème de Mûre", "0.5 oz (float)"]],
    ["Shake gin, lemon, and syrup with ice.", "Strain into rocks glass packed with crushed ice.", "Drizzle crème de mûre over the top.", "Garnish with blackberries and lemon wheel."],
    ["modern", "fruity", "british"], "20%", "2 min"),

  C("11082", "Bee's Knees", "Gin", "Coupe", "gimlet", "#F5CBA7",
    [["Gin", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Honey Syrup", "0.75 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a lemon twist."],
    ["classic", "citrus", "prohibition"], "22%", "2 min"),

  C("11083", "Last Word", "Gin", "Coupe", "gimlet", "#C8E6C9",
    [["Gin", "0.75 oz"], ["Green Chartreuse", "0.75 oz"], ["Maraschino Liqueur", "0.75 oz"], ["Fresh Lime Juice", "0.75 oz"]],
    ["Combine equal parts in shaker with ice.", "Shake well and double-strain into chilled coupe.", "No garnish needed."],
    ["classic", "equal-parts", "herbal"], "28%", "2 min"),

  C("11084", "Paper Plane", "Whiskey", "Coupe", "sour", "#F5CBA7",
    [["Bourbon", "0.75 oz"], ["Aperol", "0.75 oz"], ["Amaro Nonino", "0.75 oz"], ["Fresh Lemon Juice", "0.75 oz"]],
    ["Combine equal parts in shaker with ice.", "Shake well and double-strain into chilled coupe.", "No garnish."],
    ["modern", "equal-parts", "citrus"], "22%", "2 min"),

  C("11085", "Gold Rush", "Whiskey", "Rocks", "sazerac", "#F5CBA7",
    [["Bourbon", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Honey Syrup", "0.75 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Strain over large ice cube in rocks glass.", "Garnish with a lemon twist."],
    ["modern", "citrus", "easy"], "22%", "2 min"),

  C("11086", "Aviation", "Gin", "Coupe", "martini", "#C9B3D5",
    [["Gin", "2 oz"], ["Maraschino Liqueur", "0.5 oz"], ["Crème de Violette", "0.25 oz"], ["Fresh Lemon Juice", "0.75 oz"]],
    ["Combine all in shaker with ice.", "Shake and double-strain into chilled coupe.", "Garnish with a brandied cherry."],
    ["classic", "floral", "citrus"], "22%", "2 min"),

  C("11087", "Vesper Martini", "Gin", "Martini", "martini", "#F0F0E8",
    [["Gin", "3 oz"], ["Vodka", "1 oz"], ["Lillet Blanc", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake until ice-cold (James Bond shakes his).", "Strain into chilled martini glass.", "Garnish with a long lemon twist."],
    ["classic", "stirred", "spirit-forward"], "32%", "3 min"),

  C("11088", "Clover Club", "Gin", "Coupe", "cosmo", "#FFB6C1",
    [["Gin", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Raspberry Syrup", "0.75 oz"], ["Egg White", "1"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Double-strain into chilled coupe.", "Garnish with fresh raspberries."],
    ["classic", "fruity", "prohibition"], "18%", "3 min"),

  C("11089", "White Lady", "Gin", "Coupe", "martini", "#F0F0E8",
    [["Gin", "1.5 oz"], ["Cointreau", "1 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Egg White", "1"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a lemon twist."],
    ["classic", "citrus", "prohibition"], "22%", "3 min"),

  C("11090", "Singapore Sling", "Gin", "Collins", "singapore", "#FF69B4",
    [["Gin", "1.5 oz"], ["Cherry Heering", "0.5 oz"], ["Cointreau", "0.25 oz"], ["Bénédictine", "0.25 oz"], ["Grenadine", "0.25 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Pineapple Juice", "4 oz"], ["Angostura Bitters", "1 dash"]],
    ["Combine all in shaker with ice.", "Shake and strain into ice-filled Collins glass.", "Garnish with pineapple slice and cherry."],
    ["classic", "tropical", "long"], "15%", "3 min"),

  // ── Rum additions ─────────────────────────────────────────────────────────
  C("11091", "Dark 'n' Stormy", "Rum", "Highball", "darkandstormy", "#3D2B1F",
    [["Gosling's Black Seal Rum", "2 oz"], ["Ginger Beer", "4 oz"], ["Fresh Lime Juice", "0.5 oz"]],
    ["Fill highball glass with ice.", "Pour lime juice over ice.", "Add rum.", "Top with ginger beer — do not stir.", "Garnish with a lime wedge."],
    ["classic", "ginger", "tropical"], "10%", "1 min", { vegan: true }),

  C("11092", "Hurricane", "Rum", "Hurricane", "hurricane", "#FF4500",
    [["White Rum", "1 oz"], ["Dark Rum", "1 oz"], ["Passionfruit Syrup", "1 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Fresh Orange Juice", "1 oz"], ["Grenadine", "0.25 oz"]],
    ["Combine all in shaker with ice.", "Shake and strain into hurricane glass over ice.", "Garnish with orange slice and cherry."],
    ["tropical", "fruity", "new-orleans"], "14%", "2 min", { vegan: true }),

  C("11093", "Mai Tai", "Rum", "Rocks", "mai_tai", "#FF8C00",
    [["Aged Jamaican Rum", "1.5 oz"], ["Martinique Rhum", "0.5 oz"], ["Fresh Lime Juice", "1 oz"], ["Orange Curaçao", "0.5 oz"], ["Orgeat", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake and strain over crushed ice in rocks glass.", "Float dark rum on top.", "Garnish with spent lime hull, mint sprig, cherry."],
    ["tiki", "tropical", "classic"], "18%", "3 min"),

  C("11094", "Jungle Bird", "Rum", "Rocks", "negroni", "#D44000",
    [["Blackstrap Rum", "1.5 oz"], ["Campari", "0.75 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Pineapple Juice", "1.5 oz"], ["Simple Syrup", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously.", "Strain over large ice in rocks glass.", "Garnish with pineapple wedge."],
    ["tiki", "bitter", "tropical"], "16%", "2 min"),

  C("11095", "Hemingway Daiquiri", "Rum", "Coupe", "daiquiri", "#C8E6C9",
    [["White Rum", "2 oz"], ["Fresh Lime Juice", "0.75 oz"], ["Fresh Grapefruit Juice", "0.5 oz"], ["Maraschino Liqueur", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a lime wheel."],
    ["classic", "citrus", "papa"], "20%", "2 min", { vegan: true }),

  C("11096", "Caipirinha", "Cachaça", "Rocks", "caipirinha", "#D4E8A8",
    [["Cachaça", "2 oz"], ["Fresh Lime", "half (quartered)"], ["Caster Sugar", "2 tsp"]],
    ["Muddle lime quarters with sugar in rocks glass.", "Fill glass with crushed ice.", "Pour cachaça over ice.", "Stir briefly.", "Garnish with a lime wedge."],
    ["classic", "citrus", "brazilian"], "20%", "2 min", { vegan: true }),

  // ── Whiskey additions ─────────────────────────────────────────────────────
  C("11097", "Rob Roy", "Whiskey", "Coupe", "manhattan", "#8B2635",
    [["Scotch Whisky", "2 oz"], ["Sweet Vermouth", "1 oz"], ["Angostura Bitters", "2 dashes"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds until well-chilled.", "Strain into chilled coupe.", "Garnish with a brandied cherry."],
    ["classic", "stirred", "scotch"], "28%", "3 min"),

  C("11098", "Rusty Nail", "Whiskey", "Rocks", "oldfashioned", "#D4A56A",
    [["Scotch Whisky", "2 oz"], ["Drambuie", "0.5 oz"]],
    ["Add both ingredients to rocks glass with a large ice cube.", "Stir gently to combine.", "Garnish with a lemon twist."],
    ["classic", "stirred", "scotch"], "32%", "1 min"),

  C("11099", "Boulevardier", "Whiskey", "Coupe", "negroni", "#8B2635",
    [["Bourbon", "1.5 oz"], ["Campari", "1 oz"], ["Sweet Vermouth", "1 oz"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds.", "Strain into chilled coupe.", "Express orange peel and garnish."],
    ["classic", "stirred", "bitter"], "26%", "3 min"),

  C("11100", "Toronto", "Whiskey", "Coupe", "manhattan", "#D4A56A",
    [["Rye Whiskey", "2 oz"], ["Fernet-Branca", "0.25 oz"], ["Simple Syrup", "0.25 oz"], ["Angostura Bitters", "2 dashes"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds.", "Strain into chilled coupe.", "Garnish with an orange twist."],
    ["modern", "stirred", "amaro"], "28%", "3 min"),

  C("11101", "Black Manhattan", "Whiskey", "Coupe", "manhattan", "#3D1A1A",
    [["Rye Whiskey", "2 oz"], ["Averna Amaro", "1 oz"], ["Angostura Bitters", "1 dash"], ["Orange Bitters", "1 dash"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds.", "Strain into chilled coupe.", "Garnish with a brandied cherry."],
    ["modern", "stirred", "amaro"], "28%", "3 min"),

  C("11102", "Irish Coffee", "Whiskey", "Heatproof Mug", "espresso", "#3D2B1F",
    [["Irish Whiskey", "1.5 oz"], ["Hot Coffee", "4 oz"], ["Brown Sugar", "1 tsp"], ["Heavy Cream", "1 oz (lightly whipped)"]],
    ["Warm heatproof mug with hot water, discard.", "Add sugar and coffee, stir to dissolve.", "Add whiskey.", "Float lightly whipped cream on top.", "Drink through the cream."],
    ["classic", "hot", "coffee"], "10%", "3 min"),

  // ── Vodka additions ───────────────────────────────────────────────────────
  C("11103", "Sex on the Beach", "Vodka", "Highball", "tequilasunrise", "#FF8C00",
    [["Vodka", "1.5 oz"], ["Peach Schnapps", "1 oz"], ["Orange Juice", "2 oz"], ["Cranberry Juice", "2 oz"]],
    ["Fill highball glass with ice.", "Add vodka and peach schnapps.", "Pour orange juice.", "Float cranberry juice on top.", "Garnish with an orange slice and cherry."],
    ["classic", "fruity", "sweet"], "12%", "1 min", { vegan: true }),

  C("11104", "Harvey Wallbanger", "Vodka", "Highball", "tequilasunrise", "#FFA500",
    [["Vodka", "1.5 oz"], ["Fresh Orange Juice", "4 oz"], ["Galliano", "0.5 oz (float)"]],
    ["Fill highball glass with ice.", "Add vodka and orange juice, stir.", "Float Galliano on top.", "Garnish with an orange slice and cherry."],
    ["classic", "fruity", "retro"], "12%", "1 min"),

  C("11105", "White Russian", "Vodka", "Rocks", "espresso", "#F5E6CA",
    [["Vodka", "2 oz"], ["Kahlúa", "1 oz"], ["Heavy Cream", "1 oz"]],
    ["Fill rocks glass with ice.", "Add vodka and Kahlúa.", "Float cream on top.", "Stir gently if desired."],
    ["classic", "coffee", "creamy"], "18%", "1 min"),

  C("11106", "Black Russian", "Vodka", "Rocks", "espresso", "#1A0F00",
    [["Vodka", "2 oz"], ["Kahlúa", "1 oz"]],
    ["Fill rocks glass with ice.", "Add vodka then Kahlúa.", "Stir gently."],
    ["classic", "coffee", "simple"], "22%", "1 min", { vegan: true }),

  C("11107", "Pornstar Martini", "Vodka", "Martini", "pornstar", "#FFA500",
    [["Vanilla Vodka", "2 oz"], ["Passionfruit Liqueur", "1 oz"], ["Passionfruit Purée", "0.5 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Prosecco", "2 oz (side shot)"]],
    ["Combine vodka, liqueur, purée, and lime in shaker with ice.", "Shake vigorously 12 seconds.", "Strain into chilled martini glass.", "Float halved passionfruit on top.", "Serve Prosecco in a shot glass on the side."],
    ["modern", "fruity", "tropical"], "18%", "3 min"),

  // ── Tequila additions ─────────────────────────────────────────────────────
  C("11108", "Tequila Sunrise", "Tequila", "Highball", "tequilasunrise", "#FF4500",
    [["Tequila Blanco", "2 oz"], ["Fresh Orange Juice", "4 oz"], ["Grenadine", "0.5 oz"]],
    ["Fill highball glass with ice.", "Add tequila and orange juice, stir.", "Slowly pour grenadine down the side.", "Do not stir — let it create the sunrise gradient.", "Garnish with an orange slice and cherry."],
    ["classic", "fruity", "visual"], "12%", "1 min", { vegan: true }),

  C("11109", "El Diablo", "Tequila", "Collins", "negroni", "#8B0000",
    [["Tequila Reposado", "1.5 oz"], ["Crème de Cassis", "0.5 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Ginger Beer", "3 oz"]],
    ["Fill Collins glass with ice.", "Add tequila, cassis, and lime.", "Top with ginger beer.", "Stir gently. Garnish with a lime wedge."],
    ["classic", "fruity", "ginger"], "12%", "1 min"),

  C("11110", "Naked and Famous", "Mezcal", "Coupe", "sour", "#FF8C00",
    [["Mezcal", "0.75 oz"], ["Aperol", "0.75 oz"], ["Yellow Chartreuse", "0.75 oz"], ["Fresh Lime Juice", "0.75 oz"]],
    ["Combine equal parts in shaker with ice.", "Shake and double-strain into chilled coupe.", "No garnish."],
    ["modern", "equal-parts", "smoky"], "22%", "2 min"),

  // ── Pisco ─────────────────────────────────────────────────────────────────
  C("11111", "Pisco Sour", "Pisco", "Coupe", "pisco", "#F5E6CA",
    [["Pisco", "2 oz"], ["Fresh Lime Juice", "1 oz"], ["Simple Syrup", "0.75 oz"], ["Egg White", "1"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Strain into chilled coupe.", "Apply 3 drops Angostura bitters on foam, draw pattern with toothpick."],
    ["classic", "citrus", "south-american"], "20%", "3 min"),

  // ── Aperitivo additions ───────────────────────────────────────────────────
  C("11112", "Garibaldi", "Aperitivo", "Highball", "tequilasunrise", "#FF4500",
    [["Campari", "2 oz"], ["Fluffy Orange Juice", "4 oz (freshly juiced)"]],
    ["Fill highball with ice.", "Add Campari.", "Juice oranges directly into glass (or pour and fluff).", "Stir gently. Garnish with orange slice."],
    ["low-abv", "aperitivo", "simple"], "10%", "1 min", { vegan: true }),

  C("11113", "Kir Royale", "Champagne", "Flute", "kir", "#8B2635",
    [["Crème de Cassis", "0.5 oz"], ["Champagne or Prosecco", "5 oz"]],
    ["Pour crème de cassis into chilled flute.", "Slowly top with chilled champagne.", "Do not stir.", "Garnish with a fresh blackberry."],
    ["classic", "sparkling", "celebration", "low-abv"], "10%", "1 min", { vegan: true }),

  C("11114", "Elderflower Collins", "Gin", "Collins", "elderflower", "#E8F5E9",
    [["Gin", "1.5 oz"], ["St-Germain Elderflower Liqueur", "1 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Soda Water", "2 oz"]],
    ["Shake gin, elderflower, and lemon with ice.", "Strain into ice-filled Collins glass.", "Top with soda water.", "Garnish with cucumber slice and lemon wheel."],
    ["modern", "floral", "refreshing"], "14%", "2 min"),

  C("11115", "Aperol Hugo", "Aperitivo", "Wine", "spritz", "#FFA500",
    [["Aperol", "1 oz"], ["St-Germain Elderflower Liqueur", "0.5 oz"], ["Prosecco", "3 oz"], ["Soda Water", "1 oz"], ["Fresh Mint", "2 sprigs"]],
    ["Fill wine glass with ice.", "Add Aperol and elderflower liqueur.", "Top with Prosecco and soda.", "Stir gently. Garnish with mint and lime wheel."],
    ["low-abv", "sparkling", "floral", "aperitivo"], "10%", "1 min", { vegan: true }),

  // ── Brandy additions ──────────────────────────────────────────────────────
  C("11116", "Brandy Alexander", "Brandy", "Coupe", "daiquiri", "#F5E6CA",
    [["Cognac", "1.5 oz"], ["Crème de Cacao (dark)", "1 oz"], ["Heavy Cream", "1 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Strain into chilled coupe.", "Garnish with fresh grated nutmeg."],
    ["classic", "creamy", "after-dinner"], "22%", "2 min"),

  C("11117", "Corpse Reviver No. 2", "Gin", "Coupe", "martini", "#F5E6CA",
    [["Gin", "0.75 oz"], ["Cointreau", "0.75 oz"], ["Lillet Blanc", "0.75 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Absinthe", "rinse"]],
    ["Rinse chilled coupe with absinthe, discard excess.", "Shake remaining ingredients with ice.", "Double-strain into prepared coupe.", "No garnish."],
    ["classic", "equal-parts", "brunch"], "22%", "2 min"),

  C("11118", "Vieux Carré", "Whiskey", "Rocks", "manhattan", "#D4A56A",
    [["Rye Whiskey", "0.75 oz"], ["Cognac", "0.75 oz"], ["Sweet Vermouth", "0.75 oz"], ["Bénédictine", "1 tsp"], ["Peychaud's Bitters", "2 dashes"], ["Angostura Bitters", "2 dashes"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds.", "Strain over large ice cube in rocks glass.", "Garnish with a lemon or orange twist."],
    ["classic", "stirred", "new-orleans"], "26%", "3 min"),

  C("11119", "Amaretto Sour", "Amaretto", "Rocks", "sour", "#D4A56A",
    [["Amaretto", "1.5 oz"], ["Cask-strength Bourbon", "0.75 oz"], ["Fresh Lemon Juice", "1 oz"], ["Simple Syrup", "0.25 oz"], ["Egg White", "1"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Strain over large ice in rocks glass.", "Garnish with a lemon wheel and brandied cherry."],
    ["modern", "citrus", "nutty"], "20%", "3 min"),

  C("11120", "Jungle Bird Riff", "Rum", "Rocks", "negroni", "#8B2635",
    [["Smith & Cross Rum", "1.5 oz"], ["Campari", "0.75 oz"], ["Pineapple Juice", "1.5 oz"], ["Fresh Lime Juice", "0.5 oz"], ["Demerara Syrup", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously.", "Strain over large ice in rocks glass.", "Garnish with a dehydrated pineapple wheel."],
    ["tiki", "bitter", "tropical"], "16%", "2 min"),

  C("11121", "New York Sour", "Whiskey", "Rocks", "sour", "#8B2635",
    [["Bourbon", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Simple Syrup", "0.75 oz"], ["Egg White", "1"], ["Dry Red Wine", "0.5 oz (float)"]],
    ["Dry shake whiskey, lemon, syrup, and egg white 15 seconds.", "Add ice and shake hard 12 seconds.", "Strain over large ice in rocks glass.", "Float red wine over back of spoon.", "Garnish with a lemon wheel."],
    ["modern", "citrus", "visual"], "20%", "3 min"),

  C("11122", "Rattlesnake", "Whiskey", "Coupe", "sour", "#F5E6CA",
    [["Rye Whiskey", "2 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Simple Syrup", "0.75 oz"], ["Egg White", "1"], ["Absinthe", "2 dashes"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a lemon twist."],
    ["classic", "citrus", "prohibition"], "22%", "3 min"),

  C("11123", "Dark Side", "Rum", "Coupe", "darkandstormy", "#1A0F00",
    [["Dark Rum", "1.5 oz"], ["Blackberry Liqueur", "0.5 oz"], ["Fresh Lime Juice", "0.75 oz"], ["Simple Syrup", "0.5 oz"], ["Egg White", "1"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Double-strain into chilled coupe.", "Garnish with fresh blackberries."],
    ["modern", "fruity", "tropical"], "18%", "3 min"),

  // ── More Classics ─────────────────────────────────────────────────────────
  C("11124", "Hanky Panky", "Gin", "Coupe", "martini", "#D44000",
    [["Gin", "1.5 oz"], ["Sweet Vermouth", "1.5 oz"], ["Fernet-Branca", "1 tsp"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds.", "Strain into chilled coupe.", "Garnish with an orange twist."],
    ["classic", "stirred", "amaro"], "24%", "3 min"),

  C("11125", "Naked Martini", "Gin", "Martini", "martini", "#F0F0E8",
    [["Gin", "3 oz"]],
    ["Chill martini glass thoroughly with ice water.", "Strain ice-cold gin directly into glass.", "Express lemon peel, garnish."],
    ["spirit-forward", "minimal", "stirred"], "40%", "2 min"),

  C("11126", "Pink Lady", "Gin", "Coupe", "cosmo", "#FFB6C1",
    [["Gin", "1.5 oz"], ["Applejack", "0.5 oz"], ["Grenadine", "0.5 oz"], ["Fresh Lemon Juice", "0.75 oz"], ["Egg White", "1"]],
    ["Dry shake all ingredients 15 seconds.", "Add ice and shake hard 12 seconds.", "Double-strain into chilled coupe.", "Garnish with a cherry."],
    ["classic", "fruity", "prohibition"], "20%", "3 min"),

  C("11127", "Grasshopper", "Liqueur", "Coupe", "gimlet", "#C8E6C9",
    [["Crème de Menthe (green)", "1 oz"], ["Crème de Cacao (white)", "1 oz"], ["Heavy Cream", "1 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Strain into chilled coupe.", "Garnish with a mint sprig."],
    ["classic", "creamy", "after-dinner"], "18%", "2 min"),

  C("11128", "Stinger", "Brandy", "Coupe", "daiquiri", "#F0F0E8",
    [["Cognac", "2 oz"], ["Crème de Menthe (white)", "0.75 oz"]],
    ["Combine all in shaker with ice.", "Shake vigorously 12 seconds.", "Strain into chilled coupe.", "Garnish with a mint leaf."],
    ["classic", "after-dinner", "minty"], "28%", "2 min"),

  C("11129", "Between the Sheets", "Brandy", "Coupe", "daiquiri", "#F5E6CA",
    [["Cognac", "1 oz"], ["White Rum", "1 oz"], ["Cointreau", "1 oz"], ["Fresh Lemon Juice", "0.5 oz"]],
    ["Combine all in shaker with ice.", "Shake and double-strain into chilled coupe.", "Garnish with a lemon twist."],
    ["classic", "citrus", "prohibition"], "26%", "2 min"),

  C("11130", "Tuxedo", "Gin", "Coupe", "martini", "#F0F0E8",
    [["Gin", "1.5 oz"], ["Dry Sherry", "1.5 oz"], ["Maraschino Liqueur", "0.25 oz"], ["Orange Bitters", "2 dashes"], ["Absinthe", "2 dashes"]],
    ["Combine all in mixing glass with ice.", "Stir 30 seconds.", "Strain into chilled coupe.", "Garnish with a lemon twist and cherry."],
    ["classic", "stirred", "sherry"], "22%", "3 min"),
];

// Derived helpers

/** All unique categories in the cocktail list */
export const CATEGORIES = [...new Set(COCKTAILS.map((c) => c.category))].sort();

/** All unique glass types */
export const GLASSES = [...new Set(COCKTAILS.map((c) => c.glass))].sort();

/** All unique ingredients across the library */
export const ALL_INGREDIENTS: string[] = [
  ...new Set(COCKTAILS.flatMap((c) => c.ingredients.map((i) => i.name))),
].sort();

/** Look up a cocktail by its URL slug */
export function getCocktailBySlug(slug: string): Cocktail | undefined {
  return COCKTAILS.find((c) => c.slug === slug);
}

/** Look up a cocktail by its numeric id */
export function getCocktailById(id: string): Cocktail | undefined {
  return COCKTAILS.find((c) => c.id === id);
}

/** Search cocktails by name */
export function searchCocktails(query: string): Cocktail[] {
  const q = query.toLowerCase();
  return COCKTAILS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q)) ||
      c.ingredients.some((i) => i.name.toLowerCase().includes(q))
  );
}
