# Deployment Guide for Avalon - The Resistance

## 🚀 Automated GitHub Pages Deployment

This project is set up with GitHub Actions for automatic deployment to GitHub Pages.

### How it works:
1. **Push to `lobby-creation` branch** → Triggers automatic build and deployment
2. **GitHub Actions** builds the client and deploys to `gh-pages` branch
3. **GitHub Pages** serves the site at: `https://yourusername.github.io/avalon-voice-agent/`

### Setup Steps:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Complete Avalon - The Resistance with lobby system and voice agent"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin lobby-creation
   ```

3. **Enable GitHub Pages:**
   - Go to your GitHub repository
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `/ (root)`
   - Save

4. **Wait for deployment:**
   - Check the "Actions" tab in your GitHub repo
   - The workflow will automatically build and deploy
   - Your site will be live at: `https://yourusername.github.io/avalon-voice-agent/`

### Manual Deployment (if needed):
```bash
cd client
npm run build
npm run deploy
```

## 🎯 What Gets Deployed:

- **Landing Page**: Avalon - The Resistance homepage
- **Voice Agent**: Complete role assignment and narration system (no login required)
- **Multiplayer Lobbies**: Google OAuth login system for online play
- **Responsive Design**: Works on desktop and mobile

## 🔧 Configuration:

- **Base URL**: Set in `client/vite.config.ts` as `/avalon-voice-agent/`
- **GitHub Actions**: Configured in `.github/workflows/deploy.yml`
- **Build Output**: `client/dist/` directory gets deployed to `gh-pages` branch

## 🌐 Live Site Features:

1. **Public Access**: Voice Agent works without login
2. **Multiplayer**: Requires Google sign-in for lobbies
3. **Complete Avalon Experience**: All roles, narration, and game features
4. **Mobile Friendly**: Responsive design for all devices


