export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function shortName(name: string, maxLen = 28): string {
  if (name.length <= maxLen) return name
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex < 0) return name.slice(0, maxLen - 3) + '...'
  const ext = name.slice(dotIndex)
  const stem = name.slice(0, dotIndex)
  const maxStem = Math.max(8, maxLen - ext.length - 4)
  return `${stem.slice(0, maxStem)}...${ext}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
