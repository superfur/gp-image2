import { create } from 'zustand'
import type { AppSettings } from '../types'

interface SettingsStore {
  apiKey: string
  baseUrl: string
  loaded: boolean
  setApiKey: (key: string) => void
  setBaseUrl: (url: string) => void
  load: () => Promise<void>
  save: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  apiKey: '',
  baseUrl: 'https://api.qcode.cc/qcode-img/v1',
  loaded: false,

  setApiKey: (apiKey) => set({ apiKey }),

  setBaseUrl: (baseUrl) => set({ baseUrl }),

  load: async () => {
    try {
      const settings: AppSettings = await window.electronAPI.loadSettings()
      set({ apiKey: settings.apiKey, baseUrl: settings.baseUrl, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  save: async () => {
    const { apiKey, baseUrl } = get()
    await window.electronAPI.saveSettings(apiKey, baseUrl)
  },
}))
