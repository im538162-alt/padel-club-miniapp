import { useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { BottomNav } from './components/BottomNav'
import { AdminScreen } from './screens/AdminScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MyGamesScreen } from './screens/MyGamesScreen'
import { OpenMatchesScreen } from './screens/OpenMatchesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { RatingScreen } from './screens/RatingScreen'
import { AppProvider } from './state/AppContext'
import { useAppContext } from './state/context'
import './App.css'

function AppShell() {
  const { activeTab, setActiveTab } = useAppContext()
  const [showAdmin, setShowAdmin] = useState(false)
  const [showOpenMatches, setShowOpenMatches] = useState(false)
  const isOverlayOpen = showAdmin || showOpenMatches

  return (
    <div className="app-shell">
      <main className="app-content">
        {showAdmin && <AdminScreen onBack={() => setShowAdmin(false)} />}
        {showOpenMatches && <OpenMatchesScreen onBack={() => setShowOpenMatches(false)} />}
        {!isOverlayOpen && (
          <>
            {activeTab === 'home' && <HomeScreen onOpenOpenMatches={() => setShowOpenMatches(true)} />}
            {activeTab === 'games' && <MyGamesScreen />}
            {activeTab === 'rating' && <RatingScreen />}
            {activeTab === 'profile' && <ProfileScreen onOpenAdmin={() => setShowAdmin(true)} />}
          </>
        )}
      </main>
      {!isOverlayOpen && <BottomNav active={activeTab} onChange={setActiveTab} />}
    </div>
  )
}

function App() {
  return (
    <AuthGate>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthGate>
  )
}

export default App
