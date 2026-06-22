"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { type Ingredient, slugify } from "@/lib/cocktails";
import { scaleAmount, MULTIPLIER_PRESETS, type DisplayUnit } from "@/lib/scaler";
import IngredientSubstitutes from "./IngredientSubstitutes";
import styles from "./RecipeScaler.module.css";
import type { SubstituteEntry } from "@/lib/substitutions";

interface Props {
  ingredients: Ingredient[];
  /** Build-time substitutes keyed by ingredient name. */
  substitutesByIngredient?: Record<string, SubstituteEntry[]>;
}

/**
 * RecipeScaler renders the ingredients list with live batch-scaling
 * and unit conversion controls.
 *
 * Controls:
 *   - Multiplier row: pill buttons (1× 2× 4× 8× 12×) + custom number input
 *   - Unit row: segmented control [oz | ml | cl]
 *
 * Non-numeric amounts ("rim", "top", "pinch", etc.) are always shown unchanged.
 */
export default function RecipeScaler({ ingredients, substitutesByIngredient }: Props) {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customInput, setCustomInput] = useState<string>("");
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>("oz");
  const customId = useId();

  const effectiveMultiplier =
    customInput !== "" && Number(customInput) > 0
      ? Number(customInput)
      : multiplier;

  function handlePreset(preset: number) {
    setMultiplier(preset);
    setCustomInput("");
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Allow empty or positive numbers
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setCustomInput(val);
    }
  }

  const isCustomActive = customInput !== "" && Number(customInput) > 0 && !MULTIPLIER_PRESETS.includes(Number(customInput) as typeof MULTIPLIER_PRESETS[number]);

  return (
    <section aria-labelledby="ingredients-heading" className={styles.root}>
      <h2 id="ingredients-heading" className={styles.sectionTitle}>
        Ingredients
      </h2>

      {/* Batch controls */}
      <div className={styles.controls} role="group" aria-label="Batch and unit controls">
        {/* Multiplier row */}
        <div className={styles.row} role="group" aria-label="Batch multiplier">
          {MULTIPLIER_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`${styles.pill} ${!isCustomActive && multiplier === preset ? styles.pillActive : ""}`}
              onClick={() => handlePreset(preset)}
              aria-pressed={!isCustomActive && multiplier === preset}
            >
              {preset}×
            </button>
          ))}
          <label htmlFor={customId} className={styles.srOnly}>
            Custom multiplier
          </label>
          <input
            id={customId}
            type="number"
            min="0.1"
            step="0.5"
            value={customInput}
            onChange={handleCustomChange}
            placeholder="×"
            className={`${styles.customInput} ${isCustomActive ? styles.pillActive : ""}`}
            aria-label="Custom batch multiplier"
          />
        </div>

        {/* Unit toggle row */}
        <div
          className={styles.unitRow}
          role="group"
          aria-label="Display unit"
        >
          {(["oz", "ml", "cl"] as DisplayUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              className={`${styles.unitBtn} ${displayUnit === unit ? styles.unitBtnActive : ""}`}
              onClick={() => setDisplayUnit(unit)}
              aria-pressed={displayUnit === unit}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredient list */}
      <ul
        className={styles.list}
        itemProp="recipeIngredient"
        role="list"
        aria-label={`${ingredients.length} ingredient${ingredients.length !== 1 ? "s" : ""}`}
        aria-live="polite"
        aria-atomic="false"
      >
        {ingredients.map((ing) => {
          const scaled = scaleAmount(
            ing.amount,
            ing.qty,
            ing.unit,
            effectiveMultiplier,
            displayUnit
          );
          return (
            <li key={ing.name} className={styles.item}>
              <span className={styles.amount}>{scaled}</span>
              <Link href={`/ingredients/${slugify(ing.name)}`} className={styles.name}>
                {ing.name}
              </Link>
              <IngredientSubstitutes
                ingredientName={ing.name}
                substitutes={substitutesByIngredient?.[ing.name]}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
