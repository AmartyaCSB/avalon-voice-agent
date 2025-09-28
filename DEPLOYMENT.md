# Deployment to aeonic.earth

## Option 1: Vercel (Recommended)

### 1. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository: `AmartyaCSB/avalon-voice-agent`
4. Select the `lobby-creation` branch
5. Vercel will auto-detect it's a Vite project
6. Deploy!

### 2. Add Custom Domain in Vercel
1. Go to your project dashboard in Vercel
2. Click "Settings" → "Domains"
3. Add `aeonic.earth` and `www.aeonic.earth`
4. Vercel will provide DNS records to configure

### 3. Configure DNS in Porkbun
1. Login to your Porkbun account
2. Go to "DNS" for aeonic.earth
3. Add these records (Vercel will provide exact values):
   ```
   Type: A
   Name: @
   Value: 76.76.19.61 (Vercel's IP)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

## Option 2: Netlify

### 1. Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Build settings:
   - Build command: `cd client && npm run build`
   - Publish directory: `client/dist`

### 2. Add Custom Domain
1. Site settings → Domain management
2. Add custom domain: `aeonic.earth`
3. Configure DNS in Porkbun with provided records

## Option 3: Full Stack with Railway

If you want to add backend features later:

1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub
3. Add custom domain
4. Can easily add databases, APIs, etc.

## Current Configuration

- ✅ Vite config updated for root path
- ✅ vercel.json configured
- ✅ Ready for custom domain deployment

## After Deployment

Your Avalon app will be available at:
- https://aeonic.earth
- https://www.aeonic.earth

Features available:
- 🎮 Online multiplayer lobbies (demo mode)
- 🎤 AI Voice Narration (fully functional)
- 📱 Responsive design
- ⚡ Fast loading with Vite
