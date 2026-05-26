export function friendlyError(error: string): string {
  const lower = error.toLowerCase()
  if (error.includes('524')) {
    return 'CDN 100s 超时，建议换用直连入口或稍后重试'
  }
  if (lower.includes('rate_limit') || error.includes('429')) {
    return '超出限额（每日 100 张或并发 2），请稍后重试'
  }
  if (error.includes('401') || lower.includes('unauthorized')) {
    return 'API Key 无效或已过期，请检查配置'
  }
  if (lower.includes('connection') || lower.includes('timeout')) {
    return `连接失败，请检查网络：${error}`
  }
  return error
}

export class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'AppError'
  }
}
