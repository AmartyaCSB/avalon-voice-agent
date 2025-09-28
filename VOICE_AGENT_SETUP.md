# 🎤 Voice Agent Setup Guide

The Avalon Voice Agent provides AI-powered voice narration for role assignments using ElevenLabs TTS.

## Quick Setup Options

### Option 1: Client-Only Mode (No Voice)
✅ **Already Working** - Role assignments work without voice narration

### Option 2: Full Voice Narration (Recommended)
🎤 **Get ElevenLabs API Key** - Follow the steps below

## 🚀 Complete Voice Setup

### Step 1: Get ElevenLabs API Key

1. **Visit** [ElevenLabs.io](https://elevenlabs.io)
2. **Create a free account** (includes 10,000 characters/month)
3. **Go to Profile** → **API Keys**
4. **Copy your API key**

### Step 2: Configure Environment Variables

#### For Local Development:

Create `server/.env`:
```bash
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
PORT=8787
CLIENT_ORIGIN=http://localhost:5173,https://aeonic.earth
```

Create `client/.env`:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SERVER_URL=http://localhost:8787
```

#### For Production (Vercel):

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Add these variables**:
   ```
   ELEVENLABS_API_KEY=your_api_key_here
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   CLIENT_ORIGIN=https://aeonic.earth
   ```

### Step 3: Deploy Server

#### Option A: Deploy to Railway (Recommended)

1. **Visit** [Railway.app](https://railway.app)
2. **Connect your GitHub repository**
3. **Set root directory** to `server`
4. **Add environment variables** from Step 2
5. **Deploy**
6. **Update client .env** with your Railway URL:
   ```bash
   VITE_SERVER_URL=https://your-app.railway.app
   ```

#### Option B: Deploy to Vercel

Add `vercel-server.json` to server directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

### Step 4: Test Voice Narration

1. **Visit** `https://aeonic.earth/voice-agent`
2. **Configure roles and players**
3. **Click "Assign Roles"**
4. **Click "Narrate Setup"** 
5. **Should hear AI voice narration!** 🎤

## 🎛️ Voice Settings

- **Default Voice**: Rachel (warm, clear narrator)
- **Available Voices**: Check ElevenLabs dashboard for more options
- **Speech Rate**: Adjustable in the UI (0.5x to 2x speed)
- **Repeat**: Can repeat narration multiple times

## 🔧 Troubleshooting

### "Error connecting to server"
- Check if `VITE_SERVER_URL` is set correctly
- Verify server is running and accessible
- Check CORS settings in server

### "TTS not working"
- Verify `ELEVENLABS_API_KEY` is set
- Check ElevenLabs account has available credits
- Try different voice ID

### "Profile creation not working"
- This is unrelated to voice agent
- Check Supabase database schema is updated
- Use debug console for details

## 💰 Cost Considerations

- **ElevenLabs Free Tier**: 10,000 characters/month
- **Typical narration**: ~500-1000 characters per game
- **Estimated usage**: 10-20 games per month on free tier
- **Paid plans**: Start at $5/month for 30,000 characters

## 🎯 Quick Test Commands

```bash
# Test server locally
cd server
npm install
npm run dev

# Test client locally  
cd client
npm run dev
```

**Your voice agent will be fully functional once the server is deployed with ElevenLabs API key!** 🎉
