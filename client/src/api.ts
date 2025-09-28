import type { RolesToggle } from "./types";

// Remove server dependencies - use local generation only
export async function getAssignments(players: number, roles: RolesToggle) {
  // This will throw an error to trigger local fallback
  throw new Error('Using local assignment generation');
}

export async function getNarration(players: number, roles: RolesToggle) {
  // This will throw an error to trigger local fallback
  throw new Error('Using local narration generation');
}

export function ttsEnabledServerSide(): boolean {
  return false; // Always use browser TTS
}

export async function ttsMp3Blob(text: string): Promise<Blob> {
  // Not used since ttsEnabledServerSide returns false
  throw new Error('Server TTS not available');
}