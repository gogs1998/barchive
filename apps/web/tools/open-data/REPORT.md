# Open cocktail dataset

Separate from the live library. Nothing here is imported by the app.

## Counts

- Recipes: 102, all from the IBA official list published at iba-world.com.
- With a self-hosted Commons image: 95.
- Without an image (the UI falls back to a colour card): 7.
- No clean Commons photo for: Cardinale, Don's Special Daiquiri, Fernandito, Gin Fizz, Grand Margarita, Sea Breeze, Tipperary.
- Curated classics covered: 58 of 79.
- Name overlap with the current full library (curated + imported + Difford's): 86 of 102 open recipes use a name already in that library.

## Curated classics covered

- Margarita (as Margarita)
- Tommy's Margarita (as Tommy's Margarita)
- Paloma (as Paloma)
- Daiquiri (as Daiquiri)
- Mojito (as Mojito)
- Piña Colada (as Piña Colada)
- Old Fashioned (as Old Fashioned)
- Manhattan (as Manhattan)
- Whiskey Sour (as Whiskey Sour)
- Sazerac (as Sazerac)
- Mint Julep (as Mint Julep)
- Negroni (as Negroni)
- Martini (as Dry Martini)
- Tom Collins (as John Collins)
- French 75 (as French 75)
- Espresso Martini (as Espresso Martini)
- Cosmopolitan (as Cosmopolitan)
- Moscow Mule (as Moscow Mule)
- Bloody Mary (as Bloody Mary)
- Aperol Spritz (as Spritz)
- Americano (as Americano)
- Sidecar (as Sidecar)
- Bellini (as Bellini)
- Mimosa (as Mimosa)
- Penicillin (as Penicillin)
- Bramble (as Bramble)
- Bee's Knees (as Bee's Knees)
- Last Word (as Last Word)
- Paper Plane (as Paper Plane)
- Aviation (as Aviation)
- Vesper Martini (as Vesper)
- Clover Club (as Clover Club)
- White Lady (as White Lady)
- Singapore Sling (as Singapore Sling)
- Dark 'n' Stormy (as Dark 'n' Stormy)
- Mai Tai (as Mai Tai)
- Jungle Bird (as Jungle Bird)
- Hemingway Daiquiri (as Hemingway Special)
- Caipirinha (as Caipirinha)
- Rusty Nail (as Rusty Nail)
- Boulevardier (as Boulevardier)
- Irish Coffee (as Irish Coffee)
- Sex on the Beach (as Sex on the Beach)
- Black Russian (as Black Russian)
- Pornstar Martini (as Pornstar Martini)
- Tequila Sunrise (as Tequila Sunrise)
- Naked and Famous (as Naked and Famous)
- Pisco Sour (as Pisco Sour)
- Garibaldi (as Garibaldi)
- Brandy Alexander (as Alexander)
- Corpse Reviver No. 2 (as Corpse Reviver No. 2)
- Vieux Carré (as Vieux Carré)
- New York Sour (as New York Sour)
- Hanky Panky (as Hanky Panky)
- Grasshopper (as Grasshopper)
- Stinger (as Stinger)
- Between the Sheets (as Between the Sheets)
- Tuxedo (as Tuxedo)

## Curated classics not covered

These are not on the current IBA list, or they are house recipes with no open specification. They were not invented to fill the gap.

- Jalapeño Margarita
- Gimlet
- Mezcal Negroni
- Oaxacan Old Fashioned
- Gold Rush
- Hurricane
- Rob Roy
- Toronto
- Black Manhattan
- Harvey Wallbanger
- White Russian
- El Diablo
- Kir Royale
- Elderflower Collins
- Aperol Hugo
- Amaretto Sour
- Jungle Bird Riff
- Rattlesnake
- Dark Side
- Naked Martini
- Pink Lady

## Licence notes

- IBA pages are copyrighted. This dataset uses ingredient names, amounts, the serving glass and the garnish as facts. Steps are original. IBA photos were not downloaded.
- Simple syrup and sugar syrup from the IBA (usually 1:1) are named Sugar Syrup (2:1), and Campari is named Red Bitter Liqueur, so they match the starter bar in onboarding. The published wording is kept on each record in cocktails.open.sources.json.
- Rye is named Rye Whiskey 50% Abv for the same reason. ABV maths treats that bottle as 50%.
- Gosling's rum in Dark 'n' Stormy is stored as Aged Rum (6-10yr). The drink name is the IBA's. Gosling's treats that name as a trademark.
- A bar spoon was read as 5 ml (1 tsp). Donn's Mix was split using the IBA's own note (2 parts grapefruit juice, 1 part cinnamon syrup). One IBA list item had two measures jammed together and was split.
- John Collins is the IBA gin collins. The page notes Old Tom gin if you want a Tom Collins. It is counted here as the Tom Collins classic.
- Alexander on the IBA list is cognac, crème de cacao and cream, which is the brandy Alexander.
- Vesper is the same drink as the curated Vesper Martini. The IBA name does not include the word Martini.
- The Kir page notes that champagne in place of the wine makes a Kir Royal. The Black Russian page notes that cream floated on top makes a White Russian. Those pages do not give the variants their own measures, so they are not separate records.
- Images, where present, are Wikimedia Commons files with a CC0, CC BY or CC BY-SA licence. Author, licence and source URL are in the sources file. NC and ND files were skipped.
- No recipe was taken from Difford's Guide, TheCocktailDB, Liquor.com or Punch.

## Re-run

From `apps/web/tools/open-data`:

```
node fetch-iba.mjs          # download IBA pages into raw/ (skipped if already saved; --refresh forces it)
node reparse-iba.mjs         # parse saved HTML again after a parser change
node fetch-images.mjs        # Commons search, licence check, webp into public/img/cocktails
node build.mjs               # write cocktails.open.ts, the sources file, and this report
```

`raw/` is gitignored. The generated module, the sources file and the images are the committed output.
