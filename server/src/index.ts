import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { assignRoles, buildNarration, RolesToggle } from './narration.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*' }));

app.post('/api/assign', (req, res) => {
  const { players, roles } = req.body as { players: number; roles: RolesToggle };
  const assignments = assignRoles(players, roles);
  const good = assignments.filter(a => a.team === 'Good').length;
  const evil = assignments.length - good;
  res.json({ assignments, good, evil });
});

app.post('/api/narration', (req, res) => {
  const { players, roles } = req.body as { players: number; roles: RolesToggle };
  res.json(buildNarration(roles, players));
});

// Optional ElevenLabs TTS
app.post('/api/tts', async (req, res) => {
  const { text } = req.body as { text: string };
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel default
  if (!key) return res.status(400).send('ELEVENLABS_API_KEY not set');

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_settings: { stability: 0.4, similarity_boost: 0.8 } })
  });

  if (!r.ok) return res.status(500).send(await r.text());
  const ab = await r.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(Buffer.from(ab));
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
