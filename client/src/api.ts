import type { RolesToggle } from './types'


const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:8787'


export async function postJSON<T>(path: string, body: any): Promise<T> {
const r = await fetch(`${SERVER}${path}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(body)
})
if (!r.ok) throw new Error(await r.text())
return r.json()
}


export function ttsEnabledServerSide() {
return import.meta.env.VITE_USE_SERVER_TTS === 'true'
}


export async function ttsMp3Blob(text: string): Promise<Blob> {
const r = await fetch(`${SERVER}/api/tts`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ text })
})
if (!r.ok) throw new Error(await r.text())
return r.blob()
}


export async function getAssignments(players: number, roles: RolesToggle) {
return postJSON<{ assignments: any[]; good: number; evil: number }>(
'/api/assign',
{ players, roles }
)
}


export async function getNarration(players: number, roles: RolesToggle) {
return postJSON<{ steps: string[]; notes: string[] }>(
'/api/narration',
{ players, roles }
)
}