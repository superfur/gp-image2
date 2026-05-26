import { useState } from 'react'
import { X } from 'lucide-react'
import { shortName } from '../../lib/utils'
import { selectFiles } from '../../lib/api'
import type { FileEntry } from './DropZone'

interface MultiImageUploaderProps {
  files: FileEntry[]
  maxFiles?: number
  onFilesChange: (files: FileEntry[]) => void
}

function mimeFromName(name: string): string {
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export function MultiImageUploader({
  files,
  maxFiles = 8,
  onFilesChange,
}: MultiImageUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleSelect = async () => {
    const paths = await selectFiles(maxFiles - files.length)
    if (!paths.length) return

    const newEntries: FileEntry[] = await Promise.all(
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
    onFilesChange([...files, ...newEntries].slice(0, maxFiles))
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const dropped = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, maxFiles - files.length)

    const newEntries: FileEntry[] = await Promise.all(
      dropped.map(async (f) => {
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
    onFilesChange([...files, ...newEntries].slice(0, maxFiles))
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <p className="text-[13px] font-extrabold text-text-primary mb-2">
        已选择 {files.length}/{maxFiles} 张图片
      </p>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleSelect}
        className={`bg-surface-alt border border-dashed border-[#BFD0EA] rounded-card-sm min-h-[80px] px-4 py-3 cursor-pointer transition-colors ${
          isDragActive ? 'drop-active' : ''
        }`}
      >
        <p className="text-[13px] font-extrabold text-text-primary">多图上传</p>
        <p className="text-[12px] text-text-secondary mt-[6px]">
          点击选择，最多 {maxFiles} 张；支持 PNG / JPEG / WebP
        </p>
      </div>

      {/* Thumbnail grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {files.map((entry, idx) => (
            <div
              key={idx}
              className="bg-surface-alt border border-border rounded-card-xs p-2"
            >
              <div className="flex items-center justify-center">
                <img
                  src={`data:image/png;base64,${entry.thumbnail}`}
                  alt={entry.file.name}
                  className="w-[76px] h-[76px] object-contain rounded"
                />
              </div>
              <p className="text-[10px] text-text-secondary mt-1 truncate text-center">
                {shortName(entry.file.name, 16)}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(idx)
                }}
                className="mt-1 w-full flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-[3px] px-2 rounded text-xs transition-colors"
              >
                <X size={10} />
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
