import React, { useState } from 'react'
import AvalonVoiceAgent from './components/AvalonVoiceAgent'
import './styles.css'

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [showLobby, setShowLobby] = useState(false)
  const [showVoiceAgent, setShowVoiceAgent] = useState(false)

  const handleGoogleSignIn = () => {
    // Simulate Google sign-in for now
    alert('🎉 Google Sign-In clicked! (Demo mode)')
    setIsSignedIn(true)
  }

  const handleEnterLobby = () => {
    setShowLobby(true)
  }

  if (showVoiceAgent) {
    return <AvalonVoiceAgent onBack={() => setShowVoiceAgent(false)} />
  }

  if (showLobby) {
  return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎮 Avalon Lobby</h1>
              <p style={{ opacity: 0.9 }}>Welcome back! Ready to create or join a game?</p>
          </div>
            <button 
              onClick={() => setShowLobby(false)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Back to Home
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '2rem', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🏠 Create Room</h3>
              <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Start a new Avalon game and invite friends</p>
              <button style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Create New Room
              </button>
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '2rem', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🚪 Join Room</h3>
              <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Enter a room code to join an existing game</p>
              <button style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Join with Code
              </button>
            </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '2rem', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>👤 My Profile</h3>
              <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Manage your player personas and stats</p>
              <button style={{
                background: '#9333ea',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Manage Profiles
              </button>
              </div>

            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '2rem', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🎤 AI Voice Narration</h3>
              <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Create role assignments and AI-powered narration</p>
              <button 
                onClick={() => setShowVoiceAgent(true)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Voice Agent
              </button>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            marginTop: '2rem'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🎯 Available Rooms</h3>
            <p style={{ opacity: 0.8, textAlign: 'center', padding: '2rem' }}>
              No active rooms found. Create one to get started!
            </p>
              </div>
              </div>
              </div>
    )
  }

  if (isSignedIn) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            Welcome back! 👋
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
            Ready to play Avalon?
          </p>
            <button
            onClick={handleEnterLobby}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: '600'
            }}
          >
            🎮 Enter Lobby
            </button>
              </div>
            </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Hero Section */}
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem', background: 'linear-gradient(45deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚔️ Avalon - The Resistance
        </h1>
        <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9, maxWidth: '700px', margin: '0 auto 2rem' }}>
          Join the loyal servants of Arthur or embrace the darkness as a minion of Mordred. The ultimate social deduction game of trust, betrayal, and hidden identities.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
            onClick={handleGoogleSignIn}
            style={{
              background: 'white',
              color: '#374151',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Play Online Multiplayer
            </button>

                    <button
            onClick={() => setShowVoiceAgent(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              padding: '1rem 2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              backdropFilter: 'blur(10px)'
            }}
          >
            🎤 Try Voice Narration
          </button>
                  </div>
                </div>

      {/* Features Section */}
      <div style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '3rem' }}>How to Play Avalon</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👑</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>The Good Team</h3>
              <p style={{ opacity: 0.9 }}>Loyal servants of Arthur must complete 3 quests successfully. Merlin knows the evil players but must stay hidden from the Assassin.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗡️</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>The Evil Team</h3>
              <p style={{ opacity: 0.9 }}>Minions of Mordred work in secret to sabotage quests. They win by failing 3 quests or assassinating Merlin at the end.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '12px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎭</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Hidden Roles</h3>
              <p style={{ opacity: 0.9 }}>Each player receives a secret role with unique abilities. Deduction, bluffing, and trust are key to victory.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>👥 Online Multiplayer</h3>
              <p style={{ opacity: 0.9, marginBottom: '1.5rem', textAlign: 'center' }}>Create or join game rooms with friends. Support for 5-10 players with real-time updates and chat.</p>
              <button
                onClick={handleGoogleSignIn}
                style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  width: '100%'
                }}
              >
                Sign In to Play Online
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>🎤 AI Voice Narration</h3>
              <p style={{ opacity: 0.9, marginBottom: '1.5rem', textAlign: 'center' }}>Generate role assignments and immersive AI-powered voice narration for in-person games.</p>
              <button
                onClick={() => setShowVoiceAgent(true)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  width: '100%'
                }}
              >
                Try Voice Narration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2rem' }}>
        <div style={{ textAlign: 'center', color: '#bfdbfe' }}>
          <p>&copy; 2024 Avalon - The Resistance. Experience the ultimate game of trust and betrayal.</p>
        </div>
      </div>
    </div>
  )
}

export default App