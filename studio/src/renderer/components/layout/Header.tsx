import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

export function Header() {
  const { apiKey, setApiKey, save } = useSettingsStore()
  const [showKey, setShowKey] = useState(false)
  const [inputValue, setInputValue] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setApiKey(inputValue)
    await save()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-[116px] bg-header-bg flex items-center px-7 py-5">
      {/* Title */}
      <div className="flex flex-col flex-1">
        <h1 className="text-[28px] font-extrabold text-slate-100 leading-none">
          gpt-image-2 Studio
        </h1>
        <p className="text-[13px] text-indigo-200 mt-1">
          生成、编辑、融合图片的一体化工作台
        </p>
      </div>

      {/* API Key Card */}
      <div className="bg-header-card border border-[#263653] rounded-[18px] px-4 py-3 flex items-center gap-3">
        <span className="text-indigo-200 font-bold text-sm">API Key</span>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="sk-..."
            className="bg-white border border-border rounded-input px-3 py-[7px] text-sm text-text-primary w-[310px] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <label className="flex items-center gap-1 text-indigo-200 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showKey}
            onChange={(e) => setShowKey(e.target.checked)}
            className="accent-accent"
          />
          显示
        </label>
        <button
          onClick={handleSave}
          className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-[7px] rounded-btn transition-colors"
        >
          {saved ? '已保存' : '保存'}
        </button>
      </div>
    </div>
  )
}
