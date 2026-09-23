import { create } from "zustand";

// Role-select modal shown (a) once on the main page after first login/reopen
// until the user picks — «gate» mode — and (b) every time the «+» create button
// is tapped — «create» mode — since one button can publish two different things
// (a trip as a driver, a request as a passenger). Choice also updates activeMode.

export type RolePromptMode = "gate" | "create";

const CHOSEN_KEY = "terme_role_chosen";

/** Has the user already made the one-time gate choice? (persists across sessions) */
export function hasChosenRole(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(CHOSEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Record the one-time gate choice so the gate never auto-opens again. */
export function markRoleChosen(): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(CHOSEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface RolePromptState {
  open: boolean;
  mode: RolePromptMode;
  openPrompt: (mode: RolePromptMode) => void;
  close: () => void;
}

export const useRolePrompt = create<RolePromptState>((set) => ({
  open: false,
  mode: "gate",
  openPrompt: (mode) => set({ open: true, mode }),
  close: () => set({ open: false }),
}));
