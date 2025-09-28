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
  const { sendMessage, currentRoom, saveGameState, loadGameState, saveRoleAssignments, loadRoleAssignments } = useLobby()
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
  const [leaderIndex, setLeaderIndex] = useState(0)

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

  // Load game state from database
  useEffect(() => {
    const loadExistingGameState = async () => {
      if (currentRoom) {
        const gameState = await loadGameState(currentRoom.id)
        if (gameState) {
          setCurrentQuest(gameState.current_quest || 0)
          setGamePhase(gameState.game_phase || 'team_selection')
          // Load other state as needed
        }

        // Save role assignments if provided
        if (assignments && assignments.length > 0) {
          await saveRoleAssignments(currentRoom.id, assignments)
        } else {
          // Load existing assignments
          const existingAssignments = await loadRoleAssignments(currentRoom.id)
          if (existingAssignments && existingAssignments.length > 0) {
            // Convert to the format expected by the component
            const assignmentMap = existingAssignments.reduce((acc: any, assignment: any) => {
              if (assignment.user_id) {
                acc[assignment.user_id] = {
                  role: assignment.role_name,
                  team: assignment.team
                }
              }
              return acc
            }, {} as any)
            
            // Update local assignments
            Object.assign(assignments || [], assignmentMap)
          }
        }
      }
    }

    loadExistingGameState()
  }, [currentRoom, assignments])

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

  // Save game state whenever it changes
  useEffect(() => {
    const saveCurrentGameState = async () => {
      if (currentRoom && quests.length > 0) {
        await saveGameState({
          current_quest: currentQuest,
          game_phase: gamePhase,
          good_wins: quests.filter(q => q.result === 'success').length,
          evil_wins: quests.filter(q => q.result === 'fail').length
        })
      }
    }

    saveCurrentGameState()
  }, [currentQuest, gamePhase, quests])

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
    if (!isLeader) return
    
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
    if (selectedTeam.length !== quests[currentQuest].playersRequired) return
    
    setGamePhase('team_voting')
    setTeamVotes({})
    await sendMessage(
      `🗳️ ${user.user_metadata?.full_name} proposes a team for Quest ${currentQuest + 1}: ${
        selectedTeam.map(id => players.find(p => p.user_id === id)?.player_profiles?.persona_name || 'Unknown').join(', ')
      }. All players must vote!`,
      'system'
    )
  }

  const voteOnTeam = async (vote: 'approve' | 'reject') => {
    if (!user?.id || teamVotes[user.id]) return
    
    const newVotes = { ...teamVotes, [user.id]: vote }
    setTeamVotes(newVotes)
    
    await sendMessage(`${user.user_metadata?.full_name} voted on the team proposal.`, 'system')
    
    const totalVotes = Object.keys(newVotes).length
    if (totalVotes >= players.length) {
      processTeamVotes()
    }
  }

  const processTeamVotes = () => {
    const approvals = Object.values(teamVotes).filter(vote => vote === 'approve').length
    const majority = Math.ceil(players.length / 2)
    
    if (approvals >= majority) {
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
        // Rotate leader
        setLeaderIndex(prev => (prev + 1) % players.length)
        sendMessage(`❌ Team rejected. Leader selects a new team. (Attempt ${voteCount + 2}/${maxVotes})`, 'system')
      }
    }
  }

  const voteOnMission = async (vote: 'success' | 'fail') => {
    if (!user?.id || !selectedTeam.includes(user.id) || missionVotes[user.id]) return
    
    const newMissionVotes = { ...missionVotes, [user.id]: vote }
    setMissionVotes(newMissionVotes)
    
    await sendMessage(`${user.user_metadata?.full_name} completed their mission action.`, 'system')
    
    const missionVotesCount = Object.keys(newMissionVotes).length
    if (missionVotesCount >= selectedTeam.length) {
      processMissionVotes()
    }
  }

  const processMissionVotes = () => {
    const currentQuestData = quests[currentQuest]
    const failVotes = Object.values(missionVotes).filter(vote => vote === 'fail').length
    const questResult = failVotes >= currentQuestData.failsRequired ? 'fail' : 'success'
    
    // Update quest result
    const updatedQuests = [...quests]
    updatedQuests[currentQuest] = {
      ...updatedQuests[currentQuest],
      status: 'completed',
      result: questResult,
      missionVotes: { ...missionVotes }
    }
    setQuests(updatedQuests)
    
    // Send result message
    if (questResult === 'success') {
      sendMessage(`🎉 Quest ${currentQuest + 1} succeeded! (${failVotes} fail votes)`, 'system')
    } else {
      sendMessage(`💀 Quest ${currentQuest + 1} failed! (${failVotes} fail votes, needed ${currentQuestData.failsRequired})`, 'system')
    }
    
    // Check win conditions
    const successfulQuests = updatedQuests.filter(q => q.result === 'success').length
    const failedQuests = updatedQuests.filter(q => q.result === 'fail').length
    
    if (successfulQuests >= 3) {
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

      {/* Main Game Area */}
      <div className="lg:col-span-2 space-y-6">
        {/* Quest Progress */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Quest Progress</h2>
          <div className="flex gap-4 mb-4">
            {quests.map((quest, index) => (
              <div
                key={quest.questNumber}
                className={`flex-1 p-4 rounded-lg text-center ${
                  quest.result === 'success' ? 'bg-green-600' :
                  quest.result === 'fail' ? 'bg-red-600' :
                  index === currentQuest ? 'bg-blue-600' :
                  'bg-gray-600'
                }`}
              >
                <div className="text-white font-semibold">Quest {quest.questNumber}</div>
                <div className="text-sm text-white/80">{quest.playersRequired} players</div>
                <div className="text-xs text-white/60">
                  {quest.failsRequired} fail{quest.failsRequired > 1 ? 's' : ''} needed
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-white">
            <span className="text-green-400">Good: {successfulQuests}</span> | 
            <span className="text-red-400"> Evil: {failedQuests}</span>
          </div>
        </div>

        {/* Game Phase Content */}
        {gamePhase === 'team_selection' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Team Selection - Quest {currentQuest + 1}
            </h3>
            {isLeader ? (
              <div>
                <p className="text-blue-200 mb-4">
                  You are the leader! Select {quests[currentQuest]?.playersRequired} players for the quest.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {players.map(player => (
                    <button
                      key={player.user_id}
                      onClick={() => handlePlayerSelect(player.user_id)}
                      className={`p-3 rounded-lg transition-colors ${
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
                  disabled={selectedTeam.length !== quests[currentQuest]?.playersRequired}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  Propose Team ({selectedTeam.length}/{quests[currentQuest]?.playersRequired})
                </button>
              </div>
            ) : (
              <p className="text-blue-200">
                Waiting for the leader to select a team...
              </p>
            )}
          </div>
        )}

        {gamePhase === 'team_voting' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Team Voting</h3>
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2">Proposed Team:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTeam.map(playerId => {
                  const player = players.find(p => p.user_id === playerId)
                  return (
                    <span key={playerId} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                      {player?.player_profiles?.persona_name || 'Unknown'}
                    </span>
                  )
                })}
              </div>
            </div>
            {!teamVotes[user?.id || ''] ? (
              <div className="flex gap-4">
                <button
                  onClick={() => voteOnTeam('approve')}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => voteOnTeam('reject')}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  ❌ Reject
                </button>
              </div>
            ) : (
              <p className="text-center text-green-400">
                ✓ Your vote has been recorded
              </p>
            )}
          </div>
        )}

        {gamePhase === 'mission' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Quest {currentQuest + 1} - Mission</h3>
            {selectedTeam.includes(user?.id || '') ? (
              <div>
                <p className="text-blue-200 mb-4">
                  You are on the quest team! Choose your action:
                </p>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => voteOnMission('success')}
                    disabled={user?.id ? missionVotes[user.id] !== undefined : false}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    ✅ Success
                  </button>
                  {userTeam === 'Evil' && (
                    <button
                      onClick={() => voteOnMission('fail')}
                      disabled={user?.id ? missionVotes[user.id] !== undefined : false}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      ❌ Fail
                    </button>
                  )}
                </div>
                {user?.id && missionVotes[user.id] && (
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
                      const hasVoted = missionVotes[playerId] !== undefined
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
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Game Over!</h3>
            {successfulQuests >= 3 ? (
              <div>
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-green-400 text-xl">Good Team Wins!</p>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-4">💀</div>
                <p className="text-red-400 text-xl">Evil Team Wins!</p>
              </div>
            )}
          </div>
        )}

        {/* Rules Reminder */}
        <div className="bg-white/5 rounded-lg p-4">
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