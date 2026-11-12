import type { FieldErrors } from "@/lib/items/validation";

// Result shape of the item server actions, for React's useActionState:
//   const [state, formAction, pending] = useActionState(addItem, initialActionState);
// Lives outside actions.ts because a "use server" file may only export async functions.
export type ActionState<T = Record<string, unknown>> = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors<T>;
};

export const initialActionState: ActionState = { ok: false };
