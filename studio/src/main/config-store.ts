import Store from 'electron-store'
import { safeStorage } from 'electron'

interface StoreSchema {
  apiKey: string
  baseUrl: string
}

const DEFAULT_BASE_URL = 'https://api.qcode.cc/qcode-img/v1'

const store = new Store<StoreSchema>({
  name: 'config',
  defaults: {
    apiKey: '',
    baseUrl: DEFAULT_BASE_URL,
  },
})

export function getApiKey(): string {
  const encrypted = store.get('apiKey', '')
  if (!encrypted) return ''
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    }
  } catch {
    // fallback: treat as plain text
  }
  return encrypted
}

export function setApiKey(key: string): void {
  if (!key) {
    store.set('apiKey', '')
    return
  }
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key).toString('base64')
    store.set('apiKey', encrypted)
  } else {
    store.set('apiKey', key)
  }
}

export function getBaseUrl(): string {
  return store.get('baseUrl', DEFAULT_BASE_URL)
}

export function setBaseUrl(url: string): void {
  store.set('baseUrl', url)
}

export function getSettings() {
  return {
    apiKey: getApiKey(),
    baseUrl: getBaseUrl(),
  }
}

export function saveSettings(apiKey: string, baseUrl: string) {
  setApiKey(apiKey)
  setBaseUrl(baseUrl)
}
