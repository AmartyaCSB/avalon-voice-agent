import React, { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthCallback: React.FC = () => {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth callback error:', error)
        }
        // Redirect to lobby after successful authentication
        window.location.href = '/lobby'
      } catch (error) {
        console.error('Auth callback error:', error)
      }
    }

    handleAuthCallback()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold">Completing authentication...</h2>
        <p className="text-blue-200 mt-2">Please wait while we sign you in</p>
      </div>
    </div>
  )
}

export default AuthCallback
