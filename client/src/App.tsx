import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import type { RolesToggle, Assignment } from "./types";
import { getAssignments, getNarration, ttsEnabledServerSide, ttsMp3Blob } from "./api";
import { validateConfiguration } from "./logic";  


const defaultRoles: RolesToggle = {
  Merlin: true, Percival: true, Mordred: false, Morgana: true, Oberon: false,
  LadyOfTheLake: false, Cleric: false,
  LancelotMode: "off",
  MessengerJunior: false, MessengerSenior: false, MessengerEvil: false,
  RogueGood: false, RogueEvil: false,
  SorcererGood: false, SorcererEvil: false,
  Troublemaker: false, UntrustworthyServant: false, Apprentice: false,
  Lunatic: false, Brute: false, Revealer: false, Trickster: false
};

export default function App() {
  const [players, setPlayers] = useState(7);
  const [roles, setRoles] = useState<RolesToggle>(defaultRoles);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [narration, setNarration] = useState<{steps:string[], notes:string[]} | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const [rate, setRate] = useState(0.95);         // 0.6x .. 1.4x
  const [repeat, setRepeat] = useState(1);        // 1, 2, 3 times
  const audioRef = useRef<HTMLAudioElement | null>(null); // for server TTS stop()
  const ttsCache = useRef<Map<string, Blob>>(new Map());  // cache server mp3 per line
  useEffect(() => { synthRef.current?.cancel(); setSpeaking(false); }, []);

  async function handleAssign() {
    const res = await getAssignments(players, roles);
    setAssignments(res.assignments);
  }

  async function prepareNarration() {
    const res = await getNarration(players, roles);
    setNarration(res);
  }

  async function speakNarration() {
  if (!narration) return;
  setSpeaking(true);

  const gapBetweenLinesMs = 550;      // pause between different lines
  const gapBetweenRepeatsMs = 350;    // short pause between repeats of the same line

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  try {
    if (ttsEnabledServerSide()) {
      // Per-line server TTS so we can repeat lines.
      for (const line of narration.steps) {
        for (let i = 0; i < repeat; i++) {
          if (!speaking) return;
          let blob = ttsCache.current.get(line);
          if (!blob) {
            blob = await ttsMp3Blob(line);
            ttsCache.current.set(line, blob);
          }
          const url = URL.createObjectURL(blob);
          await new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audio.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            audio.play();
          });
          if (i < repeat - 1) await delay(gapBetweenRepeatsMs);
        }
        await delay(gapBetweenLinesMs);
      }
    } else {
      // Browser TTS (rate supported)
      for (const line of narration.steps) {
        for (let i = 0; i < repeat; i++) {
          if (!speaking) return;
          await speak(line, rate);
          if (i < repeat - 1) await delay(gapBetweenRepeatsMs);
        }
        await delay(gapBetweenLinesMs);
      }
    }
  } finally {
    setSpeaking(false);
  }
}


  function speak(text: string, r: number) {
  return new Promise<void>((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = r;              // <- use selected speed
    utter.pitch = 1.0;
    utter.onend = () => resolve();
    synthRef.current?.speak(utter);
  });
}


  function stop() {
  setSpeaking(false);
  // Browser TTS
  synthRef.current?.cancel();
  // Server TTS
  if (audioRef.current) {
    try { audioRef.current.pause(); audioRef.current.src = ""; } catch {}
    audioRef.current = null;
  }
}

const validation = validateConfiguration(players, roles);
const hasErrors = validation.errors.length > 0;

function pillClass(selected: number, slots: number) {
  if (selected > slots) return "pill red";
  if (selected === slots) return "pill green";
  if (selected >= Math.max(0, slots - 1)) return "pill amber";
  return "pill";
}
const goodPill = pillClass(validation.counts.goodSelected, validation.counts.goodSlots);
const evilPill = pillClass(validation.counts.evilSelected, validation.counts.evilSlots);

