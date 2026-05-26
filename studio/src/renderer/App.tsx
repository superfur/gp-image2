import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { GeneratePage } from './components/modes/GeneratePage'
import { EditPage } from './components/modes/EditPage'
import { FusePage } from './components/modes/FusePage'
import { useSettingsStore } from './store/settingsStore'
import { useAppStore } from './store/appStore'

function App() {
  const { load, loaded } = useSettingsStore()
  const { activeTab } = useAppStore()

  useEffect(() => {
    load()
  }, [load])

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-app-bg">
        <div className="text-text-secondary">加载中...</div>
      </div>
    )
  }

  return (
    <AppShell>
      {activeTab === 0 && <GeneratePage />}
      {activeTab === 1 && <EditPage />}
      {activeTab === 2 && <FusePage />}
    </AppShell>
  )
}

export default App
