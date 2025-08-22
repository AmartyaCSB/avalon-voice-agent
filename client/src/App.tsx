import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import type { RolesToggle, Assignment } from "./types";
import { getAssignments, getNarration, ttsEnabledServerSide, ttsMp3Blob } from "./api";

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
    if (ttsEnabledServerSide()) {
      // server TTS: combine lines and play as single mp3
      const blob = await ttsMp3Blob(narration.steps.join(" "));
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setSpeaking(false);
      await audio.play();
    } else {
      // Browser TTS line-by-line
      for (const line of narration.steps) {
        if (!speaking) break;
        await speak(line);
      }
      setSpeaking(false);
    }
  }

  function speak(text: string) {
    return new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.onend = () => resolve();
      synthRef.current?.speak(utter);
    });
  }

  function stop() {
    setSpeaking(false);
    synthRef.current?.cancel();
  }

  return (
    <div className="wrap">
      <h1>Avalon Voice Agent</h1>
      <p className="muted">Pick roles, assign seats, and narrate the reveal. Advanced Big Box modules included.</p>

      <div className="grid">
        {/* LEFT: Controls */}
        <div className="panel">
          <div className="row">
            <label>Players (5–10)</label>
            <input type="number" min={5} max={10} value={players}
              onChange={e => setPlayers(parseInt(e.target.value || "5"))}/>
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
            <button onClick={handleAssign}>Assign Roles</button>
          </div>

          <div className="muted small">Browser TTS uses the Web Speech API. If you deploy a server and set <code>VITE_SERVER_URL</code>, you can switch to premium voices.</div>
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
            <button onClick={async ()=>{ await prepareNarration(); await speakNarration(); setSpeaking(true);}}>Narrate Setup</button>
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
