import React, { useState, useEffect } from 'react'
import { useLobby } from '../contexts/LobbyContext'
import { useAuth } from '../contexts/AuthContext'
import RolePanel from './RolePanel'

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
  assignments?: any[]
}

const QuestSystem: React.FC<QuestSystemProps> = ({ roomCode, players, currentLeader, assignments }) => {
  const { user } = useAuth()
  const { sendMessage, currentRoom } = useLobby()
  const [quests, setQuests] = useState<Quest[]>([])
  const [currentQuest, setCurrentQuest] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<string[]>([])
  const [gamePhase, setGamePhase] = useState<'team_selection' | 'team_voting' | 'mission' | 'completed'>('team_selection')
  const [voteCount, setVoteCount] = useState(0)
  const [maxVotes] = useState(5) // Max 5 team proposal attempts
  const [teamVotes, setTeamVotes] = useState<{ [playerId: string]: 'approve' | 'reject' }>({})
  const [missionVotes, setMissionVotes] = useState<{ [playerId: string]: 'success' | 'fail' }>({})
  const [userRole, setUserRole] = useState<string>('')
  const [userTeam, setUserTeam] = useState<'Good' | 'Evil'>('Good')

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

  // Detect user's role and team
  useEffect(() => {
    if (assignments && user) {
      const userIndex = players.findIndex(p => p.user_id === user.id)
      if (userIndex !== -1 && assignments[userIndex]) {
        setUserRole(assignments[userIndex].role)
        setUserTeam(assignments[userIndex].team)
      }
    }
  }, [assignments, user, players])

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
    
    setTeamVotes(prev => ({ ...prev, [user.id]: vote }))
    
    await sendMessage(
      `🗳️ ${user.user_metadata?.full_name} has voted on the team proposal.`,
      'system'
    )

    // Check if all players have voted
    const totalVotes = Object.keys(teamVotes).length + 1
    if (totalVotes >= players.length) {
      processTeamVotes()
    }
  }

  const processTeamVotes = () => {
    const approvals = Object.values(teamVotes).filter(vote => vote === 'approve').length
    const required = Math.ceil(players.length / 2)
    
    if (approvals >= required) {
      setGamePhase('mission')
      sendMessage(`✅ Team approved! Quest ${currentQuest + 1} begins now.`, 'system')
    } else {
      setVoteCount(prev => prev + 1)
      if (voteCount + 1 >= maxVotes) {
        sendMessage(`❌ 5 teams rejected! Evil wins!`, 'system')
        setGamePhase('completed')
      } else {
        setGamePhase('team_selection')
        setSelectedTeam([])
        setTeamVotes({})
        sendMessage(`❌ Team rejected. Leader selects a new team. (Attempt ${voteCount + 2}/${maxVotes})`, 'system')
      }
    }
  }

  const voteOnMission = async (vote: 'success' | 'fail') => {
    if (!user) return
    if (!selectedTeam.includes(user.id)) return
    
    setMissionVotes(prev => ({ ...prev, [user.id]: vote }))
    
    await sendMessage(
      `⚔️ ${user.user_metadata?.full_name} has voted on the mission.`,
      'system'
    )

    // Check if all mission participants have voted
    const missionVotesCount = Object.keys(missionVotes).length + 1
    if (missionVotesCount >= selectedTeam.length) {
      processMissionVotes()
    }
  }

  const processMissionVotes = () => {
    const failVotes = Object.values(missionVotes).filter(vote => vote === 'fail').length
    const currentQuestData = quests[currentQuest]
    const questFailed = failVotes >= currentQuestData.failsRequired

    // Update quest result
    setQuests(prev => prev.map((quest, index) => 
      index === currentQuest 
        ? { ...quest, status: 'completed', result: questFailed ? 'fail' : 'success' }
        : quest
    ))

    sendMessage(
      questFailed 
        ? `❌ Quest ${currentQuest + 1} failed! (${failVotes} fail votes)`
        : `✅ Quest ${currentQuest + 1} succeeded!`,
      'system'
    )

    // Check win conditions
    const completedQuests = quests.filter(q => q.result === 'success').length + (questFailed ? 0 : 1)
    const failedQuests = quests.filter(q => q.result === 'fail').length + (questFailed ? 1 : 0)

    if (completedQuests >= 3) {
      sendMessage(`🎉 Good team wins! 3 quests completed successfully!`, 'system')
      setGamePhase('completed')
    } else if (failedQuests >= 3) {
      sendMessage(`💀 Evil team wins! 3 quests failed!`, 'system')
      setGamePhase('completed')
    } else {
      // Move to next quest
      setCurrentQuest(prev => prev + 1)
      setGamePhase('team_selection')
      setSelectedTeam([])
      setTeamVotes({})
      setMissionVotes({})
      setVoteCount(0)
    }
  }

  const isLeader = user?.id === currentLeader
  const currentQuestData = quests[currentQuest]
  const successfulQuests = quests.filter(q => q.result === 'success').length
  const failedQuests = quests.filter(q => q.result === 'fail').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Role Panel */}
      <div className="lg:col-span-1">
        <RolePanel 
          playerRole={userRole}
          playerTeam={userTeam}
          allPlayers={players}
          assignments={assignments}
        />
      </div>

      {/* Quest System */}
      <div className="lg:col-span-2">
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

          {gamePhase === 'mission' && (
            <div>
              {selectedTeam.includes(user?.id || '') ? (
                <div>
                  <p className="text-blue-200 mb-4">
                    You are on this mission! Choose your action:
                  </p>
                  <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-semibold mb-2">Mission Rules:</h4>
                    <div className="text-blue-200 text-sm space-y-1">
                      <p>• Good players must play Success</p>
                      <p>• Evil players may play Success or Fail</p>
                      <p>• {currentQuestData.failsRequired} Fail vote(s) needed to fail this quest</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => voteOnMission('success')}
                      disabled={user?.id in missionVotes}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      ✅ Success
                    </button>
                    {userTeam === 'Evil' && (
                      <button
                        onClick={() => voteOnMission('fail')}
                        disabled={user?.id in missionVotes}
                        className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        ❌ Fail
                      </button>
                    )}
                  </div>
                  {user?.id in missionVotes && (
                    <p className="text-center text-green-400 mt-2 text-sm">
                      ✓ Your vote has been recorded
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-blue-200 mb-4">
                    Mission in progress. Waiting for the quest team to vote...
                  </p>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Quest Team:</h4>
                    <div className="space-y-1">
                      {selectedTeam.map(playerId => {
                        const player = players.find(p => p.user_id === playerId)
                        const hasVoted = playerId in missionVotes
                        return (
                          <div key={playerId} className="flex justify-between items-center">
                            <span className="text-blue-200">
                              {player?.player_profiles?.persona_name || 'Unknown'}
                            </span>
                            <span className={`text-sm ${hasVoted ? 'text-green-400' : 'text-yellow-400'}`}>
                              {hasVoted ? '✓ Voted' : '⏳ Voting...'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {gamePhase === 'completed' && (
            <div className="text-center">
              <h3 className="text-2xl text-white mb-4">Game Over!</h3>
              <button
                onClick={() => window.location.reload()}
                className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start New Game
              </button>
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
    </div>
  )
}

export default QuestSystem
