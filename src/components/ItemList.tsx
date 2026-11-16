import { expiryLabel, expiryLevel } from "@/lib/expiry";
import type { Tables } from "@/types/database.types";

export type ListItem = Pick<Tables<"items">, "id" | "name" | "quantity" | "unit" | "expiry_date">;

export default function ItemList({ items }: { items: ListItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card empty">
        <p>Külmkapp on tühi.</p>
        <p className="muted">Toodete lisamine tuleb peagi.</p>
      </section>
    );
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li key={item.id} className={`card item item-${expiryLevel(item.expiry_date)}`}>
          <div className="item-info">
            <span className="item-name">{item.name}</span>
            {item.quantity !== null && (
              <span className="muted">
                {item.quantity.toLocaleString("et-EE")} {item.unit}
              </span>
            )}
            <span className="badge">{expiryLabel(item.expiry_date)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
