import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { useAppStore } from '../../store/appStore'

interface AppShellProps {
  children: ReactNode
}

const TAB_LABELS = ['文生图', '图像编辑', '多图融合']

export function AppShell({ children }: AppShellProps) {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <div className="h-screen flex flex-col bg-app-bg">
      <Header />

      {/* Tab bar */}
      <div className="flex items-center px-6 pt-4 gap-1">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-[10px] rounded-t-xl font-bold text-sm transition-colors ${
              activeTab === idx
                ? 'bg-accent text-white'
                : 'bg-tab-bg text-slate-300 hover:bg-tab-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ padding: '0 24px 18px' }}>
        {children}
      </div>

      <Footer />
    </div>
  )
}
