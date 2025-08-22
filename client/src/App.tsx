import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import type { RolesToggle, Assignment } from "./types";
import { getAssignments, getNarration, ttsEnabledServerSide, ttsMp3Blob } from "./api";
import { validateConfiguration } from "./logic";  
import { isAdvanced, teamCountsSafe, buildSummary } from "./logic"; 
import { marked } from "marked";
import DOMPurify from "dompurify";
import { faqMarkdown } from "./faq";



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
  const [playersInput, setPlayersInput] = useState("7");
  const [roles, setRoles] = useState<RolesToggle>(defaultRoles);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [narration, setNarration] = useState<{steps:string[], notes:string[]} | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [loadingNarration, setLoadingNarration] = useState(false);
  const speakingRef = useRef(false);
  const synthRef = useRef(window.speechSynthesis);
  const [rate, setRate] = useState(0.95);         // 0.6x .. 1.4x
  const [repeat, setRepeat] = useState(1);        // 1, 2, 3 times
  const audioRef = useRef<HTMLAudioElement | null>(null); // for server TTS stop()
  const ttsCache = useRef<Map<string, Blob>>(new Map());  // cache server mp3 per line
  useEffect(() => { synthRef.current?.cancel(); setSpeaking(false); }, []);
  const [summary, setSummary] = useState("");
  const { good: seatGood, evil: seatEvil } = teamCountsSafe(players);
  const runRef = useRef(0);                               
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<"faq"|"rules">("faq");
  const [rulesHtml, setRulesHtml] = useState<string>("");
  const [loadingRulesDoc, setLoadingRulesDoc] = useState(false);
        
  async function openHelp(tab: "faq"|"rules" = "faq") {
    setHelpOpen(true);
    setHelpTab(tab);

    if (tab === "rules" && !rulesHtml) {
      setLoadingRulesDoc(true);
      try {
        const url = `${import.meta.env.BASE_URL}rules.md`; // served from client/public
        const md = await fetch(url).then(r => r.text());
        const html = marked.parse(md);
        setRulesHtml(DOMPurify.sanitize(html as string));
      } finally {
        setLoadingRulesDoc(false);
      }
    }
  }


  async function handleAssign() {
  // 1) Assign seats
  const res = await getAssignments(players, roles);
  setAssignments(res.assignments);

  // 2) Prepare narration text immediately (do NOT auto-speak)
  setLoadingNarration(true);
  try {
    const nar = await getNarration(players, roles);
    setNarration(nar);
  } finally {
    setLoadingNarration(false);
  }

  // 3) Update the summary line (Base vs Advanced, seats, selected roles)
  setSummary(buildSummary(players, roles));
}

  async function onNarrate() {
    if (validation.errors.length) return;

    const myRun = ++runRef.current;    
    setLoadingNarration(true);
    try {
      const res = await getNarration(players, roles);
      if (runRef.current !== myRun) return;   // aborted
      setNarration(res);
      await speakNarration(res, myRun);       // pass token
    } finally {
      if (runRef.current === myRun) setLoadingNarration(false);
    }
  }

  async function speakNarration(
    data?: { steps: string[]; notes: string[] },
    runId?: number
  ) {
    const src = data ?? narration;
    if (!src) return;

    setSpeaking(true);
    speakingRef.current = true;
    const currentRun = runId ?? runRef.current;

    const gapBetweenLinesMs = 550;
    const gapBetweenRepeatsMs = 350;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      if (ttsEnabledServerSide()) {
        for (const line of src.steps) {
          if (runRef.current !== currentRun || !speakingRef.current) return;
          for (let i = 0; i < repeat; i++) {
            if (runRef.current !== currentRun || !speakingRef.current) return;
            let blob = ttsCache.current.get(line);
            if (!blob) { blob = await ttsMp3Blob(line); ttsCache.current.set(line, blob); }
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
        for (const line of src.steps) {
          if (runRef.current !== currentRun || !speakingRef.current) return;
          for (let i = 0; i < repeat; i++) {
            if (runRef.current !== currentRun || !speakingRef.current) return;
            await speak(line, rate);
            if (i < repeat - 1) await delay(gapBetweenRepeatsMs);
          }
          await delay(gapBetweenLinesMs);
        }
      }
    } finally {
      if (runRef.current === currentRun) {
        setSpeaking(false);
        speakingRef.current = false;
      }
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
    runRef.current++;                 
    setSpeaking(false);
    setLoadingNarration(false);       
    speakingRef.current = false;

    // Browser TTS
    synthRef.current?.cancel();
    // Server TTS
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }


const validation = validateConfiguration(players, roles);
const { counts } = validation
const quick = `**Current selection:** Players ${players} — Seats: Good ${counts.goodSlots}, Evil ${counts.evilSlots}. Selected: Good ${counts.goodSelected}, Evil ${counts.evilSelected}.`;
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
      <p className="muted">Pick roles, assign roles, and narrate the reveal. Advanced Big Box modules included.</p>

      <div className="grid">
        {/* LEFT: Controls */}
        <div className={leftPanelClass}>
          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => openHelp("faq")}>FAQ</button>
            <button onClick={() => openHelp("rules")}>Extended Rules</button>
          </div>


          <p className="muted small"> 
            Step 1: Pick number of players . Step 2: pick base/advanced roles (Assassin is already present as an evil player!)</p> 

          <div className="row" style={{ alignItems: "center", gap: 10 }}>
            <label>Players (5–10)</label>
            <input
              type="number"
              min={5}
              max={10}
              value={playersInput}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setPlayersInput(v);
                const n = parseInt(v, 10);
                if (!Number.isNaN(n)) setPlayers(n);
              }}
              onBlur={() => {
                const n = parseInt(playersInput, 10);
                const clamped = Number.isNaN(n) ? 5 : Math.max(5, Math.min(10, n));
                setPlayers(clamped);
                setPlayersInput(String(clamped));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              }}
            />
            <span className="muted small" style={{ whiteSpace: "nowrap" }}>
              {seatGood && seatEvil ? `Seats → Good ${seatGood} · Evil ${seatEvil}` : "Choose 5–10 players"}
            </span>
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

          <div className="status-line">
            <div className="status-group">
              <span><b>Good</b></span>
              <span className={goodPill} title="Total Good seats for the selected player count">Seats: {validation.counts.goodSlots}</span>
              <span className={goodPill} title="Good special roles you've toggled">Selected: {validation.counts.goodSelected}</span>
            </div>
            <div className="status-group">
              <span><b>Evil</b></span>
              <span className={evilPill} title="Total Evil seats for the selected player count">Seats: {validation.counts.evilSlots}</span>
              <span className={evilPill} title="Evil special roles you've toggled">Selected: {validation.counts.evilSelected}</span>
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
          {helpOpen && (
            <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="tabs">
                    <button
                      className={helpTab === "faq" ? "tab active" : "tab"}
                      onClick={() => setHelpTab("faq")}
                    >FAQ</button>
                    <button
                      className={helpTab === "rules" ? "tab active" : "tab"}
                      onClick={() => openHelp("rules")}
                    >Extended Rules</button>
                  </div>
                  <button className="close" onClick={() => setHelpOpen(false)}>×</button>
                </div>

                <div className="modal-body">
                  {helpTab === "faq" ? (
                    <article
                      className="md"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          marked.parse(
                            `**Current selection:** Players ${players} — Seats: Good ${counts.goodSlots}, Evil ${counts.evilSlots}. `
                            + `Selected: Good ${counts.goodSelected}, Evil ${counts.evilSelected}.`
                            + `\n\n` + faqMarkdown
                          ) as string
                        )
                      }}
                    />
                  ) : loadingRulesDoc ? (
                    <div className="muted">Loading README…</div>
                  ) : (
                    <article className="md" dangerouslySetInnerHTML={{ __html: rulesHtml }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* <div className="muted small">Browser TTS uses the Web Speech API. If you deploy a server and set <code>VITE_SERVER_URL</code>, you can switch to premium voices.</div> */}
        </div>

        {/* CENTER: Narration */}
        <div className="panel">
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

          <h3>Narration - 
            <span className="mode-tag">{isAdvanced(roles) ? " Advanced play" : " Base game"}</span>
          </h3>

          {summary && (
            <div className="muted small" style={{ margin: "6px 0 10px" }}>
              {summary}
            </div>
          )}

          <div className="box">
            {narration ? (
              <textarea readOnly value={narration.steps.map((s,i)=>`${i+1}. ${s}`).join("\n\n")} />
            ) : (
              <div className="placeholder">Click “Narrate Setup” to preview.</div>
            )}
          </div>
          <div className="row">
            <button
              onClick={onNarrate}
              disabled={hasErrors || loadingNarration}
              title={hasErrors ? validation.errors[0] : undefined}
            >
              {loadingNarration ? "Preparing…" : "Narrate Setup"}
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
