import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLobby } from '../contexts/LobbyContext'
import { PlayerProfile } from '../lib/supabase'

const PlayerProfileComponent: React.FC = () => {
  const { user } = useAuth()
  const { playerProfiles, createPlayerProfile, updatePlayerProfile } = useLobby()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PlayerProfile | null>(null)
  
  const [formData, setFormData] = useState({
    personaName: '',
    personaDescription: '',
    preferredRole: 'good' as 'good' | 'evil'
  })

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Creating profile with data:', formData)
    
    if (!formData.personaName.trim()) {
      alert('Please enter a persona name')
      return
    }

    try {
      const profile = await createPlayerProfile(
        formData.personaName,
        formData.personaDescription,
        formData.preferredRole
      )

      if (profile) {
        console.log('Profile created successfully:', profile)
        setFormData({ personaName: '', personaDescription: '', preferredRole: 'good' })
        setShowCreateForm(false)
        alert('Profile created successfully!')
      } else {
        console.error('Profile creation failed - no profile returned')
        alert('Failed to create profile. Please check your connection and try again.')
      }
    } catch (error) {
      console.error('Error in profile creation:', error)
      alert('Error creating profile. Please try again.')
    }
  }

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Updating profile with data:', formData)
    
    if (!editingProfile) {
      alert('No profile selected for editing')
      return
    }

    if (!formData.personaName.trim()) {
      alert('Please enter a persona name')
      return
    }

    try {
      await updatePlayerProfile(editingProfile.id, {
        persona_name: formData.personaName,
        persona_description: formData.personaDescription,
        preferred_role: formData.preferredRole
      })

      console.log('Profile updated successfully')
      setFormData({ personaName: '', personaDescription: '', preferredRole: 'good' })
      setEditingProfile(null)
      setShowEditForm(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    }
  }

  const startEdit = (profile: PlayerProfile) => {
    setEditingProfile(profile)
    setFormData({
      personaName: profile.persona_name,
      personaDescription: profile.persona_description || '',
      preferredRole: profile.preferred_role || 'good'
    })
    setShowEditForm(true)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Please sign in to manage your player profiles</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Player Profiles</h1>
            <p className="text-blue-200">Create and manage your game personas</p>
          </div>
          <Link
            to="/lobby"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Back to Lobby
          </Link>
        </div>

        {/* Create Profile Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Create New Profile
          </button>
        </div>

        {/* Profiles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playerProfiles.map((profile) => (
            <div key={profile.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {profile.persona_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{profile.persona_name}</h3>
                  <p className="text-blue-200 capitalize">{profile.preferred_role} aligned</p>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4">{profile.persona_description}</p>
              
              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">Game Statistics</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{profile.game_stats.wins}</div>
                    <div className="text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold">{profile.game_stats.losses}</div>
                    <div className="text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">{profile.game_stats.games_played}</div>
                    <div className="text-gray-400">Games</div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => startEdit(profile)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          ))}
        </div>

        {playerProfiles.length === 0 && (
          <div className="text-center text-blue-200 py-12">
            <p className="text-xl mb-4">No player profiles yet</p>
            <p>Create your first persona to start playing!</p>
          </div>
        )}

        {/* Create Profile Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Player Profile</h2>
              <form onSubmit={handleCreateProfile}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Persona Name</label>
                  <input
                    type="text"
                    value={formData.personaName}
                    onChange={(e) => setFormData({ ...formData, personaName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your persona name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Description</label>
                  <textarea
                    value={formData.personaDescription}
                    onChange={(e) => setFormData({ ...formData, personaDescription: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your persona's personality and play style"
                    rows={3}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Preferred Alignment</label>
                  <select
                    value={formData.preferredRole}
                    onChange={(e) => setFormData({ ...formData, preferredRole: e.target.value as 'good' | 'evil' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="good">Good (Loyal Servant)</option>
                    <option value="evil">Evil (Minion of Mordred)</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditForm && editingProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Player Profile</h2>
              <form onSubmit={handleEditProfile}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Persona Name</label>
                  <input
                    type="text"
                    value={formData.personaName}
                    onChange={(e) => setFormData({ ...formData, personaName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your persona name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Description</label>
                  <textarea
                    value={formData.personaDescription}
                    onChange={(e) => setFormData({ ...formData, personaDescription: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your persona's personality and play style"
                    rows={3}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Preferred Alignment</label>
                  <select
                    value={formData.preferredRole}
                    onChange={(e) => setFormData({ ...formData, preferredRole: e.target.value as 'good' | 'evil' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="good">Good (Loyal Servant)</option>
                    <option value="evil">Evil (Minion of Mordred)</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerProfileComponent
