# Supabase Setup Guide for Avalon Voice Agent

## 🚀 **Quick Setup Steps**

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with your Google account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `avalon-voice-agent`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users

### 2. Get Your Project Credentials
After creating the project, go to **Settings > API** and copy:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Set Up Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL to create tables and policies

### 4. Configure Authentication
1. Go to **Authentication > Settings**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: `27071611637-8t8uqb650nrkit93648tht0taatduuc6.apps.googleusercontent.com`
   - **Client Secret**: `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`
4. Set **Redirect URL**: `https://your-project-id.supabase.co/auth/v1/callback`

### 5. Environment Variables
Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (already configured)
GOOGLE_CLIENT_ID=27071611637-8t8uqb650nrkit93648tht0taatduuc6.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## 🎮 **Features Included**

### User Management
- ✅ Google OAuth authentication
- ✅ User profiles with avatars
- ✅ Player personas and preferences

### Game Rooms
- ✅ Create/join game rooms
- ✅ Room codes for easy joining
- ✅ Player limits (5-10 players)
- ✅ Real-time player list

### Game Features
- ✅ Real-time chat
- ✅ Game state management
- ✅ Mission history tracking
- ✅ Player statistics

## 🔒 **Security Features**

- **Row Level Security (RLS)** enabled on all tables
- **Authentication required** for all operations
- **User isolation** - users can only access their own data
- **Room-based permissions** for game operations

## 📊 **Database Schema Overview**

```
users (extends auth.users)
├── player_profiles (user personas)
├── game_rooms (game instances)
│   ├── room_players (many-to-many)
│   ├── game_sessions (game state)
│   └── chat_messages (real-time chat)
```

## 🚀 **Next Steps**

1. Set up your Supabase project
2. Run the database schema
3. Configure Google OAuth
4. Update your environment variables
5. Test the authentication flow
