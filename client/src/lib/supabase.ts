import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface User {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  google_id?: string
  created_at: string
  updated_at: string
}

export interface PlayerProfile {
  id: string
  user_id: string
  persona_name: string
  persona_description?: string
  preferred_role?: 'good' | 'evil'
  game_stats: {
    wins: number
    losses: number
    games_played: number
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface GameRoom {
  id: string
  room_code: string
  room_name: string
  host_id: string
  max_players: number
  current_players: number
  status: 'waiting' | 'playing' | 'finished'
  game_settings: {
    roles: any
    assignments?: any[]
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface RoomPlayer {
  id: string
  room_id: string
  user_id: string
  player_profile_id: string
  joined_at: string
}

export interface GameSession {
  id: string
  room_id: string
  game_state: 'setup' | 'playing' | 'voting' | 'mission' | 'finished'
  current_round: number
  current_leader_id?: string
  mission_history: any[]
  chat_messages: any[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  user_id: string
  message: string
  message_type: 'general' | 'team' | 'system' | 'whisper'
  target_user_id?: string
  is_deleted?: boolean
  created_at: string
  users?: {
    display_name: string
    avatar_url?: string
  }
}
