# Supabase Setup Guide for Avalon - The Resistance

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up/Login with GitHub
4. Click "New Project"
5. Choose your organization
6. Enter project details:
   - **Name**: `avalon-voice-agent`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
7. Click "Create new project"

## 2. Set up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Click "Run" to execute the schema

## 3. Configure Authentication

### Enable Google OAuth:
1. Go to **Authentication** → **Providers**
2. Find **Google** and click configure
3. Enable Google provider
4. Add your Google OAuth credentials:
   - **Client ID**: Get from Google Cloud Console
   - **Client Secret**: Get from Google Cloud Console
5. Add redirect URLs:
   - `https://aeonic.earth/auth/callback`
   - `http://localhost:5173/auth/callback` (for development)

### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `https://[your-project-id].supabase.co/auth/v1/callback`

## 4. Get Environment Variables

1. Go to **Settings** → **API** in Supabase
2. Copy these values:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 5. Configure Local Environment

1. Create `client/.env` file:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Add to Vercel environment variables:
   - Go to Vercel dashboard → Project Settings → Environment Variables
   - Add the same variables for Production

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Click "Play Online Multiplayer"
3. Try Google sign-in
4. Create a player profile
5. Create a room

## 7. Row Level Security (RLS)

The schema includes RLS policies that ensure:
- Users can only see/edit their own profiles
- Users can view public rooms
- Only room hosts can modify their rooms
- Only room members can see game sessions and chat

## 8. Real-time Features

Supabase automatically provides real-time updates for:
- Room player counts
- Chat messages
- Game state changes

## Troubleshooting

### Common Issues:

1. **"Missing environment variables"**
   - Check your `.env` file exists and has correct values
   - Restart your dev server after adding env vars

2. **Google OAuth not working**
   - Verify redirect URLs match exactly
   - Check Google Cloud Console credentials
   - Ensure OAuth consent screen is configured

3. **Database errors**
   - Check if schema was applied correctly
   - Verify RLS policies are enabled
   - Check Supabase logs in dashboard

4. **Real-time not working**
   - Ensure you're subscribed to the right channels
   - Check browser console for WebSocket errors

## Production Deployment

For production on `aeonic.earth`:
1. Add production environment variables to Vercel
2. Update Google OAuth redirect URLs
3. Test authentication flow
4. Monitor Supabase dashboard for usage

Your Avalon multiplayer game should now be fully functional! 🎉
