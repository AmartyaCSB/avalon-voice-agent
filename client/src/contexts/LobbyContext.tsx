import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, GameRoom, RoomPlayer, PlayerProfile, User } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface ChatMessage {
  id: string
  room_id: string
  user_id: string
  message: string
  message_type: 'general' | 'team' | 'system' | 'whisper'
  target_user_id?: string
  is_deleted: boolean
  created_at: string
  users?: {
    display_name: string
    avatar_url?: string
  }
}

interface LobbyContextType {
  rooms: GameRoom[]
  currentRoom: GameRoom | null
  roomPlayers: RoomPlayer[]
  playerProfiles: PlayerProfile[]
  chatMessages: ChatMessage[]
  loading: boolean
  createRoom: (roomName: string, maxPlayers: number) => Promise<GameRoom | null>
  joinRoom: (roomCode: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  createPlayerProfile: (personaName: string, personaDescription: string, preferredRole?: 'good' | 'evil') => Promise<PlayerProfile | null>
  updatePlayerProfile: (profileId: string, updates: Partial<PlayerProfile>) => Promise<void>
  refreshRooms: () => Promise<void>
  sendMessage: (message: string, messageType?: 'general' | 'team' | 'system' | 'whisper', targetUserId?: string) => Promise<void>
  loadChatMessages: (roomId: string) => Promise<void>
}

const LobbyContext = createContext<LobbyContextType | undefined>(undefined)

export const useLobby = () => {
  const context = useContext(LobbyContext)
  if (context === undefined) {
    throw new Error('useLobby must be used within a LobbyProvider')
  }
  return context
}

export const LobbyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([])
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  // Generate room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Create a new game room
  const createRoom = async (roomName: string, maxPlayers: number): Promise<GameRoom | null> => {
    if (!user) return null

    try {
      setLoading(true)
      const roomCode = generateRoomCode()
      
      const { data: room, error } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          room_name: roomName,
          host_id: user.id,
          max_players: maxPlayers,
          current_players: 1
        })
        .select()
        .single()

      if (error) throw error

      // Join the room as the host
      await joinRoom(roomCode)
      
