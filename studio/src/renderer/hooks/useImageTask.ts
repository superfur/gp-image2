import { useState, useCallback } from 'react'
import type { TaskStatus, TaskResult } from '../types'
import { friendlyError } from '../lib/errors'

interface UseImageTaskReturn {
  status: TaskStatus
  error: string
  result: TaskResult | null
  run: (work: () => Promise<TaskResult>) => void
  reset: () => void
}

export function useImageTask(): UseImageTaskReturn {
  const [status, setStatus] = useState<TaskStatus>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<TaskResult | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError('')
    setResult(null)
  }, [])

  const run = useCallback((work: () => Promise<TaskResult>) => {
    setStatus('loading')
    setError('')
    setResult(null)
    work()
      .then((res) => {
        setResult(res)
        setStatus('success')
      })
      .catch((err: Error) => {
        setError(friendlyError(err.message))
        setStatus('error')
      })
  }, [])

  return { status, error, result, run, reset }
}
