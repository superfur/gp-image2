export interface AppSettings {
  apiKey: string
  baseUrl: string
}

export interface GenerateParams {
  prompt: string
  size: string
  quality: string
  n: number
}

export interface EditParams {
  prompt: string
  imagePath: string
  maskPath?: string
  size: string
  quality: string
  n: number
  fidelity: string
  background: string
  outputFormat: string
}

export interface FuseParams {
  prompt: string
  imagePaths: string[]
  size: string
  quality: string
  n: number
  fidelity: string
}

export interface ImageResult {
  b64_json: string
  revised_prompt?: string
}

export interface TaskResult {
  images: ImageResult[]
  revisedPrompt?: string
}

export interface FileInfo {
  path: string
  name: string
  size: number
  thumbnail?: string
}

export type TaskStatus = 'idle' | 'loading' | 'success' | 'error'

export interface IElectronAPI {
  saveSettings: (apiKey: string, baseUrl: string) => Promise<void>
  loadSettings: () => Promise<AppSettings>
  selectFiles: (maxFiles: number) => Promise<string[]>
  readFileAsBase64: (path: string) => Promise<string>
  saveImage: (b64Json: string, defaultName: string) => Promise<string | null>
  generate: (params: GenerateParams) => Promise<TaskResult>
  edit: (params: EditParams) => Promise<TaskResult>
  fuse: (params: FuseParams) => Promise<TaskResult>
  showError: (title: string, message: string) => void
  showSuccess: (title: string, message: string) => void
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
