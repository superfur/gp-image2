import { useCallback, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sparkles } from 'lucide-react'
import { SectionCard } from '../common/SectionCard'
import { ImageGrid } from '../common/ImageGrid'
import { StatusBar } from '../common/StatusBar'
import { useImageTask } from '../../hooks/useImageTask'
import { generateImages, saveImage } from '../../lib/api'
import { useSettingsStore } from '../../store/settingsStore'

export function GeneratePage() {
  const { apiKey } = useSettingsStore()
  const { status, error, result, run, reset } = useImageTask()
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const handleGenerate = useCallback(() => {
    const prompt = promptRef.current?.value.trim()
    if (!prompt) {
      window.electronAPI.showError('提示', '请输入图像描述（Prompt）')
      return
    }
    if (!apiKey) {
      window.electronAPI.showError('提示', '请先在顶部输入并保存 API Key')
      return
    }

    reset()
    run(() =>
      generateImages({
        prompt,
        size: (document.getElementById('gen-size') as HTMLSelectElement).value,
        quality: (document.getElementById('gen-quality') as HTMLSelectElement).value,
        n: parseInt((document.getElementById('gen-n') as HTMLSelectElement).value),
      })
    )
  }, [apiKey, reset, run])

  const handleSave = useCallback(async (b64Json: string, idx: number) => {
    const path = await saveImage(b64Json, `generated_${idx + 1}.png`)
    if (path) {
      window.electronAPI.showSuccess('保存成功', `已保存至:\n${path}`)
    }
  }, [])

  const images = result?.images.map((img) => img.b64_json) || []

  const statusMessage =
    status === 'loading'
      ? '处理中...'
      : status === 'success'
      ? `完成，共 ${images.length} 张图片`
      : status === 'error'
      ? error
      : '就绪'

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* Left panel */}
      <Panel defaultSize={40} minSize={30}>
        <div className="h-full overflow-y-auto pr-5 py-5 flex flex-col gap-4">
          <SectionCard title="提示词">
            <textarea
              ref={promptRef}
              className="w-full bg-white border border-border rounded-input px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[126px]"
              placeholder="描述你想要生成的图片..."
            />
          </SectionCard>

          <SectionCard title="生成参数">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="text-[12px] font-bold text-text-secondary w-[52px]">
                  尺寸
                </label>
                <select
                  id="gen-size"
                  className="flex-1 bg-white border border-border rounded-input px-3 py-[7px] text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  defaultValue="1024x1024"
                >
                  <option value="1024x1024">1024x1024</option>
                  <option value="1024x1536">1024x1536</option>
                  <option value="1536x1024">1536x1024</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[12px] font-bold text-text-secondary w-[52px]">
                  质量
                </label>
                <select
                  id="gen-quality"
                  className="flex-1 bg-white border border-border rounded-input px-3 py-[7px] text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  defaultValue="medium"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[12px] font-bold text-text-secondary w-[52px]">
                  数量
                </label>
                <select
                  id="gen-n"
                  className="flex-1 bg-white border border-border rounded-input px-3 py-[7px] text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  defaultValue="1"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <div className="mt-auto flex flex-col gap-3">
            <button
              onClick={handleGenerate}
              disabled={status === 'loading'}
              className="w-full bg-accent hover:bg-accent-hover disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-[11px] rounded-btn transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              {status === 'loading' ? '生成中...' : '生成图片'}
            </button>
            {status === 'loading' && (
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full animate-pulse w-full" />
              </div>
            )}
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="w-[14px] flex items-center justify-center cursor-col-resize">
        <div className="w-1 h-16 bg-transparent hover:bg-blue-200 rounded transition-colors" />
      </PanelResizeHandle>

      {/* Right panel */}
      <Panel defaultSize={60} minSize={40}>
        <div className="h-full flex flex-col gap-4 py-5 pl-5">
          {/* Hero card */}
          <div className="bg-surface border border-border rounded-card px-6 py-[18px]">
            <h2 className="text-[22px] font-extrabold text-text-primary">文生图</h2>
            <p className="text-[12px] text-text-secondary mt-1">
              输入提示词并生成高质量图片，结果会在右侧工作区呈现。
            </p>
          </div>

          {/* Preview */}
          <div className="flex-1 bg-surface border border-border rounded-card overflow-y-auto">
            <div className="p-5">
              {images.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <p className="text-[15px] font-bold text-text-secondary text-center">
                    生成结果会显示在这里
                    <br />
                    完成后可预览并保存图片
                  </p>
                </div>
              ) : (
                <ImageGrid images={images} onSave={handleSave} />
              )}
            </div>
          </div>

          {/* Revised prompt */}
          {result?.revisedPrompt && (
            <p className="text-[12px] text-text-secondary px-4 py-2 bg-surface border border-border rounded-card-sm">
              模型优化后的 Prompt:
              <br />
              {result.revisedPrompt}
            </p>
          )}

          {/* Status */}
          <StatusBar status={status} message={statusMessage} />
        </div>
      </Panel>
    </PanelGroup>
  )
}
