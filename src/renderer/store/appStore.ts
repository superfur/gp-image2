import { create } from 'zustand'

interface AppStore {
  activeTab: number
  setActiveTab: (tab: number) => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: 0,
  setActiveTab: (activeTab) => set({ activeTab }),
}))
