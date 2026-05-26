import { useCallback } from 'react'
import { useDropZone } from '../../hooks/useDropZone'
import { selectFiles } from '../../lib/api'
import { shortName } from '../../lib/utils'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

export interface FileEntry {
  file: File
  path: string
  thumbnail?: string
}

interface DropZoneProps {
  title: string
  files: FileEntry[]
  onFilesChange: (files: FileEntry[]) => void
  maxFiles?: number
  emptyText?: string
}

function mimeFromName(name: string): string {
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export function DropZone({
  title,
  files,
  onFilesChange,
  maxFiles = 1,
  emptyText,
}: DropZoneProps) {
  const defaultEmpty =
    maxFiles === 1
      ? '点击选择 PNG / JPEG / WebP，单张不超过 25MB'
      : `点击选择，最多 ${maxFiles} 张；支持 PNG / JPEG / WebP`

  const { isDragActive, dragProps } = useDropZone({
    maxFiles,
    onFilesSelected: handleFileDrop,
  })

  async function handleFileDrop(newFiles: File[]) {
    const valid = newFiles.filter(
      (f) => ACCEPTED.includes(f.type) && f.size <= MAX_FILE_SIZE
    )
    const validSlice = valid.slice(0, maxFiles)

    if (valid.length > maxFiles) {
      window.electronAPI.showError('数量限制', `最多支持 ${maxFiles} 个文件，已自动截断。`)
    }
    const tooLarge = newFiles.filter((f) => f.size > MAX_FILE_SIZE)
    if (tooLarge.length > 0) {
      window.electronAPI.showError(
        '文件过大',
        `${tooLarge.map((f) => f.name).join(', ')} 超过 25MB 限制。`
      )
    }

    const entries: FileEntry[] = await Promise.all(
      validSlice.map(async (f) => {
        const data = await f.arrayBuffer()
        const b64 = btoa(
          new Uint8Array(data)
            .reduce((p, c) => p + String.fromCharCode(c), '')
        )
        return {
          file: f,
          path: (f as any).path || f.name,
          thumbnail: b64,
        }
      })
    )
    onFilesChange(entries)
  }

  const handleClick = useCallback(async () => {
    const paths = await selectFiles(maxFiles)
    if (!paths.length) return

    const entries: FileEntry[] = await Promise.all(
      paths.map(async (path) => {
        const name = path.split(/[/\\]/).pop() || 'image'
        const mimeType = mimeFromName(name)
        const data = await window.electronAPI.readFileAsBase64(path)
        const blob = await fetch(`data:${mimeType};base64,${data}`).then((r) =>
          r.blob()
        )
        const file = new File([blob], name, { type: mimeType })
        return { file, path, thumbnail: data }
      })
    )
    onFilesChange([...files, ...entries].slice(0, maxFiles))
  }, [maxFiles, files, onFilesChange])

  const displayText = () => {
    if (files.length === 0) return emptyText || defaultEmpty
    const names = files.slice(0, 3).map((f) => shortName(f.file.name))
    if (files.length > 3) {
      names.push(`另有 ${files.length - 3} 张图片`)
    }
    return names.join('\n') + '\n点击可重新选择'
  }

  return (
    <div
      {...dragProps}
      onClick={handleClick}
      className={`bg-surface-alt border border-dashed border-[#BFD0EA] rounded-card-sm min-h-[116px] px-4 py-[14px] cursor-pointer transition-colors ${
        isDragActive ? 'drop-active' : ''
      }`}
    >
      <p className="text-[13px] font-extrabold text-text-primary">{title}</p>
      <p className="text-[12px] text-text-secondary mt-[6px] whitespace-pre-line leading-relaxed">
        {displayText()}
      </p>
    </div>
  )
}
