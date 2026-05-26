import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { getSettings, saveSettings } from './config-store.js'
import { generateImages, editImages, fuseImages } from './api-client.js'
import type { GenerateParams, EditParams, FuseParams } from '../renderer/types/index.js'

export function setupIpcHandlers() {
  // Settings
  ipcMain.handle('load-settings', () => {
    return getSettings()
  })

  ipcMain.handle('save-settings', (_event, apiKey: string, baseUrl: string) => {
    saveSettings(apiKey, baseUrl)
  })

  // File dialogs
  ipcMain.handle('select-files', async (_event, maxFiles: number) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    })
    if (result.canceled) return []
    return result.filePaths.slice(0, maxFiles)
  })

  ipcMain.handle('read-file-as-base64', async (_event, filePath: string) => {
    const data = await readFile(filePath)
    return data.toString('base64')
  })

  ipcMain.handle('save-image', async (_event, b64Json: string, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: 'WebP', extensions: ['webp'] },
      ],
    })
    if (result.canceled || !result.filePath) return null

    const { writeFile } = await import('fs/promises')
    const buffer = Buffer.from(b64Json, 'base64')
    await writeFile(result.filePath, buffer)
    return result.filePath
  })

  // API calls
  ipcMain.handle('generate', async (_event, params: GenerateParams) => {
    return generateImages(params)
  })

  ipcMain.handle('edit', async (_event, params: EditParams) => {
    return editImages(params)
  })

  ipcMain.handle('fuse', async (_event, params: FuseParams) => {
    return fuseImages(params)
  })

  // Dialog helpers
  ipcMain.on('show-error', (event, title: string, message: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      dialog.showMessageBox(win, { type: 'error', title, message })
    }
  })

  ipcMain.on('show-success', (event, title: string, message: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      dialog.showMessageBox(win, { type: 'info', title, message })
    }
  })
}
