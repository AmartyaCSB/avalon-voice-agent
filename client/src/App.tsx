import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getAssignments, getNarration, ttsEnabledServerSide, ttsMp3Blob } from './api'
import type { RolesToggle, Assignment } from './types'

const defaultRoles: RolesToggle = { Merlin: true, Percival: true, Mordred: false, Morgana: true, Oberon: false }

function useBrowserTTS() {
  const speakingRef = useRef(false)

  function speakLine(line: string) {
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(line)
      const voices = window.speechSynthesis.getVoices()
      const v = voices.find(v => /en(-|\b)/i.test(v.lang)) || voices[0]
      if (v) u.voice = v
      u.rate = 1
      u.pitch = 1
      u.onend = () => resolve()
      window.speechSynthesis.speak(u)
    })
  }

  async function speakSteps(steps: string[], shouldStop: () => boolean) {
    speakingRef.current = true
    for (const s of steps) {
      if (shouldStop()) break
      await speakLine(s)
      await new Promise(r => setTimeout(r, 400))
    }
    speakingRef.current = false
  }

  function stop() {
    window.speechSynthesis.cancel()
    speakingRef.current = false
  }

  return { speakSteps, stop }
}

export default function App() {
  const [players, setPlayers] = useState(7)
  const [roles, setRoles] = useState<RolesToggle>(defaultRoles)
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [steps, setSteps] = useState<string[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [useServerTTS, setUseServerTTS] = useState(ttsEnabledServerSide())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const aborted = useRef(false)

  useEffect(() => {
    const handler = () => {}
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
  }, [])

  const { speakSteps: speakBrowser, stop: stopBrowser } = useBrowserTTS()

  async function handleAssign() {
    setError(null)
    try {
      const r = await getAssignments(players, roles)
      setAssignments(r.assignments as Assignment[])
    } catch (e: any) {
      setError(e.message || String(e))
    }
  }

  async function handleNarration() {
    setError(null)
    try {
      const r = await getNarration(players, roles)
      setSteps(r.steps)
      setNotes(r.notes)
      aborted.current = false
      setIsSpeaking(true)

      if (useServerTTS) {
        for (const s of r.steps) {
          if (aborted.current) break
          const blob = await ttsMp3Blob(s)
          const url = URL.createObjectURL(blob)
          await new Promise<void>((resolve, reject) => {
            const a = new Audio(url)
            audioRef.current = a
            a.onended = () => { URL.revokeObjectURL(url); resolve() }
            a.onerror = () => { URL.revokeObjectURL(url); reject(new Error('audio error')) }
            a.play()
          })
          await new Promise(r => setTimeout(r, 300))
        }
        setIsSpeaking(false)
      } else {
        await speakBrowser(r.steps, () => aborted.current)
        setIsSpeaking(false)
      }
    } catch (e: any) {
      setError(e.message || String(e))
      setIsSpeaking(false)
    }
  }

  function stopAll() {
    aborted.current = true
    if (useServerTTS) {
      audioRef.current?.pause()
      audioRef.current = null
    } else {
      stopBrowser()
    }
    setIsSpeaking(false)
  }

  const assignmentText = useMemo(() => {
    if (!assignments) return ''
    return assignments.map(a => `Seat ${a.seat}: ${a.role} [${a.team}]`).join('\n')
  }, [assignments])

  return (
    <div className="wrap">
      <h1>Avalon Voice Agent</h1>
      <p className="muted">Full-stack demo. Choose players and roles, assign seats, then narrate the setup.</p>

      <div className="grid">
        <div className="panel">
          <label>Players (5–10)</label>
          <input
            type="number"
            min={5}
            max={10}
            value={players}
            onChange={e => setPlayers(Math.max(5, Math.min(10, Number(e.target.value) || 5)))}
          />

          <div className="roles">
            {(Object.keys(roles) as (keyof RolesToggle)[]).map(k => (
              <label key={k} className="chk">
                <input
                  type="checkbox"
                  checked={roles[k]}
                  onChange={e => setRoles(r => ({ ...r, [k]: e.target.checked }))}
                />
                <span>{k}</span>
              </label>
            ))}
          </div>

          <div className="row">
            <button onClick={handleAssign}>Assign Roles</button>
            <button disabled={!assignments} onClick={() => navigator.clipboard.writeText(assignmentText)}>Copy</button>
          </div>

          <div className="row">
            <label className="chk">
              <input type="checkbox" checked={useServerTTS} onChange={e => setUseServerTTS(e.target.checked)} />
              <span>Use server TTS (requires API key)</span>
            </label>
          </div>

          {error && <p className="error">{error}</p>}
        </div>

        <div className="panel">
          <h3>Narration</h3>
          <div className="box">
            {steps.length
              ? steps.map((s, i) => <p key={i}>{i + 1}. {s}</p>)
              : <p className="muted">Click “Narrate Setup” to preview.</p>}
          </div>
          <div className="row">
            <button onClick={handleNarration} disabled={isSpeaking}>Narrate Setup</button>
            <button onClick={stopAll} disabled={!isSpeaking}>Stop</button>
          </div>
          {notes.length > 0 && (
            <>
              <h4>Host notes</h4>
              <ul>
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </>
          )}
        </div>

        <div className="panel">
          <h3>Assignments</h3>
          <div className="box">
            {assignments
              ? assignments.map(a => (
                  <div key={a.seat} className="row between">
                    <div>Seat {a.seat}</div>
                    <div>{a.role}</div>
                    <div className={`pill ${a.team === 'Good' ? 'good' : 'evil'}`}>{a.team}</div>
                  </div>
                ))
              : <p className="muted">Assign roles to see seats here.</p>}
          </div>
        </div>
      </div>

      <p className="muted small">Browser TTS uses Web Speech API. Server TTS uses ElevenLabs if configured.</p>
    </div>
  )
}
