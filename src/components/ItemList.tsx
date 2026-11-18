import ItemActions from "@/components/ItemActions";
import { expiryLabel, expiryLevel } from "@/lib/expiry";
import type { Tables } from "@/types/database.types";

export type ListItem = Pick<Tables<"items">, "id" | "name" | "quantity" | "unit" | "expiry_date" | "category">;

export default function ItemList({ items }: { items: ListItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card empty">
        <p>Külmkapp on tühi.</p>
        <p className="muted">Lisa esimene toode allpool.</p>
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
          <ItemActions item={item} />
        </li>
      ))}
    </ul>
  );
}
