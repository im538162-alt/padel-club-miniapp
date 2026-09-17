import { useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { BottomNav } from './components/BottomNav'
import { AdminScreen } from './screens/AdminScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MyGamesScreen } from './screens/MyGamesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { RatingScreen } from './screens/RatingScreen'
import { AppProvider } from './state/AppContext'
import { useAppContext } from './state/context'
import './App.css'

function AppShell() {
  const { activeTab, setActiveTab } = useAppContext()
  const [showAdmin, setShowAdmin] = useState(false)

  return (
    <div className="app-shell">
      <main className="app-content">
        {showAdmin ? (
          <AdminScreen onBack={() => setShowAdmin(false)} />
        ) : (
          <>
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'games' && <MyGamesScreen />}
            {activeTab === 'rating' && <RatingScreen />}
            {activeTab === 'profile' && <ProfileScreen onOpenAdmin={() => setShowAdmin(true)} />}
          </>
        )}
      </main>
      {!showAdmin && <BottomNav active={activeTab} onChange={setActiveTab} />}
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
