import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLobby } from '../contexts/LobbyContext'
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
    kickPlayer,
    deleteRoom
  } = useLobby()
  
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState('')
  const [gameAssignments, setGameAssignments] = useState<any[]>([])

  // Handle room URL parameter
  useEffect(() => {
    console.log('URL roomCode param:', roomCode)
    console.log('Current room:', currentRoom?.room_code)
    
    if (roomCode && !currentRoom) {
      console.log('Joining room from URL:', roomCode)
      joinRoom(roomCode)
    }
  }, [roomCode])

  // Update URL when joining a room
  useEffect(() => {
    if (currentRoom && !roomCode) {
      console.log('Navigating to room URL:', currentRoom.room_code)
      navigate(`/room/${currentRoom.room_code}`)
    }
  }, [currentRoom])

  // Load chat messages when room changes
  useEffect(() => {
    if (currentRoom) {
      loadChatMessages(currentRoom.id)
    }
  }, [currentRoom])

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name')
      return
    }

    try {
      console.log('Creating room:', roomName, 'Max players:', maxPlayers)
      const room = await createRoom(roomName, maxPlayers)
      
      if (room) {
        console.log('Room created successfully:', room)
        setShowCreateRoom(false)
        setRoomName('')
        setMaxPlayers(10)
        // Navigate to the new room
        navigate(`/room/${room.room_code}`)
      } else {
        console.error('Failed to create room - returned null')
        alert('Failed to create room. Please try again.')
      }
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Error creating room. Please try again.')
    }
  }

  const handleJoinRoom = async () => {
    if (joinCode.trim()) {
      const success = await joinRoom(joinCode)
      if (success) {
        setJoinCode('')
        navigate(`/room/${joinCode}`)
      }
    }
  }

  const handleLeaveRoom = async () => {
    await leaveRoom()
    navigate('/lobby')
  }

  const handleSendMessage = async () => {
    if (message.trim() && currentRoom) {
      console.log('Sending message:', message)
      try {
        await sendMessage(message)
        setMessage('')
        alert('Message sent successfully!')
      } catch (error) {
        console.error('Failed to send message:', error)
        alert('Failed to send message. Please try again.')
      }
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            ⚔️
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Avalon - The Resistance</h1>
          <p className="text-blue-200 mb-8">Join the battle between Good and Evil</p>
          <button
            onClick={signInWithGoogle}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-3 mx-auto font-semibold hover:scale-105"
          >
            <span>🔐</span>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  // Show game interface when in a room and game is playing
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
    
    // Render the circular game room
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Room Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Room */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  🏰 Create Room
                </h2>
                {!showCreateRoom ? (
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    ➕ Create New Room
                  </button>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Room Name"
                      value={roomName}
                      onChange={(e) => {
                        console.log('Room name changed:', e.target.value)
                        setRoomName(e.target.value)
                      }}
                      disabled={loading}
                      className="w-full bg-white/10 text-white placeholder-blue-200 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <input
                      type="number"
                      placeholder="Max Players"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 10)}
                      min="5"
                      max="10"
                      className="w-full bg-white/10 text-white placeholder-blue-200 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateRoom}
                        disabled={!roomName.trim() || loading}
                        className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? '⏳ Creating...' : '✅ Create'}
                      </button>
                      <button
                        onClick={() => setShowCreateRoom(false)}
                        className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Join Room */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  🚪 Join Room
                </h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-white/10 text-white placeholder-blue-200 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={!joinCode.trim() || loading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {loading ? '⏳ Joining...' : '🎯 Join Room'}
                  </button>
                </div>
              </div>
            </div>

            {/* Available Rooms */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  🎮 Available Rooms
                </h2>
                <button
                  onClick={refreshRooms}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 transition-colors"
                >
                  {loading ? '⏳' : '🔄 Refresh'}
                </button>
              </div>

              {loading ? (
                <div className="text-center text-blue-200 py-8">
                  <div className="animate-spin text-4xl mb-4">⚔️</div>
                  Loading rooms...
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center text-blue-200 py-8">
                  <div className="text-4xl mb-4">🏰</div>
                  <p>No rooms available. Create one to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-white/5 backdrop-blur rounded-xl p-6 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-white">{room.room_name}</h3>
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          {room.room_code}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-blue-200 text-sm flex items-center gap-2">
                          👥 {room.current_players}/{room.max_players} players
                        </p>
                        <p className="text-blue-200 text-sm flex items-center gap-2">
                          👑 Host: {room.host?.display_name || 'Unknown'}
                        </p>
                        <p className="text-blue-200 text-sm flex items-center gap-2">
                          📅 {new Date(room.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            console.log('Joining room and navigating:', room.room_code)
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
                        {room.host?.id === user.id && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete the room "${room.room_name}"? This action cannot be undone.`)) {
                                const success = await deleteRoom(room.id)
                                if (success) {
                                  await refreshRooms()
                                }
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                            title="Delete room (Host only)"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Info & Links */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">🎯 Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/voice-agent"
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors block text-center"
                >
                  🎤 Practice Voice Narration
                </Link>
              </div>
            </div>

            {/* Game Rules */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">📜 Game Rules</h3>
              <div className="text-blue-200 text-sm space-y-2">
                <p>• 5-10 players required</p>
                <p>• Good vs Evil teams</p>
                <p>• Complete 3 quests to win</p>
                <p>• Use voice narration for role reveals</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Lobby