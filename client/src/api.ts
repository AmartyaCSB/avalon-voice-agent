import type { RolesToggle } from "./types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8787';

export async function getAssignments(players: number, roles: RolesToggle) {
  const response = await fetch(`${SERVER_URL}/api/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players, roles })
  });
  return response.json();
}

export async function getNarration(players: number, roles: RolesToggle) {
  const response = await fetch(`${SERVER_URL}/api/narration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players, roles })
  });
  return response.json();
}

export function ttsEnabledServerSide(): boolean {
  return !!import.meta.env.VITE_SERVER_URL;
}

export async function ttsMp3Blob(text: string): Promise<Blob> {
  const response = await fetch(`${SERVER_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return response.blob();
}