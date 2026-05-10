import styles from "./IngredientBadge.module.css";

interface IngredientBadgeProps {
  name: string;
  amount?: string;
  /** If true, renders as a link to /ingredients */
  asLink?: boolean;
  className?: string;
}

export function IngredientBadge({
  name,
  amount,
  className,
}: IngredientBadgeProps) {
  return (
    <span className={`${styles.badge} ${className ?? ""}`}>
      {amount && <span className={styles.amount}>{amount}</span>}
      <span className={styles.name}>{name}</span>
    </span>
  );
}
