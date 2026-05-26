
const VERSION = '1.1.0'
const DEFAULT_BASE_URL = 'https://api.qcode.cc/qcode-img/v1'

export function Footer() {
  return (
    <div className="h-[42px] bg-app-bg flex items-center px-7 border-t border-border">
      <span className="text-text-secondary text-[11px]">
        Endpoint: {DEFAULT_BASE_URL}
      </span>
      <div className="flex-1" />
      <span className="text-text-secondary text-[11px]">v{VERSION}</span>
    </div>
  )
}
