import { useState } from 'react'
import './App.css'
import GameCanvas from './GameCanvas'
import HelpScreen from './HelpScreen'

function App() {
  const [showHelp, setShowHelp] = useState(true)

  const handleStartGame = () => {
    setShowHelp(false)
  }

  const handleShowHelp = () => {
    setShowHelp(true)
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Pizza Ready - Simplified</h2>
      {showHelp ? (
        <HelpScreen onStartGame={handleStartGame} />
      ) : (
        <div>
          <GameCanvas />
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              onClick={handleShowHelp}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              查看遊戲說明
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
