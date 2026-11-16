/* An anonymous id for this browser, so the server can count each player
   once. It is random and tied to nothing personal. */

const PLAYER_KEY = "meridian.expedition.player";

export function playerId(): string {
  try {
    let id = window.localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(PLAYER_KEY, id);
    }
    return id.toLowerCase();
  } catch {
    return `p-${Math.random().toString(36).slice(2, 14)}`;
  }
}
