import { BottomNav } from './components/BottomNav'
import { HomeScreen } from './screens/HomeScreen'
import { MyGamesScreen } from './screens/MyGamesScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { RatingScreen } from './screens/RatingScreen'
import { AppProvider } from './state/AppContext'
import { useAppContext } from './state/context'
import './App.css'

function AppShell() {
  const { activeTab, setActiveTab } = useAppContext()

  return (
    <div className="app-shell">
      <main className="app-content">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'games' && <MyGamesScreen />}
        {activeTab === 'rating' && <RatingScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

export default App
