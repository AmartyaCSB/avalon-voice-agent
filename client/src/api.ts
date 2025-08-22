import type { RolesToggle } from "./types";
import { assignRoles, buildNarration } from "./logic";

const SERVER = import.meta.env.VITE_SERVER_URL?.trim();
const USE_SERVER_TTS = (import.meta.env.VITE_USE_SERVER_TTS ?? "").toLowerCase() === "true";

export const ttsEnabledServerSide = () => !!SERVER && USE_SERVER_TTS;

export async function getAssignments(players: number, roles: RolesToggle) {
  if (SERVER) {
    const r = await fetch(`${SERVER}/api/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players, roles })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  const assignments = assignRoles(players, roles);
  const good = assignments.filter(a => a.team === "Good").length;
  const evil = assignments.length - good;
  return { assignments, good, evil };
}

export async function getNarration(players: number, roles: RolesToggle) {
  if (SERVER) {
    const r = await fetch(`${SERVER}/api/narration`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players, roles })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  return buildNarration(roles, players);
}

export async function ttsMp3Blob(text: string): Promise<Blob> {
  if (!SERVER) throw new Error("Server TTS not configured");
  const r = await fetch(`${SERVER}/api/tts`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.blob();
}
