import type { GenerateParams, EditParams, FuseParams, TaskResult } from '../types'

export async function generateImages(params: GenerateParams): Promise<TaskResult> {
  return window.electronAPI.generate(params)
}

export async function editImages(params: EditParams): Promise<TaskResult> {
  return window.electronAPI.edit(params)
}

export async function fuseImages(params: FuseParams): Promise<TaskResult> {
  return window.electronAPI.fuse(params)
}

export async function selectFiles(maxFiles: number): Promise<string[]> {
  return window.electronAPI.selectFiles(maxFiles)
}

export async function readFileAsBase64(path: string): Promise<string> {
  return window.electronAPI.readFileAsBase64(path)
}

export async function saveImage(b64Json: string, defaultName: string): Promise<string | null> {
  return window.electronAPI.saveImage(b64Json, defaultName)
}
