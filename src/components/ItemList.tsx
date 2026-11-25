import ItemActions from "@/components/ItemActions";
import { expiryLabel } from "@/lib/expiry";
import { groupByExpiry, stampDate } from "@/lib/home";
import type { Tables } from "@/types/database.types";

export type ListItem = Pick<Tables<"items">, "id" | "name" | "quantity" | "unit" | "expiry_date" | "category">;

type Level = "expired" | "soon" | "later";

const GROUPS: { level: Level; title: string }[] = [
  { level: "expired", title: "Aegunud · kontrolli enne söömist" },
  { level: "soon", title: "Söö 3 päeva jooksul" },
  { level: "later", title: "Hiljem" },
];

// Small line icons next to the group titles; the title text carries the meaning.
function GroupIcon({ level }: { level: Level }) {
  const common = {
    "aria-hidden": true,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (level === "expired") {
    return (
      <svg {...common}>
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  if (level === "soon") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function quantityText(item: ListItem): string | null {
  return item.quantity === null ? null : `${item.quantity.toLocaleString("et-EE")} ${item.unit ?? ""}`.trim();
}

export default function ItemList({ items }: { items: ListItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card empty">
        <p>Külmkapp on tühi.</p>
        <p className="muted">Vajuta allservas „Lisa toode“, et lisada esimene toode.</p>
      </section>
    );
  }

  const groups = groupByExpiry(items);

  return (
    <>
      {GROUPS.filter(({ level }) => groups[level].length > 0).map(({ level, title }) => (
        <section key={level} className={`item-group group-${level}`} aria-labelledby={`group-${level}`}>
          <h2 id={`group-${level}`} className="group-title">
            <GroupIcon level={level} />
            {title}
          </h2>
          <ul className="item-list">
            {groups[level].map((item) => {
              const quantity = quantityText(item);
              return (
                <li key={item.id} className={`item item-${level}`}>
                  {/* The stamp repeats the date visually; the text below says it for screen readers too. */}
                  <div className="stamp" aria-hidden="true">
                    <span>{level === "expired" ? "AEGUS" : "AEGUB"}</span>
                    <strong>{stampDate(item.expiry_date)}</strong>
                  </div>
                  <div className="item-info">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-meta">
                      {quantity && `${quantity} · `}
                      {expiryLabel(item.expiry_date).toLowerCase()}
                    </p>
                  </div>
                  <ItemActions item={item} expired={level === "expired"} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
