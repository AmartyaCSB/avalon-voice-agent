import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { assignRoles, buildNarration, teamCounts, RolesToggle } from "./narration";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

const PORT = Number(process.env.PORT || 8787);

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.post("/api/assign", (req, res) => {
  const { players, roles } = req.body as { players: number; roles: RolesToggle };
  try {
    const assignments = assignRoles(players, roles);
    const { good, evil } = teamCounts(players);
    res.json({ assignments, good, evil });
  } catch (e: any) {
    res.status(400).json({ error: e.message || String(e) });
  }
});

app.post("/api/narration", (req, res) => {
  const { players, roles } = req.body as { players: number; roles: RolesToggle };
  try {
    const narration = buildNarration(roles, players);
    res.json(narration);
  } catch (e: any) {
    res.status(400).json({ error: e.message || String(e) });
  }
});

// ElevenLabs TTS (buffer approach, safe on Node 18+)
app.post("/api/tts", async (req, res) => {
  const { text } = req.body as { text: string };
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  if (!key) return res.status(501).json({ error: "Server TTS not configured" });

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!r.ok) {
      const msg = await r.text();
      return res.status(500).json({ error: `TTS failed: ${msg}` });
    }

    const ab = await r.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.end(Buffer.from(ab));
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// graceful shutdown (prevents odd exits on Windows)
process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
