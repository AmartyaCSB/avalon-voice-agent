import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLobby } from '../contexts/LobbyContext'
import { supabase } from '../lib/supabase'

const DebugConsole: React.FC = () => {
  const { user } = useAuth()
  const { playerProfiles, loading } = useLobby()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [testResults, setTestResults] = useState<string[]>([])

  const runTests = async () => {
    const results: string[] = []
    
    try {
      // Test 1: Check if user exists
      results.push(`✅ User authenticated: ${user?.email || 'No user'}`)
      results.push(`✅ User ID: ${user?.id || 'No ID'}`)
      
      // Test 2: Check Supabase connection
      const { data: testQuery, error: testError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id || '')
        .single()
      
      if (testError) {
        results.push(`❌ Supabase users query failed: ${testError.message}`)
      } else {
        results.push(`✅ Found user in database: ${testQuery?.display_name || 'No name'}`)
      }
      
      // Test 3: Check player profiles
      const { data: profiles, error: profileError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user?.id || '')
      
      if (profileError) {
        results.push(`❌ Player profiles query failed: ${profileError.message}`)
      } else {
        results.push(`✅ Found ${profiles?.length || 0} player profiles`)
      }
      
      // Test 4: Check table structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('player_profiles')
        .select('*')
        .limit(1)
      
      if (tableError) {
        results.push(`❌ Table structure check failed: ${tableError.message}`)
      } else {
        results.push(`✅ Table accessible, sample data: ${JSON.stringify(tableInfo)}`)
      }
      
      // Test 5: Try to create a test profile
      const testProfileData = {
        user_id: user?.id,
        persona_name: 'Test Profile ' + Date.now(),
        persona_description: 'Debug test profile',
        preferred_role: 'good' as const,
        game_stats: { wins: 0, losses: 0, games_played: 0 }
      }
      
      const { data: newProfile, error: createError } = await supabase
        .from('player_profiles')
        .insert(testProfileData)
        .select()
        .single()
      
      if (createError) {
        results.push(`❌ Profile creation failed: ${createError.message}`)
        results.push(`❌ Error details: ${JSON.stringify(createError, null, 2)}`)
      } else {
        results.push(`✅ Test profile created successfully: ${newProfile.persona_name}`)
        
        // Clean up test profile
        await supabase
          .from('player_profiles')
          .delete()
          .eq('id', newProfile.id)
        results.push(`✅ Test profile cleaned up`)
      }
      
    } catch (error) {
      results.push(`❌ Unexpected error: ${error}`)
    }
    
    setTestResults(results)
  }

  useEffect(() => {
    setDebugInfo({
      user: user ? {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      } : null,
      profilesCount: playerProfiles.length,
      loading,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    })
  }, [user, playerProfiles, loading])

  if (!user) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-y-auto text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Debug Console</h3>
        <button
          onClick={runTests}
          className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
        >
          Run Tests
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong>Debug Info:</strong>
          <pre className="bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        {testResults.length > 0 && (
          <div>
            <strong>Test Results:</strong>
            <div className="bg-gray-800 p-2 rounded mt-1 space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DebugConsole
