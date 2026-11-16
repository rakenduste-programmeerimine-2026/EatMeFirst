import { expiryLabel } from "@/lib/expiry";
import { getRecipeSuggestions } from "@/lib/recipes/suggestions";

// Recipe ideas built from the items that expire soonest (feature #3).
export default async function RecipeIdeas({ fridgeId }: { fridgeId: string }) {
  const result = await getRecipeSuggestions(fridgeId, 3);

  return (
    <section className="recipes">
      <h2>Mida täna teha?</h2>

      {!result.ok && <p className="alert alert-error">{result.message}</p>}

      {result.ok && result.recipes.length === 0 && (
        <p className="muted">Retseptiideid veel pole. Lisa külmkappi tooteid ja siia ilmuvad ideed.</p>
      )}

      {result.ok &&
        result.recipes.map((recipe) => (
          <article key={recipe.recipe_id} className="card recipe">
            <div className="recipe-head">
              <h3>{recipe.title}</h3>
              {recipe.minutes !== null && <span className="muted">{recipe.minutes} min</span>}
            </div>
            <p className="recipe-uses">
              Kasutab: <strong>{recipe.matched_items.join(", ")}</strong>
              <span className="muted"> · {expiryLabel(recipe.soonest_expiry).toLowerCase()}</span>
            </p>
            <details>
              <summary>Kuidas teha</summary>
              <p>{recipe.instructions}</p>
            </details>
          </article>
        ))}
    </section>
  );
}
