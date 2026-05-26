import { useState, useCallback, DragEvent } from 'react'

interface UseDropZoneOptions {
  maxFiles?: number
  onFilesSelected?: (files: File[]) => void
}

export function useDropZone({ maxFiles = 1, onFilesSelected }: UseDropZoneOptions = {}) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles)
      onFilesSelected?.(files)
    },
    [maxFiles, onFilesSelected]
  )

  return {
    isDragActive,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  }
}
