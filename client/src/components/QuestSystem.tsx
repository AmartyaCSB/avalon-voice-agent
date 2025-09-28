import React, { useState, useEffect } from 'react'
import { useLobby } from '../contexts/LobbyContext'
import { useAuth } from '../contexts/AuthContext'

interface Quest {
  questNumber: number
  playersRequired: number
  failsRequired: number
  status: 'pending' | 'voting' | 'mission' | 'completed'
  result?: 'success' | 'fail'
  teamProposed?: string[]
  votes?: { [playerId: string]: 'approve' | 'reject' }
  missionVotes?: { [playerId: string]: 'success' | 'fail' }
}

interface QuestSystemProps {
  roomCode: string
  players: any[]
  currentLeader: string
}

const QuestSystem: React.FC<QuestSystemProps> = ({ roomCode, players, currentLeader }) => {
  const { user } = useAuth()
  const { sendMessage, currentRoom } = useLobby()
  const [quests, setQuests] = useState<Quest[]>([])
  const [currentQuest, setCurrentQuest] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<string[]>([])
  const [gamePhase, setGamePhase] = useState<'team_selection' | 'team_voting' | 'mission' | 'completed'>('team_selection')
  const [voteCount, setVoteCount] = useState(0)
  const [maxVotes] = useState(5) // Max 5 team proposal attempts

  // Initialize quests based on player count
  useEffect(() => {
    const playerCount = players.length
    const questRequirements = getQuestRequirements(playerCount)
    
    const initialQuests: Quest[] = questRequirements.map((req, index) => ({
      questNumber: index + 1,
      playersRequired: req.players,
      failsRequired: req.fails,
      status: 'pending'
    }))
    
    setQuests(initialQuests)
  }, [players.length])

  const getQuestRequirements = (playerCount: number) => {
    const requirements: { [key: number]: { players: number, fails: number }[] } = {
      5: [
        { players: 2, fails: 1 },
        { players: 3, fails: 1 },
        { players: 2, fails: 1 },
        { players: 3, fails: 1 },
        { players: 3, fails: 1 }
      ],
      6: [
        { players: 2, fails: 1 },
        { players: 3, fails: 1 },
        { players: 4, fails: 1 },
        { players: 3, fails: 1 },
        { players: 4, fails: 1 }
      ],
      7: [
        { players: 2, fails: 1 },
        { players: 3, fails: 1 },
        { players: 3, fails: 1 },
        { players: 4, fails: 2 },
        { players: 4, fails: 1 }
      ],
      8: [
        { players: 3, fails: 1 },
        { players: 4, fails: 1 },
        { players: 4, fails: 1 },
        { players: 5, fails: 2 },
        { players: 5, fails: 1 }
      ],
      9: [
        { players: 3, fails: 1 },
        { players: 4, fails: 1 },
        { players: 4, fails: 1 },
        { players: 5, fails: 2 },
        { players: 5, fails: 1 }
      ],
      10: [
        { players: 3, fails: 1 },
        { players: 4, fails: 1 },
        { players: 4, fails: 1 },
        { players: 5, fails: 2 },
        { players: 5, fails: 1 }
      ]
    }
    return requirements[playerCount] || requirements[5]
  }

  const handlePlayerSelect = (playerId: string) => {
    if (user?.id !== currentLeader) return
    
    const currentQuest = quests[currentQuest]
    if (!currentQuest) return

    setSelectedTeam(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      } else if (prev.length < currentQuest.playersRequired) {
        return [...prev, playerId]
      }
      return prev
    })
  }

  const proposeTeam = async () => {
    if (user?.id !== currentLeader) return
    if (selectedTeam.length !== quests[currentQuest]?.playersRequired) return

    setGamePhase('team_voting')
    await sendMessage(
      `🗳️ ${user.user_metadata?.full_name} proposes a team for Quest ${currentQuest + 1}: ${
        selectedTeam.map(id => players.find(p => p.user_id === id)?.player_profiles?.persona_name || 'Unknown').join(', ')
      }. All players must vote!`,
      'system'
    )
  }

  const voteOnTeam = async (vote: 'approve' | 'reject') => {
    if (!user) return
    
    // In a real implementation, this would be stored in the database
    await sendMessage(
      `🗳️ ${user.user_metadata?.full_name} has voted on the team proposal.`,
      'system'
    )
  }

  const isLeader = user?.id === currentLeader
  const currentQuestData = quests[currentQuest]
  const successfulQuests = quests.filter(q => q.result === 'success').length
  const failedQuests = quests.filter(q => q.result === 'fail').length

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold text-white mb-6">Quest Progress</h2>
      
      {/* Quest Status */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {quests.map((quest, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-center ${
              quest.result === 'success' ? 'bg-green-600' :
              quest.result === 'fail' ? 'bg-red-600' :
              index === currentQuest ? 'bg-blue-600' :
              'bg-gray-600'
            }`}
          >
            <div className="text-white font-semibold">Quest {quest.questNumber}</div>
            <div className="text-white text-sm">{quest.playersRequired} players</div>
            <div className="text-white text-xs">
              {quest.failsRequired} fail{quest.failsRequired > 1 ? 's' : ''} needed
            </div>
          </div>
        ))}
      </div>

      {/* Game Status */}
      <div className="bg-white/5 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center text-white">
          <div>
            <span className="text-green-400">Good: {successfulQuests}</span>
            <span className="mx-4">|</span>
            <span className="text-red-400">Evil: {failedQuests}</span>
          </div>
          <div className="text-blue-200">
            Current Leader: {players.find(p => p.user_id === currentLeader)?.player_profiles?.persona_name || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Current Quest Interface */}
      {currentQuestData && (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-xl text-white mb-4">
            Quest {currentQuestData.questNumber} - {currentQuestData.playersRequired} Players Required
          </h3>

          {gamePhase === 'team_selection' && (
            <div>
              {isLeader ? (
                <div>
                  <p className="text-blue-200 mb-4">
                    You are the leader! Select {currentQuestData.playersRequired} players for this quest:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {players.map((player) => (
                      <button
                        key={player.user_id}
                        onClick={() => handlePlayerSelect(player.user_id)}
                        className={`p-2 rounded text-left transition-colors ${
                          selectedTeam.includes(player.user_id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {player.player_profiles?.persona_name || 'Unknown'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={proposeTeam}
                    disabled={selectedTeam.length !== currentQuestData.playersRequired}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    Propose Team ({selectedTeam.length}/{currentQuestData.playersRequired})
                  </button>
                </div>
              ) : (
                <p className="text-blue-200">
                  Waiting for {players.find(p => p.user_id === currentLeader)?.player_profiles?.persona_name} to select the team...
                </p>
              )}
            </div>
          )}

          {gamePhase === 'team_voting' && (
            <div>
              <p className="text-blue-200 mb-4">
                Vote on the proposed team. All players must vote!
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => voteOnTeam('approve')}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✓ Approve Team
                </button>
                <button
                  onClick={() => voteOnTeam('reject')}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  ✗ Reject Team
                </button>
              </div>
              <div className="mt-2 text-center text-blue-200 text-sm">
                Vote attempts: {voteCount + 1}/{maxVotes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules Reminder */}
      <div className="mt-6 bg-white/5 rounded-lg p-4">
        <h4 className="text-lg text-white mb-2">Quest Rules</h4>
        <div className="text-blue-200 text-sm space-y-1">
          <p>• Good team wins by completing 3 quests successfully</p>
          <p>• Evil team wins by failing 3 quests OR by identifying Merlin</p>
          <p>• On quests, Good players must play Success, Evil players may play Success or Fail</p>
          <p>• If team votes fail 5 times in a row, Evil wins</p>
        </div>
      </div>
    </div>
  )
}

export default QuestSystem
