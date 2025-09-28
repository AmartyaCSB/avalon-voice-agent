import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLobby } from '../contexts/LobbyContext'
import { GameRoom } from '../lib/supabase'
import QuestSystem from './QuestSystem'
import CircularGameRoom from './CircularGameRoom'

const Lobby: React.FC = () => {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { 
    rooms, 
    currentRoom, 
    roomPlayers, 
    chatMessages,
    loading, 
    createRoom, 
    joinRoom, 
    leaveRoom, 
    refreshRooms,
    sendMessage,
    loadChatMessages,
    startGame,
    kickPlayer
  } = useLobby()
  
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [joinCode, setJoinCode] = useState('')
  const [showJoinRoom, setShowJoinRoom] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const [gameAssignments, setGameAssignments] = useState<any[]>([])

  // Extract assignments from URL when coming from voice agent
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const assignmentsParam = urlParams.get('assignments')
    if (assignmentsParam) {
      try {
        const assignments = JSON.parse(decodeURIComponent(assignmentsParam))
        setGameAssignments(assignments)
      } catch (error) {
        console.error('Error parsing assignments:', error)
      }
    }
  }, [])

  // Refresh rooms periodically
  useEffect(() => {
    const interval = setInterval(refreshRooms, 5000)
    return () => clearInterval(interval)
  }, [refreshRooms])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) return

    const room = await createRoom(roomName, maxPlayers)
    if (room) {
      setShowCreateRoom(false)
      setRoomName('')
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    const success = await joinRoom(joinCode.toUpperCase())
    if (success) {
      setShowJoinRoom(false)
      setJoinCode('')
    }
  }

  const handleLeaveRoom = async () => {
    await leaveRoom()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    try {
      console.log('Sending message:', chatMessage)
      await sendMessage(chatMessage.trim(), 'general')
      setChatMessage('')
      
      // Auto-scroll to bottom after sending
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
        }
      }, 100)
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  // Handle room URL parameter
  useEffect(() => {
    if (roomCode && !currentRoom) {
      joinRoom(roomCode)
    }
  }, [roomCode])

  // Load chat messages when entering a room
  useEffect(() => {
    if (currentRoom) {
      loadChatMessages(currentRoom.id)
      // Update URL to reflect current room
      if (currentRoom.room_code !== roomCode) {
        navigate(`/room/${currentRoom.room_code}`, { replace: true })
      }
    }
  }, [currentRoom, loadChatMessages])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Avalon Voice Agent</h1>
            <p className="text-blue-200 mb-8">Join the resistance or embrace the darkness</p>
            
            <button
              onClick={signInWithGoogle}
              className="w-full bg-white text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show circular room layout when in a room
  if (currentRoom) {
    console.log('Current room detected:', currentRoom.room_code, 'Status:', currentRoom.status)
    console.log('Players:', roomPlayers.length)
    
    if (currentRoom.status === 'playing') {
      return (
        <QuestSystem 
          roomCode={currentRoom.room_code}
          players={roomPlayers}
          currentLeader={roomPlayers[0]?.user_id || ''}
          assignments={gameAssignments}
        />
      )
    }
    
    console.log('Rendering CircularGameRoom for room:', currentRoom.room_code)
    return (
      <CircularGameRoom
        roomCode={currentRoom.room_code}
        players={roomPlayers}
        isHost={currentRoom.host_id === user.id}
      />
    )
  }

  // Show main lobby if not in a room
  console.log('No current room, showing main lobby')
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl">
                ⚔️
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">Avalon Lobby</h1>
                <p className="text-blue-200 flex items-center gap-2">
                  <span>🛡️ Welcome back, <span className="text-yellow-300 font-semibold">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span></span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/profiles"
                className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 font-semibold hover:scale-105"
              >
                👤 Manage Profiles
              </Link>
              <button
                onClick={signOut}
                className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-200 flex items-center gap-2 font-semibold hover:scale-105"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
                    <div key={player.id} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {player.player_profiles?.persona_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm">
                            {player.player_profiles?.persona_name || 'Unknown Player'}
                          </p>
                          {currentRoom.host_id === player.user_id && (
                            <span className="bg-yellow-600 text-yellow-100 text-xs px-1 py-0.5 rounded">
                              HOST
                            </span>
                          )}
                        </div>
                        <p className="text-blue-200 text-xs">
                          {player.player_profiles?.preferred_role || 'No preference'}
                        </p>
                      </div>
                      {/* Kick button for host (can't kick themselves) */}
                      {currentRoom.host_id === user.id && player.user_id !== user.id && (
                        <button
                          onClick={() => kickPlayer(player.user_id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                          title="Remove player"
                        >
                          👢
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Chat Area */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 h-fit">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  💬 Room Chat
                  {chatMessages.length > 0 && (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      {chatMessages.length}
                    </span>
                  )}
                </h2>
                
                {/* Enhanced Chat Messages */}
                <div 
                  ref={chatMessagesRef}
                  className="bg-white/5 rounded-lg p-4 h-80 overflow-y-auto mb-4 space-y-3"
                >
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-blue-200 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className="group">
                        <div className={`p-3 rounded-lg ${
                          message.user_id === user.id 
                            ? 'bg-blue-600/30 ml-4' 
                            : 'bg-white/10 mr-4'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {(message.users?.display_name || 'U')?.charAt(0)}
                            </div>
                            <span className="text-blue-300 font-medium text-sm">
                              {message.user_id === user.id ? 'You' : message.users?.display_name || 'Unknown'}
                            </span>
                            <span className="text-blue-200 text-xs opacity-70">
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-white text-sm leading-relaxed">{message.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Enhanced Chat Input */}
                <div className="space-y-2">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                    <button
                      type="submit"
                      disabled={!chatMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Send
                    </button>
                  </form>
                  <p className="text-blue-200 text-xs">Press Enter to send</p>
                </div>
              </div>
            </div>

            {/* Room Info & Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Room Info Panel */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Room Info</h2>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">{currentRoom.room_code}</span>
                        <button
                          onClick={() => navigator.clipboard?.writeText(currentRoom.room_code)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          title="Copy room code"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Share URL:</span>
                      <button
                        onClick={() => {
                          const roomUrl = `${window.location.origin}/room/${currentRoom.room_code}`
                          navigator.clipboard?.writeText(roomUrl)
                          alert('Room URL copied to clipboard!')
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                        title="Copy shareable room URL"
                      >
                        🔗 Copy Link
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Max Players:</span>
                    <span className="text-white">{currentRoom.max_players}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      currentRoom.status === 'waiting' ? 'bg-yellow-600 text-yellow-100' :
                      currentRoom.status === 'playing' ? 'bg-green-600 text-green-100' :
                      'bg-gray-600 text-gray-100'
                    }`}>
                      {currentRoom.status === 'waiting' ? 'Waiting' : 
                       currentRoom.status === 'playing' ? 'Playing' : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Created:</span>
                    <span className="text-white text-sm">
                      {new Date(currentRoom.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {currentRoom.host_id === user.id && (
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    👑 Host Controls
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={startGame}
                      disabled={roomPlayers.length < 5 || loading}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>⏳ Starting...</>
                      ) : roomPlayers.length < 5 ? (
                        <>⚠️ Need {5 - roomPlayers.length} more players</>
                      ) : (
                        <>🚀 Start Game ({roomPlayers.length} players)</>
                      )}
                    </button>
                    <div className="text-blue-200 text-xs text-center">
                      Starts game with voice narration for role assignments
                    </div>
                  </div>
                  <Link
                    to="/voice-agent"
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors block text-center"
                  >
                    🎤 Practice Voice Narration
                  </Link>
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Game Rules</h3>
                <div className="text-blue-200 text-sm space-y-2">
                  <p>• 5-10 players required</p>
                  <p>• Good vs Evil teams</p>
                  <p>• Complete 3 quests to win</p>
                  <p>• Use voice narration for role reveals</p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl">
                ⚔️
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">Avalon Lobby</h1>
                <p className="text-blue-200 flex items-center gap-2">
                  <span>🛡️ Welcome back, <span className="text-yellow-300 font-semibold">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span></span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/profiles"
                className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 font-semibold hover:scale-105"
              >
                👤 Manage Profiles
              </Link>
              <button
                onClick={signOut}
                className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-all duration-200 flex items-center gap-2 font-semibold hover:scale-105"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowCreateRoom(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 shadow-lg"
          >
            <span className="text-2xl">🏠</span>
            <span>Create Room</span>
          </button>
          <button
            onClick={() => setShowJoinRoom(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 shadow-lg"
          >
            <span className="text-2xl">🚪</span>
            <span>Join Room</span>
          </button>
          <button
            onClick={refreshRooms}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 shadow-lg"
          >
            <span className="text-2xl">🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Available Rooms */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Available Rooms</h2>
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-blue-200 text-lg mb-4">No active rooms found</p>
              <p className="text-blue-300">Create the first room to start playing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white/5 backdrop-blur rounded-xl p-6 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-white">{room.room_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      room.status === 'waiting' ? 'bg-green-600 text-white' :
                      room.status === 'playing' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {room.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-blue-200 text-sm">
                      <span className="font-medium">Players:</span> {room.current_players}/{room.max_players}
                    </p>
                    <p className="text-blue-200 text-sm">
                      <span className="font-medium">Code:</span> 
                      <span className="font-mono text-yellow-300 ml-1">{room.room_code}</span>
                    </p>
                    <p className="text-blue-200 text-sm">
                      <span className="font-medium">Created:</span> {new Date(room.created_at).toLocaleDateString()}
                    </p>
                  </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          joinRoom(room.room_code)
                          navigate(`/room/${room.room_code}`)
                        }}
                        disabled={room.current_players >= room.max_players || room.status !== 'waiting'}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {room.current_players >= room.max_players ? 'Room Full' : 
                         room.status !== 'waiting' ? 'Game In Progress' : 'Join Room'}
                      </button>
                      <button
                        onClick={() => {
                          const roomUrl = `${window.location.origin}/room/${room.room_code}`
                          navigator.clipboard?.writeText(roomUrl)
                          alert('Room URL copied to clipboard!')
                        }}
                        className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        title="Copy room URL"
                      >
                        🔗
                      </button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Room</h2>
              <form onSubmit={handleCreateRoom}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter room name"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Max Players</label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 Players</option>
                    <option value={6}>6 Players</option>
                    <option value={7}>7 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={9}>9 Players</option>
                    <option value={10}>10 Players</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinRoom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Room</h2>
              <form onSubmit={handleJoinRoom}>
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Room Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Enter room code"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Joining...' : 'Join Room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinRoom(false)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Available Rooms */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Available Rooms</h2>
          {loading ? (
            <div className="text-center text-blue-200">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center text-blue-200">No rooms available. Create one to get started!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                  <h3 className="text-lg font-semibold text-white mb-2">{room.room_name}</h3>
                  <p className="text-blue-200 text-sm mb-2">
                    Players: {room.current_players}/{room.max_players}
                  </p>
                  <p className="text-gray-400 text-sm mb-3">
                    Code: <span className="font-mono text-yellow-300">{room.room_code}</span>
                  </p>
                  <button
                    onClick={() => joinRoom(room.room_code)}
                    disabled={room.current_players >= room.max_players}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {room.current_players >= room.max_players ? 'Room Full' : 'Join Room'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Lobby
