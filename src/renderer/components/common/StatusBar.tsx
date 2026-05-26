import type { TaskStatus } from '../../types'

interface StatusBarProps {
  status: TaskStatus
  message: string
}

export function StatusBar({ status, message }: StatusBarProps) {
  const color =
    status === 'error'
      ? 'text-error'
      : status === 'success'
      ? 'text-success'
      : 'text-text-secondary'

  return (
    <p className={`text-[12px] font-bold ${color}`}>{message}</p>
  )
}