      return room
    } catch (error) {
      console.error('Error creating room:', error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Join a room by room code
  const joinRoom = async (roomCode: string): Promise<boolean> => {
    if (!user) return false

    try {
      setLoading(true)
      
      // Get the room
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single()

      if (roomError || !room) {
        console.error('Room not found:', roomError)
        return false
      }

      // Check if room is full
      if (room.current_players >= room.max_players) {
        console.error('Room is full')
        return false
      }

      // Check if user is already in the room
      const { data: existingPlayer } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single()

      if (existingPlayer) {
        setCurrentRoom(room)
        await loadRoomPlayers(room.id)
        return true
      }

      // Get user's player profiles
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)

      if (!profiles || profiles.length === 0) {
        console.error('No player profile found. Please create one first.')
        return false
      }

      // Join the room
      const { error: joinError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: user.id,
          player_profile_id: profiles[0].id
        })

      if (joinError) throw joinError

      setCurrentRoom(room)
      await loadRoomPlayers(room.id)
      return true
    } catch (error) {
      console.error('Error joining room:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Leave current room
  const leaveRoom = async () => {
    if (!user || !currentRoom) return

    try {
      const { error } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id)

      if (error) throw error

      setCurrentRoom(null)
      setRoomPlayers([])
    } catch (error) {
      console.error('Error leaving room:', error)
    }
  }

  // Create a player profile
  const createPlayerProfile = async (
    personaName: string, 
    personaDescription: string, 
    preferredRole?: 'good' | 'evil'
  ): Promise<PlayerProfile | null> => {
    if (!user) return null

    try {
      const { data: profile, error } = await supabase
        .from('player_profiles')
        .insert({
          user_id: user.id,
          persona_name: personaName,
          persona_description: personaDescription,
          preferred_role: preferredRole,
          game_stats: {
            wins: 0,
            losses: 0,
            games_played: 0
          }
        })
        .select()
        .single()

      if (error) throw error

      setPlayerProfiles(prev => [...prev, profile])
      return profile
    } catch (error) {
      console.error('Error creating player profile:', error)
      return null
    }
  }

  // Update player profile
  const updatePlayerProfile = async (profileId: string, updates: Partial<PlayerProfile>) => {
    try {
      const { error } = await supabase
        .from('player_profiles')
        .update(updates)
        .eq('id', profileId)

      if (error) throw error

      // Update local state
      setPlayerProfiles(prev => 
        prev.map(profile => 
          profile.id === profileId ? { ...profile, ...updates } : profile
        )
      )
    } catch (error) {
      console.error('Error updating player profile:', error)
    }
  }

  // Load room players
  const loadRoomPlayers = async (roomId: string) => {
    try {
      const { data: players, error } = await supabase
        .from('room_players')
        .select(`
          *,
          player_profiles (
            id,
            persona_name,
            persona_description,
            preferred_role
          )
        `)
        .eq('room_id', roomId)

      if (error) throw error
      setRoomPlayers(players || [])
    } catch (error) {
      console.error('Error loading room players:', error)
    }
  }

  // Refresh available rooms
  const refreshRooms = async () => {
    try {
      setLoading(true)
      const { data: rooms, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setRooms(rooms || [])
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load user's player profiles
  const loadPlayerProfiles = async () => {
    if (!user) return

    try {
      const { data: profiles, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setPlayerProfiles(profiles || [])
    } catch (error) {
      console.error('Error loading player profiles:', error)
    }
  }

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadPlayerProfiles()
      refreshRooms()
    }
  }, [user])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentRoom) return

    // Subscribe to room changes
    const roomSubscription = supabase
      .channel('room-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${currentRoom.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCurrentRoom(payload.new as GameRoom)
          }
        }
      )
      .subscribe()

    // Subscribe to room players changes
    const playersSubscription = supabase
      .channel('room-players-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${currentRoom.id}` },
        () => {
          loadRoomPlayers(currentRoom.id)
        }
      )
      .subscribe()

    return () => {
      roomSubscription.unsubscribe()
      playersSubscription.unsubscribe()
    }
  }, [currentRoom])

  // Send a chat message
  const sendMessage = async (
    message: string, 
    messageType: 'general' | 'team' | 'system' | 'whisper' = 'general',
    targetUserId?: string
  ) => {
    if (!user || !currentRoom || !message.trim()) return

    try {
      const { data: newMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: currentRoom.id,
          user_id: user.id,
          message: message.trim(),
          message_type: messageType,
          target_user_id: targetUserId
        })
        .select(`
          *,
          users (
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      setChatMessages(prev => [...prev, newMessage])
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Load chat messages for a room
  const loadChatMessages = async (roomId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          users (
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setChatMessages(messages || [])
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }

  // Set up real-time subscriptions for current room
  useEffect(() => {
    if (!currentRoom) return

    // Subscribe to chat messages
    const chatSubscription = supabase
      .channel(`room-${currentRoom.id}-chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${currentRoom.id}`
        },
        async (payload) => {
          // Fetch the complete message with user data
          const { data: messageWithUser } = await supabase
            .from('chat_messages')
            .select(`
              *,
              users (
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (messageWithUser) {
            setChatMessages(prev => [...prev, messageWithUser])
          }
        }
      )
      .subscribe()

    // Subscribe to room players changes
    const playersSubscription = supabase
      .channel(`room-${currentRoom.id}-players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${currentRoom.id}`
        },
        () => {
          loadRoomPlayers(currentRoom.id)
        }
      )
      .subscribe()

    return () => {
      chatSubscription.unsubscribe()
      playersSubscription.unsubscribe()
    }
  }, [currentRoom])

  // Load user's player profiles on mount
  useEffect(() => {
    if (user) {
      loadPlayerProfiles()
    }
  }, [user])

  const value = {
    rooms,
    currentRoom,
    roomPlayers,
    playerProfiles,
    chatMessages,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    createPlayerProfile,
    updatePlayerProfile,
    refreshRooms,
    sendMessage,
    loadChatMessages
  }

  return (
    <LobbyContext.Provider value={value}>
      {children}
    </LobbyContext.Provider>
  )
}
