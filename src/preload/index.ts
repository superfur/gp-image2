import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI, GenerateParams, EditParams, FuseParams, TaskResult, AppSettings } from '../renderer/types/index.js'

const api: IElectronAPI = {
  saveSettings: (apiKey: string, baseUrl: string) =>
    ipcRenderer.invoke('save-settings', apiKey, baseUrl),

  loadSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('load-settings'),

  selectFiles: (maxFiles: number) =>
    ipcRenderer.invoke('select-files', maxFiles),

  readFileAsBase64: (path: string) =>
    ipcRenderer.invoke('read-file-as-base64', path),

  saveImage: (b64Json: string, defaultName: string) =>
    ipcRenderer.invoke('save-image', b64Json, defaultName),

  generate: (params: GenerateParams): Promise<TaskResult> =>
    ipcRenderer.invoke('generate', params),

  edit: (params: EditParams): Promise<TaskResult> =>
    ipcRenderer.invoke('edit', params),

  fuse: (params: FuseParams): Promise<TaskResult> =>
    ipcRenderer.invoke('fuse', params),

  showError: (title: string, message: string) =>
    ipcRenderer.send('show-error', title, message),

  showSuccess: (title: string, message: string) =>
    ipcRenderer.send('show-success', title, message),
}

contextBridge.exposeInMainWorld('electronAPI', api)
