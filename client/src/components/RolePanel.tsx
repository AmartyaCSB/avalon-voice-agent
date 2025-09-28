import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RoleInfo {
  role: string
  team: 'Good' | 'Evil'
  abilities: string[]
  teammates?: string[]
  knownRoles?: { [playerName: string]: string }
  winCondition: string
  specialKnowledge?: string[]
}

interface RolePanelProps {
  playerRole?: string
  playerTeam?: 'Good' | 'Evil'
  allPlayers: any[]
  assignments?: any[]
}

const RolePanel: React.FC<RolePanelProps> = ({ playerRole, playerTeam, allPlayers, assignments }) => {
  const { user } = useAuth()
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null)
  const [showTeammates, setShowTeammates] = useState(false)

  useEffect(() => {
    if (playerRole && playerTeam && assignments) {
      const info = generateRoleInfo(playerRole, playerTeam, allPlayers, assignments, user?.id || '')
      setRoleInfo(info)
    }
  }, [playerRole, playerTeam, allPlayers, assignments, user])

  const generateRoleInfo = (
    role: string,
    team: 'Good' | 'Evil',
    players: any[],
    gameAssignments: any[],
    currentUserId: string
  ): RoleInfo => {
    const teammates: string[] = []
    const knownRoles: { [playerName: string]: string } = {}
    const specialKnowledge: string[] = []

    // Find teammates and special knowledge based on role
    gameAssignments.forEach((assignment, index) => {
      const playerName = players[index]?.player_profiles?.persona_name || `Player ${index + 1}`
      const playerId = players[index]?.user_id

      if (role === 'Merlin') {
        // Merlin sees all evil players except Mordred
        if (assignment.team === 'Evil' && assignment.role !== 'Mordred') {
          knownRoles[playerName] = 'Evil (not Mordred)'
          specialKnowledge.push(`${playerName} is Evil`)
        }
      } else if (role === 'Percival') {
        // Percival sees Merlin and Morgana (but doesn't know which is which)
        if (assignment.role === 'Merlin' || assignment.role === 'Morgana') {
          knownRoles[playerName] = 'Merlin or Morgana'
          specialKnowledge.push(`${playerName} is either Merlin or Morgana`)
        }
      } else if (team === 'Evil' && assignment.team === 'Evil' && playerId !== currentUserId) {
        // Evil players see each other (except Oberon)
        if (role !== 'Oberon' && assignment.role !== 'Oberon') {
          teammates.push(playerName)
          knownRoles[playerName] = assignment.role
        }
      }
    })

    // Define role-specific information
    const roleDefinitions: { [key: string]: Partial<RoleInfo> } = {
      'Merlin': {
        abilities: [
          'See all Evil players (except Mordred)',
          'Must guide Good team to victory',
          'Must remain hidden from Evil'
        ],
        winCondition: 'Complete 3 quests, then survive assassination',
        specialKnowledge
      },
      'Percival': {
        abilities: [
          'See Merlin and Morgana (but not which is which)',
          'Protect the real Merlin',
          'Help Good team complete quests'
        ],
        winCondition: 'Complete 3 quests and protect Merlin',
        specialKnowledge
      },
      'Loyal Servant of Arthur': {
        abilities: [
          'Vote on quest teams',
          'Play Success on missions',
          'Use deduction to identify evil'
        ],
        winCondition: 'Complete 3 quests and protect Merlin'
      },
      'Morgana': {
        abilities: [
          'Appear as Merlin to Percival',
          'Coordinate with evil teammates',
          'Sabotage missions'
        ],
        winCondition: 'Fail 3 quests OR assassinate Merlin',
        teammates
      },
      'Mordred': {
        abilities: [
          'Hidden from Merlin\'s sight',
          'Coordinate with evil teammates',
          'Can assassinate Merlin'
        ],
        winCondition: 'Fail 3 quests OR assassinate Merlin',
        teammates
      },
      'Minion of Mordred': {
        abilities: [
          'Know other evil players',
          'Sabotage missions',
          'Support evil team'
        ],
        winCondition: 'Fail 3 quests OR help assassinate Merlin',
        teammates
      },
      'Oberon': {
        abilities: [
          'Hidden from other evil players',
          'Hidden from Merlin\'s sight',
          'Must work alone'
        ],
        winCondition: 'Fail 3 quests through deception'
      }
    }

    const baseInfo = roleDefinitions[role] || roleDefinitions['Loyal Servant of Arthur']

    return {
      role,
      team,
      abilities: baseInfo.abilities || [],
      teammates: baseInfo.teammates || [],
      knownRoles,
      winCondition: baseInfo.winCondition || 'Help your team achieve victory',
      specialKnowledge: baseInfo.specialKnowledge || []
    }
  }

  if (!roleInfo) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <h3 className="text-xl text-white mb-4">🎭 Your Role</h3>
        <p className="text-blue-200">Waiting for role assignment...</p>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl text-white">🎭 Your Role</h3>
        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
          roleInfo.team === 'Good' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {roleInfo.team}
        </span>
      </div>

      {/* Role Name */}
      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <h4 className="text-2xl font-bold text-white mb-2">{roleInfo.role}</h4>
        <p className="text-blue-200">{roleInfo.winCondition}</p>
      </div>

      {/* Abilities */}
      <div className="mb-4">
        <h5 className="text-lg font-semibold text-white mb-2">Abilities</h5>
        <ul className="space-y-1">
          {roleInfo.abilities.map((ability, index) => (
            <li key={index} className="text-blue-200 text-sm flex items-start">
              <span className="text-green-400 mr-2">•</span>
              {ability}
            </li>
          ))}
        </ul>
      </div>

      {/* Special Knowledge */}
      {roleInfo.specialKnowledge && roleInfo.specialKnowledge.length > 0 && (
        <div className="mb-4">
          <h5 className="text-lg font-semibold text-white mb-2">Special Knowledge</h5>
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
            {roleInfo.specialKnowledge.map((knowledge, index) => (
              <p key={index} className="text-yellow-200 text-sm mb-1">
                🔍 {knowledge}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Teammates */}
      {roleInfo.teammates && roleInfo.teammates.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h5 className="text-lg font-semibold text-white">Your Teammates</h5>
            <button
              onClick={() => setShowTeammates(!showTeammates)}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              {showTeammates ? 'Hide' : 'Show'}
            </button>
          </div>
          {showTeammates && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
              {roleInfo.teammates.map((teammate, index) => (
                <div key={index} className="text-red-200 text-sm mb-1">
                  🗡️ {teammate} ({roleInfo.knownRoles?.[teammate] || 'Evil'})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strategy Tips */}
      <div className="bg-white/5 rounded-lg p-3">
        <h5 className="text-sm font-semibold text-white mb-2">💡 Strategy Tips</h5>
        <div className="text-blue-200 text-xs space-y-1">
          {roleInfo.team === 'Good' ? (
            <>
              <p>• Pay attention to voting patterns and mission results</p>
              <p>• Look for players who seem to have special knowledge</p>
              <p>• Be careful not to reveal special roles to evil players</p>
            </>
          ) : (
            <>
              <p>• Blend in with good players during discussions</p>
              <p>• Coordinate subtly with your teammates</p>
              <p>• Look for opportunities to sabotage missions</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RolePanel
