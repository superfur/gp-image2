import { useCallback, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Layers } from 'lucide-react'
import { MultiImageUploader } from '../common/MultiImageUploader'
import { SectionCard } from '../common/SectionCard'
import { ImageGrid } from '../common/ImageGrid'
import { StatusBar } from '../common/StatusBar'
import { useImageTask } from '../../hooks/useImageTask'
import { fuseImages, saveImage } from '../../lib/api'
import { useSettingsStore } from '../../store/settingsStore'
import type { FileEntry } from '../common/DropZone'

export function FusePage() {
  const { apiKey } = useSettingsStore()
  const { status, error, result, run, reset } = useImageTask()
  const [thumbnails, setThumbnails] = useState<FileEntry[]>([])
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const handleFuse = useCallback(() => {
    const prompt = promptRef.current?.value.trim()
    if (!prompt) {
      window.electronAPI.showError('提示', '请输入融合指令（Prompt）')
      return
    }
    if (!apiKey) {
      window.electronAPI.showError('提示', '请先在顶部输入并保存 API Key')
      return
    }
    if (thumbnails.length < 2) {
      window.electronAPI.showError('提示', '多图融合至少需要 2 张图片')
      return
    }

    reset()
    run(() =>
      fuseImages({
        prompt,
        imagePaths: thumbnails.map((t) => t.path),
        size: (document.getElementById('fuse-size') as HTMLSelectElement).value,
        quality: (document.getElementById('fuse-quality') as HTMLSelectElement).value,
        n: parseInt((document.getElementById('fuse-n') as HTMLSelectElement).value),
        fidelity: (document.getElementById('fuse-fidelity') as HTMLSelectElement).value,
      })
    )
  }, [apiKey, thumbnails, reset, run])

  const handleSave = useCallback(async (b64Json: string, idx: number) => {
    const path = await saveImage(b64Json, `fused_${idx + 1}.png`)
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
          <SectionCard title="源图（2-8 张）">
            <MultiImageUploader
              files={thumbnails}
              maxFiles={8}
              onFilesChange={setThumbnails}
            />
            <p className="text-[12px] text-text-secondary mt-2">
              建议在 Prompt 中说明每张图的角色和保留重点。
            </p>
          </SectionCard>

          <SectionCard title="融合指令">
            <textarea
              ref={promptRef}
              className="w-full bg-white border border-border rounded-input px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[112px]"
              placeholder="描述如何融合这些图片..."
            />
          </SectionCard>

          <SectionCard title="输出参数">
            <div className="flex flex-col gap-3">
              {[
                { id: 'fuse-size', label: '尺寸', options: ['auto', '1024x1024', '1024x1536', '1536x1024'], default: 'auto' },
                { id: 'fuse-quality', label: '质量', options: ['auto', 'low', 'medium', 'high'], default: 'auto' },
                { id: 'fuse-n', label: '数量', options: ['1', '2', '3', '4'], default: '1' },
                { id: 'fuse-fidelity', label: '保真度', options: ['low', 'high'], default: 'high' },
              ].map(({ id, label, options, default: def }) => (
                <div key={id} className="flex items-center gap-3">
                  <label className="text-[12px] font-bold text-text-secondary w-[52px]">
                    {label}
                  </label>
                  <select
                    id={id}
                    className="flex-1 bg-white border border-border rounded-input px-3 py-[7px] text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                    defaultValue={def}
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="mt-auto flex flex-col gap-3">
            <button
              onClick={handleFuse}
              disabled={status === 'loading'}
              className="w-full bg-accent hover:bg-accent-hover disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-[11px] rounded-btn transition-colors flex items-center justify-center gap-2"
            >
              <Layers size={16} />
              {status === 'loading' ? '处理中...' : '融合图片'}
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
          <div className="bg-surface border border-border rounded-card px-6 py-[18px]">
            <h2 className="text-[22px] font-extrabold text-text-primary">多图融合</h2>
            <p className="text-[12px] text-text-secondary mt-1">
              上传 2-8 张图片并说明每张图的角色，生成新的合成画面。
            </p>
          </div>

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

          {result?.revisedPrompt && (
            <p className="text-[12px] text-text-secondary px-4 py-2 bg-surface border border-border rounded-card-sm">
              模型优化后的 Prompt:
              <br />
              {result.revisedPrompt}
            </p>
          )}

          <StatusBar status={status} message={statusMessage} />
        </div>
      </Panel>
    </PanelGroup>
  )
}
