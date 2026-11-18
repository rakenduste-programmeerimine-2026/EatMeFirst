// Fridge helpers shared by the home page and the fridges page.

export type MyFridge = {
  id: string;
  name: string;
  role: "owner" | "member";
};

// Which fridge the home page shows: the one in ?fridge= if the user belongs
// to it, otherwise the first one (the list is ordered newest-joined first,
// so after joining a flatmate's fridge that one is shown by default).
export function pickFridge(fridges: MyFridge[], requestedId?: string): MyFridge | undefined {
  return fridges.find((fridge) => fridge.id === requestedId) ?? fridges[0];
}

// Every user's own fridge is called "Minu külmkapp", so shared ones get a marker.
export function fridgeLabel(fridge: MyFridge): string {
  return fridge.role === "member" ? `${fridge.name} (jagatud)` : fridge.name;
}