const leftPanelClass = "panel" + (hasErrors ? " error-outline" : "");


  return (
    <div className="wrap">
      <h1>Avalon Voice Agent</h1>
      <p className="muted">Pick roles, assign seats, and narrate the reveal. Advanced Big Box modules included.</p>

      <div className="grid">
        {/* LEFT: Controls */}
        <div className="leftPanelClass">
          <div className="row" style={{ alignItems:'center' }}>
            <label style={{ minWidth:130 }}>Narration speed</label>
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.05}
              value={rate}
              onChange={e => setRate(parseFloat(e.target.value))}
              style={{ flex:1 }}
            />
            <span style={{ width:56, textAlign:'right' }}>{rate.toFixed(2)}×</span>
          </div>

          <div className="row">
            <label style={{ minWidth:130 }}>Repeat each line</label>
            <select value={repeat} onChange={e => setRepeat(parseInt(e.target.value, 10))}>
              <option value={1}>Once</option>
              <option value={2}>Twice</option>
              <option value={3}>Thrice</option>
            </select>
          </div>

          <div className="row">
            <label>Players (5–10)</label>
            <input type="number" min={5} max={10} value={players}
              onChange={e => setPlayers(parseInt(e.target.value || "5"))}/>
          </div>
          <div className="status-line">
            <div className="status-group">
              <span><b>Good</b></span>
              <span className={goodPill}>
                {validation.counts.goodSelected} / {validation.counts.goodSlots}
              </span>
            </div>
            <div className="status-group">
              <span><b>Evil</b></span>
              <span className={evilPill}>
                {validation.counts.evilSelected} / {validation.counts.evilSlots}
              </span>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="alert error" role="alert" aria-live="assertive">
              <b>Cannot start:</b>
              <ul>{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="alert warn" role="status" aria-live="polite">
              <b>Heads up:</b>
              <ul>{validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}

          <div className="panel" style={{ marginTop: 8 }}>
            <div className="row" style={{justifyContent:'space-between'}}>
              <div><b>Good</b>: {validation.counts.goodSelected} / {validation.counts.goodSlots}</div>
              <div><b>Evil</b>: {validation.counts.evilSelected} / {validation.counts.evilSlots}</div>
            </div>

            {validation.errors.length > 0 && (
              <div className="alert error">
                <b>Cannot start:</b>
                <ul>{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="alert warn">
                <b>Heads up:</b>
                <ul>{validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
          </div>

          <h4>Base roles</h4>
          <div className="roles">
            {(['Merlin','Percival','Mordred','Morgana','Oberon'] as (keyof RolesToggle)[]).map(k => (
              <label key={k} className="chk">
                <input type="checkbox" checked={roles[k] as unknown as boolean}
                  onChange={e => setRoles(r => ({ ...r, [k]: e.target.checked }))}/>
                <span>{k}</span>
              </label>
            ))}
          </div>

          <details>
            <summary><b>Advanced play</b></summary>
            <div style={{marginTop:8}}>
              <div className="row">
                <label style={{minWidth:110}}>Lancelots</label>
                <select value={roles.LancelotMode}
                        onChange={e => setRoles(r => ({ ...r, LancelotMode: e.target.value as any }))}>
                  <option value="off">Off</option>
                  <option value="classic">Classic (know each other)</option>
                  <option value="variant">Variant (don’t know; Evil thumbs only)</option>
                </select>
              </div>

              <div className="roles">
                <label className="chk">
                  <input type="checkbox" checked={roles.Cleric}
                    onChange={e => setRoles(r => ({ ...r, Cleric: e.target.checked }))}/>
                  <span>Cleric (leader check in reveal)</span>
                </label>
                <label className="chk">
                  <input type="checkbox" checked={roles.LadyOfTheLake}
                    onChange={e => setRoles(r => ({ ...r, LadyOfTheLake: e.target.checked }))}/>
                  <span>Lady of the Lake</span>
                </label>
              </div>

              <h5>Messengers</h5>
              <div className="roles">
                <label className="chk"><input type="checkbox" checked={roles.MessengerJunior}
                  onChange={e => setRoles(r => ({ ...r, MessengerJunior: e.target.checked }))}/><span>Junior (Good)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.MessengerSenior}
                  onChange={e => setRoles(r => ({ ...r, MessengerSenior: e.target.checked }))}/><span>Senior (Good)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.MessengerEvil}
                  onChange={e => setRoles(r => ({ ...r, MessengerEvil: e.target.checked }))}/><span>Evil Messenger</span></label>
              </div>

              <h5>Rogues & Sorcerers</h5>
              <div className="roles">
                <label className="chk"><input type="checkbox" checked={roles.RogueGood}
                  onChange={e => setRoles(r => ({ ...r, RogueGood: e.target.checked }))}/><span>Good Rogue (Success)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.RogueEvil}
                  onChange={e => setRoles(r => ({ ...r, RogueEvil: e.target.checked }))}/><span>Evil Rogue (Fail, hidden)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.SorcererGood}
                  onChange={e => setRoles(r => ({ ...r, SorcererGood: e.target.checked }))}/><span>Good Sorcerer (Magic)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.SorcererEvil}
                  onChange={e => setRoles(r => ({ ...r, SorcererEvil: e.target.checked }))}/><span>Evil Sorcerer (Magic)</span></label>
              </div>

              <h5>Good extras</h5>
              <div className="roles">
                <label className="chk"><input type="checkbox" checked={roles.Troublemaker}
                  onChange={e => setRoles(r => ({ ...r, Troublemaker: e.target.checked }))}/><span>Troublemaker (may lie)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.UntrustworthyServant}
                  onChange={e => setRoles(r => ({ ...r, UntrustworthyServant: e.target.checked }))}/><span>Untrustworthy Servant</span></label>
                <label className="chk"><input type="checkbox" checked={roles.Apprentice}
                  onChange={e => setRoles(r => ({ ...r, Apprentice: e.target.checked }))}/><span>Apprentice</span></label>
              </div>

              <h5>Evil extras</h5>
              <div className="roles">
                <label className="chk"><input type="checkbox" checked={roles.Lunatic}
                  onChange={e => setRoles(r => ({ ...r, Lunatic: e.target.checked }))}/><span>Lunatic (must Fail)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.Brute}
                  onChange={e => setRoles(r => ({ ...r, Brute: e.target.checked }))}/><span>Brute (Fail only first 3)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.Revealer}
                  onChange={e => setRoles(r => ({ ...r, Revealer: e.target.checked }))}/><span>Revealer (shows after 2nd fail)</span></label>
                <label className="chk"><input type="checkbox" checked={roles.Trickster}
                  onChange={e => setRoles(r => ({ ...r, Trickster: e.target.checked }))}/><span>Trickster (may lie)</span></label>
              </div>
            </div>
          </details>

          <div className="row">
            <button
              onClick={handleAssign}
              disabled={hasErrors}
              title={hasErrors ? validation.errors[0] : undefined}>Assign Roles
            </button>

          </div>

          {/* <div className="muted small">Browser TTS uses the Web Speech API. If you deploy a server and set <code>VITE_SERVER_URL</code>, you can switch to premium voices.</div> */}
        </div>

        {/* CENTER: Narration */}
        <div className="panel">
          <h3>Narration</h3>
          <div className="box">
            {narration ? (
              <textarea readOnly value={narration.steps.map((s,i)=>`${i+1}. ${s}`).join("\n\n")} />
            ) : (
              <div className="placeholder">Click “Narrate Setup” to preview.</div>
            )}
          </div>
          <div className="row">
            <button
              onClick={async ()=>{ await prepareNarration(); if (!hasErrors) { await speakNarration(); setSpeaking(true);} }}
              disabled={hasErrors}
              title={hasErrors ? validation.errors[0] : undefined}
            >Narrate Setup
            </button>

            <button onClick={stop} disabled={!speaking}>Stop</button>
          </div>

          <h4>Host notes</h4>
          <ul>
            {narration?.notes.map((n,i)=>(<li key={i}>{n}</li>))}
          </ul>
        </div>

        {/* RIGHT: Assignments */}
        <div className="panel">
          <h3>Assignments</h3>
          <div className="box">
            {assignments ? (
              <ol>{assignments.map(a => (<li key={a.seat}>Seat {a.seat}: <b>{a.role}</b> <span className={a.team==='Good'?'good':'evil'}>({a.team})</span></li>))}</ol>
            ) : <div className="placeholder">Assign roles to see seats here.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
