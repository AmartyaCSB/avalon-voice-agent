import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLobby } from '../contexts/LobbyContext'

interface CircularGameRoomProps {
  roomCode: string
  players: any[]
  isHost: boolean
}

const CircularGameRoom: React.FC<CircularGameRoomProps> = ({ roomCode, players, isHost }) => {
  const { user } = useAuth()
  const { currentRoom, sendMessage, chatMessages, startGame } = useLobby()
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)

  // Calculate player positions around the circle
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90 // Start from top
    const radius = 200 // Distance from center
    const centerX = 300 // Center X
    const centerY = 300 // Center Y
    
    const x = centerX + radius * Math.cos((angle * Math.PI) / 180)
    const y = centerY + radius * Math.sin((angle * Math.PI) / 180)
    
    return { x, y, angle }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    
    try {
      console.log('Sending message:', chatInput.trim())
      await sendMessage(chatInput.trim(), 'general')
      setChatInput('')
      console.log('Message sent successfully')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const handleStartGame = async () => {
    try {
      console.log('Starting game for room:', roomCode)
      const success = await startGame()
      
      if (success) {
        console.log('Game started successfully')
        // The lobby context will handle the room status change
        // and the parent component will render QuestSystem
      } else {
        alert('Failed to start game. Please try again.')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Failed to start game. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 relative overflow-hidden">
      {/* Medieval background texture */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Room Header */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-amber-700 rounded-full flex items-center justify-center text-2xl">
                🏰
              </div>
              <div>
                <h1 className="text-2xl font-bold">Room: {roomCode}</h1>
                <p className="text-amber-200">The Round Table of Camelot</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const roomUrl = `${window.location.origin}/room/${roomCode}`
                  navigator.clipboard?.writeText(roomUrl)
                  alert('Room URL copied!')
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                🔗 Copy URL
              </button>
              <button
                onClick={() => setShowChat(!showChat)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
              >
                💬 Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-20">
        <div className="relative">
          {/* Round Table */}
          <div className="w-96 h-96 rounded-full bg-gradient-to-br from-amber-800 to-amber-900 border-8 border-yellow-600 shadow-2xl relative">
            {/* Table surface with wood grain effect */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-2">⚔️</div>
                <h2 className="text-xl font-bold mb-1">The Round Table</h2>
                <p className="text-amber-200 text-sm">
                  {players.length}/10 Knights
                </p>
                {isHost && players.length >= 5 && (
                  <button
                    onClick={handleStartGame}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                  >
                    🎮 Begin Quest
                  </button>
                )}
                {players.length < 5 && (
                  <p className="mt-4 text-amber-300 text-sm">
                    Need {5 - players.length} more knights
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Player Seats */}
          {players.map((player, index) => {
            const position = getPlayerPosition(index, Math.max(players.length, 5))
            const isCurrentUser = player.user_id === user?.id
            
            return (
              <div
                key={player.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                {/* Player Seat */}
                <div className={`w-20 h-20 rounded-full border-4 ${
                  isCurrentUser 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-400' 
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500'
                } flex items-center justify-center shadow-lg`}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                    {player.player_profiles?.persona_name?.charAt(0) || '?'}
                  </div>
                </div>
                
                {/* Player Name */}
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center">
                  <div className={`bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm font-medium ${
                    isCurrentUser ? 'bg-blue-900/70' : ''
                  }`}>
                    {player.player_profiles?.persona_name || 'Unknown Knight'}
                    {isCurrentUser && <div className="text-xs text-blue-300">You</div>}
                    {currentRoom?.host_id === player.user_id && (
                      <div className="text-xs text-yellow-300">👑 Host</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty Seats */}
          {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, index) => {
            const seatIndex = players.length + index
            const position = getPlayerPosition(seatIndex, Math.max(players.length + index + 1, 5))
            
            return (
              <div
                key={`empty-${index}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-500 bg-gray-800/50 flex items-center justify-center">
                  <div className="text-gray-400 text-2xl">👤</div>
                </div>
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 text-gray-400 text-sm">
                    Empty Seat
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed right-4 top-24 bottom-4 w-80 bg-black/80 backdrop-blur-lg rounded-xl border border-white/20 z-30 flex flex-col">
          <div className="p-4 border-b border-white/20 flex justify-between items-center">
            <h3 className="text-white font-bold">Round Table Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-white hover:text-red-400 text-xl"
            >
              ✕
            </button>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div key={message.id} className={`p-3 rounded-lg ${
                  message.user_id === user?.id ? 'bg-blue-600/30 ml-4' : 'bg-white/10 mr-4'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(message.users?.display_name || 'U')?.charAt(0)}
                    </div>
                    <span className="text-blue-300 font-medium text-sm">
                      {message.user_id === user?.id ? 'You' : message.users?.display_name || 'Unknown'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white text-sm">{message.message}</p>
                </div>
              ))
            )}
          </div>
          
          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Speak to the Round Table..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default CircularGameRoom
