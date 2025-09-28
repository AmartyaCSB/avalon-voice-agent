import React, { useEffect, useRef, useState } from "react";
import type { RolesToggle, Assignment } from "../types";
import { getAssignments, getNarration, ttsEnabledServerSide, ttsMp3Blob } from "../api";
import { validateConfiguration, isAdvanced, teamCountsSafe, buildSummary } from "../logic";
import { faqMarkdown } from "../faq";

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

interface AvalonVoiceAgentProps {
  onBack: () => void;
}

export default function AvalonVoiceAgent({ onBack }: AvalonVoiceAgentProps) {
  // Check URL parameters for room integration
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');
  const roomPlayers = urlParams.get('players');
  
  const [players, setPlayers] = useState(roomPlayers ? parseInt(roomPlayers) : 7);
  const [playersInput, setPlayersInput] = useState(roomPlayers || "7");
  const [roles, setRoles] = useState<RolesToggle>(defaultRoles);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [narration, setNarration] = useState<{steps:string[], notes:string[]} | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [loadingNarration, setLoadingNarration] = useState(false);
  const speakingRef = useRef(false);
  const synthRef = useRef(window.speechSynthesis);
  const [rate, setRate] = useState(0.95);
  const [repeat, setRepeat] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCache = useRef<Map<string, Blob>>(new Map());
  const [summary, setSummary] = useState("");
  const { good: seatGood, evil: seatEvil } = teamCountsSafe(players);
  const runRef = useRef(0);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => { 
    synthRef.current?.cancel(); 
    setSpeaking(false); 
  }, []);

  async function handleAssign() {
    // Always use local assignment (no server dependency)
    generateLocalAssignment();
  }

  function generateLocalAssignment() {
    // Import logic for local role generation
    const assignments = getLocalAssignments(players, roles);
    setAssignments(assignments);
    setSummary(buildSummary(players, roles));
    
    // Generate proper narration based on roles
    const narrationSteps = generateNarrationSteps(assignments, roles);
    setNarration({
      steps: narrationSteps,
      notes: ["Click 'Narrate Setup' to hear the role reveals with voice"]
    });
  }

  function generateNarrationSteps(assignments: any[], roleConfig: any) {
    const steps = [
      "Welcome to Avalon! The fate of the kingdom rests in your hands.",
      "Close your eyes and listen carefully to your role assignment."
    ];

    // Add role-specific instructions
    const hasSpecialRoles = roleConfig.Merlin || roleConfig.Percival || roleConfig.Morgana || roleConfig.Mordred;
    
    if (hasSpecialRoles) {
      steps.push("Special roles have been distributed among you.");
      
      if (roleConfig.Merlin) {
        steps.push("Merlin, you know the forces of evil, but they must not discover your identity.");
      }
      
      if (roleConfig.Percival) {
        steps.push("Percival, you must find and protect Merlin, but beware of Morgana's deception.");
      }
      
      if (roleConfig.Morgana) {
        steps.push("Morgana, you appear as Merlin to Percival. Use this to sow confusion among the good.");
      }
      
      if (roleConfig.Mordred) {
        steps.push("Mordred, you are hidden from Merlin's sight. Use this advantage wisely.");
      }
    }

    steps.push("Each player will now see their individual role assignment.");
    steps.push("Good servants of Arthur, work together to complete three quests.");
    steps.push("Minions of Mordred, sabotage the quests and remain hidden.");
    steps.push("The game begins now. May the best side prevail!");

    return steps;
  }

  function getLocalAssignments(playerCount: number, roleConfig: any) {
    // Simple local role assignment logic
    const { good: goodCount, evil: evilCount } = teamCountsSafe(playerCount);
    const assignments = [];
    
    // Available roles based on configuration
    const goodRoles = [];
    const evilRoles = [];
    
    if (roleConfig.Merlin) goodRoles.push('Merlin');
    if (roleConfig.Percival) goodRoles.push('Percival');
    if (roleConfig.Morgana) evilRoles.push('Morgana');
    if (roleConfig.Mordred) evilRoles.push('Mordred');
    if (roleConfig.Oberon) evilRoles.push('Oberon');
    
    // Fill with generic roles
    while (goodRoles.length < goodCount) {
      goodRoles.push('Loyal Servant of Arthur');
    }
    while (evilRoles.length < evilCount) {
      evilRoles.push('Minion of Mordred');
    }
    
    // Combine and shuffle
    const allRoles = [
      ...goodRoles.map(role => ({ role, team: 'Good' })),
      ...evilRoles.map(role => ({ role, team: 'Evil' }))
    ].sort(() => Math.random() - 0.5);
    
    // Create assignments
    for (let i = 0; i < playerCount; i++) {
      assignments.push({
        player: i + 1,
        role: allRoles[i].role,
        team: allRoles[i].team
      });
    }
    
    return assignments;
  }

  async function onNarrate() {
    if (validation.errors.length) return;

    const myRun = ++runRef.current;    
    
    // If no narration exists, generate it first
    if (!narration) {
      if (!assignments) {
        alert('Please assign roles first before narrating!');
        return;
      }
      const localNarration = generateNarrationSteps(assignments, roles);
      setNarration({
        steps: localNarration,
        notes: ["Voice narration using browser text-to-speech"]
      });
    }

    // Use existing or newly generated narration
    const currentNarration = narration || {
      steps: generateNarrationSteps(assignments || [], roles),
      notes: ["Voice narration using browser text-to-speech"]
    };

    await speakNarration(currentNarration, myRun);
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
            if (!blob) { 
              try {
                blob = await ttsMp3Blob(line); 
                ttsCache.current.set(line, blob); 
              } catch (error) {
                console.error('TTS error:', error);
                // Fall back to browser TTS
                await speak(line, rate);
                continue;
              }
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
      utter.rate = r;
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

    synthRef.current?.cancel();
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }

  const validation = validateConfiguration(players, roles);
  const { counts } = validation;
  const hasErrors = validation.errors.length > 0;

  function pillClass(selected: number, slots: number) {
    if (selected > slots) return "pill-red";
    if (selected === slots) return "pill-green";
    if (selected >= Math.max(0, slots - 1)) return "pill-amber";
    return "pill";
  }

  const goodPill = pillClass(validation.counts.goodSelected, validation.counts.goodSlots);
  const evilPill = pillClass(validation.counts.evilSelected, validation.counts.evilSlots);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Room Integration Banner */}
        {roomCode && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎮</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Room: {roomCode} | {roomPlayers} Players
            </div>
            <div style={{ opacity: 0.9 }}>
              Assign roles for your lobby game! Roles will be revealed to each player.
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎤 Avalon Voice Agent</h1>
            <p style={{ opacity: 0.9 }}>Pick roles, assign roles, and narrate the reveal. Advanced Big Box modules included.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setHelpOpen(true)}
              style={{
                background: '#9333ea',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              FAQ & Rules
            </button>
            <button 
              onClick={() => {
                if (roomCode && assignments) {
                  // Pass assignments back to lobby
                  const assignmentsParam = encodeURIComponent(JSON.stringify(assignments))
                  window.location.href = `/lobby?assignments=${assignmentsParam}`
                } else {
                  onBack()
                }
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {roomCode ? 'Return to Game' : 'Back to Home'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          {/* LEFT: Controls */}
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1.5rem', 
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: hasErrors ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
              Step 1: Pick number of players. Step 2: pick base/advanced roles (Assassin is already present as an evil player!)
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
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
                style={{
                  width: '80px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {seatGood && seatEvil ? `Seats → Good ${seatGood} · Evil ${seatEvil}` : "Choose 5–10 players"}
              </span>
            </div>

            <h4 style={{ marginBottom: '0.5rem' }}>Base roles</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              {(['Merlin','Percival','Mordred','Morgana','Oberon'] as (keyof RolesToggle)[]).map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={roles[k] as boolean}
                    onChange={e => setRoles(r => ({ ...r, [k]: e.target.checked }))}
                  />
                  <span>{k}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Good</span>
                <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: goodPill === 'pill-green' ? '#16a34a' : goodPill === 'pill-red' ? '#dc2626' : goodPill === 'pill-amber' ? '#d97706' : '#6b7280'
                }}>
                  Seats: {validation.counts.goodSlots}
                </span>
                <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: goodPill === 'pill-green' ? '#16a34a' : goodPill === 'pill-red' ? '#dc2626' : goodPill === 'pill-amber' ? '#d97706' : '#6b7280'
                }}>
                  Selected: {validation.counts.goodSelected}
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold' }}>Evil</span>
                <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: evilPill === 'pill-green' ? '#16a34a' : evilPill === 'pill-red' ? '#dc2626' : evilPill === 'pill-amber' ? '#d97706' : '#6b7280'
                }}>
                  Seats: {validation.counts.evilSlots}
                </span>
                <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: evilPill === 'pill-green' ? '#16a34a' : evilPill === 'pill-red' ? '#dc2626' : evilPill === 'pill-amber' ? '#d97706' : '#6b7280'
                }}>
                  Selected: {validation.counts.evilSelected}
                </span>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div style={{ 
                background: '#dc2626', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem' 
              }}>
                <strong>Cannot start:</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem' }}>
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div style={{ 
                background: '#d97706', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem' 
              }}>
                <strong>Heads up:</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem' }}>
                  {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Advanced play</summary>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <label style={{ minWidth: '110px' }}>Lancelots</label>
                  <select 
                    value={roles.LancelotMode}
                    onChange={e => setRoles(r => ({ ...r, LancelotMode: e.target.value as any }))}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  >
                    <option value="off">Off</option>
                    <option value="classic">Classic (know each other)</option>
                    <option value="variant">Variant (don't know; Evil thumbs only)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Cleric}
                      onChange={e => setRoles(r => ({ ...r, Cleric: e.target.checked }))}/>
                    <span>Cleric (leader check in reveal)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.LadyOfTheLake}
                      onChange={e => setRoles(r => ({ ...r, LadyOfTheLake: e.target.checked }))}/>
                    <span>Lady of the Lake</span>
                  </label>
                </div>

                <h5>Messengers</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.MessengerJunior}
                      onChange={e => setRoles(r => ({ ...r, MessengerJunior: e.target.checked }))}/>
                    <span>Junior (Good)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.MessengerSenior}
                      onChange={e => setRoles(r => ({ ...r, MessengerSenior: e.target.checked }))}/>
                    <span>Senior (Good)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.MessengerEvil}
                      onChange={e => setRoles(r => ({ ...r, MessengerEvil: e.target.checked }))}/>
                    <span>Evil Messenger</span>
                  </label>
                </div>

                <h5>Rogues & Sorcerers</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.RogueGood}
                      onChange={e => setRoles(r => ({ ...r, RogueGood: e.target.checked }))}/>
                    <span>Good Rogue (Success)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.RogueEvil}
                      onChange={e => setRoles(r => ({ ...r, RogueEvil: e.target.checked }))}/>
                    <span>Evil Rogue (Fail, hidden)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.SorcererGood}
                      onChange={e => setRoles(r => ({ ...r, SorcererGood: e.target.checked }))}/>
                    <span>Good Sorcerer (Magic)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.SorcererEvil}
                      onChange={e => setRoles(r => ({ ...r, SorcererEvil: e.target.checked }))}/>
                    <span>Evil Sorcerer (Magic)</span>
                  </label>
                </div>

                <h5>Good extras</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Troublemaker}
                      onChange={e => setRoles(r => ({ ...r, Troublemaker: e.target.checked }))}/>
                    <span>Troublemaker (may lie)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.UntrustworthyServant}
                      onChange={e => setRoles(r => ({ ...r, UntrustworthyServant: e.target.checked }))}/>
                    <span>Untrustworthy Servant</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Apprentice}
                      onChange={e => setRoles(r => ({ ...r, Apprentice: e.target.checked }))}/>
                    <span>Apprentice</span>
                  </label>
                </div>

                <h5>Evil extras</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Lunatic}
                      onChange={e => setRoles(r => ({ ...r, Lunatic: e.target.checked }))}/>
                    <span>Lunatic (must Fail)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Brute}
                      onChange={e => setRoles(r => ({ ...r, Brute: e.target.checked }))}/>
                    <span>Brute (Fail only first 3)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Revealer}
                      onChange={e => setRoles(r => ({ ...r, Revealer: e.target.checked }))}/>
                    <span>Revealer (shows after 2nd fail)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={roles.Trickster}
                      onChange={e => setRoles(r => ({ ...r, Trickster: e.target.checked }))}/>
                    <span>Trickster (may lie)</span>
                  </label>
                </div>
              </div>
            </details>

            <button
              onClick={handleAssign}
              disabled={hasErrors}
              style={{
                background: hasErrors ? '#6b7280' : '#16a34a',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: hasErrors ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                width: '100%'
              }}
            >
              Assign Roles
            </button>
          </div>

          {/* CENTER: Narration */}
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1.5rem', 
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ minWidth: '130px' }}>Narration speed</label>
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={rate}
                onChange={e => setRate(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: '56px', textAlign: 'right' }}>{rate.toFixed(2)}×</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ minWidth: '130px' }}>Repeat each line</label>
              <select 
                value={repeat} 
                onChange={e => setRepeat(parseInt(e.target.value, 10))}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                <option value={1}>Once</option>
                <option value={2}>Twice</option>
                <option value={3}>Thrice</option>
              </select>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>
              Narration - 
              <span style={{ 
                background: isAdvanced(roles) ? '#9333ea' : '#16a34a',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginLeft: '0.5rem'
              }}>
                {isAdvanced(roles) ? " Advanced play" : " Base game"}
              </span>
            </h3>

            {summary && (
              <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                {summary}
              </div>
            )}

            <div style={{ 
              minHeight: '220px', 
              border: '2px dashed rgba(255,255,255,0.3)', 
              borderRadius: '8px', 
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              {narration ? (
                <textarea 
                  readOnly 
                  value={narration.steps.map((s,i)=>`${i+1}. ${s}`).join("\n\n")} 
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    border: 'none',
                    background: 'transparent',
                    color: 'white',
                    resize: 'vertical',
                    fontSize: '0.9rem'
                  }}
                />
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingTop: '4rem' }}>
                  Click "Narrate Setup" to preview.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onClick={onNarrate}
                disabled={hasErrors || loadingNarration}
                style={{
                  background: (hasErrors || loadingNarration) ? '#6b7280' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: (hasErrors || loadingNarration) ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  flex: 1
                }}
              >
                {loadingNarration ? "Preparing…" : "Narrate Setup"}
              </button>

              <button 
                onClick={stop} 
                disabled={!speaking}
                style={{
                  background: !speaking ? '#6b7280' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: !speaking ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Stop
              </button>
            </div>

            <h4>Host notes</h4>
            <ul style={{ paddingLeft: '1.5rem' }}>
              {narration?.notes.map((n,i)=>(<li key={i} style={{ marginBottom: '0.5rem' }}>{n}</li>))}
            </ul>
          </div>

          {/* RIGHT: Assignments */}
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1.5rem', 
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Assignments</h3>
            <div style={{ 
              minHeight: '120px', 
              border: '2px dashed rgba(255,255,255,0.3)', 
              borderRadius: '8px', 
              padding: '1rem'
            }}>
              {assignments ? (
                <ol style={{ paddingLeft: '1.5rem' }}>
                  {assignments.map(a => (
                    <li key={a.seat} style={{ marginBottom: '0.5rem' }}>
                      Seat {a.seat}: <strong>{a.role}</strong> 
                      <span style={{ 
                        color: a.team === 'Good' ? '#22c55e' : '#ef4444',
                        marginLeft: '0.5rem'
                      }}>
                        ({a.team})
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingTop: '2rem' }}>
                  Assign roles to see seats here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {helpOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => setHelpOpen(false)}
        >
          <div 
            style={{ 
              background: 'white', 
              color: '#111', 
              borderRadius: '12px', 
              padding: '2rem', 
              maxWidth: '800px', 
              maxHeight: '80vh', 
              overflow: 'auto',
              margin: '2rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>FAQ & Rules</h2>
              <button 
                onClick={() => setHelpOpen(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer' 
                }}
              >
                ×
              </button>
            </div>
            <div 
              style={{ lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{ 
                __html: faqMarkdown.replace(/\n/g, '<br>').replace(/### (.*?)<br>/g, '<h3>$1</h3>').replace(/## (.*?)<br>/g, '<h2>$1</h2>')
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
