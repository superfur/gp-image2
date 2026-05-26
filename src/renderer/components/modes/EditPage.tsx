import { useCallback, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Edit3 } from 'lucide-react'
import { DropZone, type FileEntry } from '../common/DropZone'
import { SectionCard } from '../common/SectionCard'
import { ImageGrid } from '../common/ImageGrid'
import { StatusBar } from '../common/StatusBar'
import { useImageTask } from '../../hooks/useImageTask'
import { editImages, saveImage } from '../../lib/api'
import { useSettingsStore } from '../../store/settingsStore'

export function EditPage() {
  const { apiKey } = useSettingsStore()
  const { status, error, result, run, reset } = useImageTask()

  const [sourceFiles, setSourceFiles] = useState<FileEntry[]>([])
  const [maskFiles, setMaskFiles] = useState<FileEntry[]>([])
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const handleEdit = useCallback(() => {
    const prompt = promptRef.current?.value.trim()
    if (!prompt) {
      window.electronAPI.showError('提示', '请输入编辑指令（Prompt）')
      return
    }
    if (!apiKey) {
      window.electronAPI.showError('提示', '请先在顶部输入并保存 API Key')
      return
    }
    if (sourceFiles.length === 0) {
      window.electronAPI.showError('提示', '请上传源图')
      return
    }

    reset()
    run(() =>
      editImages({
        prompt,
        imagePath: sourceFiles[0].path,
        maskPath: maskFiles[0]?.path,
        size: (document.getElementById('edit-size') as HTMLSelectElement).value,
        quality: (document.getElementById('edit-quality') as HTMLSelectElement).value,
        n: parseInt((document.getElementById('edit-n') as HTMLSelectElement).value),
        fidelity: (document.getElementById('edit-fidelity') as HTMLSelectElement).value,
        background: (document.getElementById('edit-background') as HTMLSelectElement).value,
        outputFormat: (document.getElementById('edit-format') as HTMLSelectElement).value,
      })
    )
  }, [apiKey, sourceFiles, maskFiles, reset, run])

  const handleSave = useCallback(async (b64Json: string, idx: number) => {
    const path = await saveImage(b64Json, `edited_${idx + 1}.png`)
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
          <SectionCard title="源图（必填）">
            <DropZone
              title="源图"
              files={sourceFiles}
              onFilesChange={setSourceFiles}
              maxFiles={1}
            />
          </SectionCard>

          <SectionCard title="蒙版（可选）">
            <DropZone
              title="Mask 蒙版"
              files={maskFiles}
              onFilesChange={setMaskFiles}
              maxFiles={1}
            />
            <p className="text-[12px] text-text-secondary mt-2">
              PNG alpha 透明区域 = 需要重绘的区域
            </p>
          </SectionCard>

          <SectionCard title="编辑指令">
            <textarea
              ref={promptRef}
              className="w-full bg-white border border-border rounded-input px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[108px]"
              placeholder="描述你想要做的修改..."
            />
          </SectionCard>

          <SectionCard title="输出参数">
            <div className="flex flex-col gap-3">
              {[
                { id: 'edit-size', label: '尺寸', options: ['auto', '1024x1024', '1024x1536', '1536x1024'], default: 'auto' },
                { id: 'edit-quality', label: '质量', options: ['auto', 'low', 'medium', 'high'], default: 'auto' },
                { id: 'edit-n', label: '数量', options: ['1', '2', '3', '4'], default: '1' },
                { id: 'edit-fidelity', label: '保真度', options: ['low', 'high'], default: 'low' },
                { id: 'edit-background', label: '背景', options: ['auto', 'opaque', 'transparent'], default: 'auto' },
                { id: 'edit-format', label: '格式', options: ['png', 'jpeg', 'webp'], default: 'png' },
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
              onClick={handleEdit}
              disabled={status === 'loading'}
              className="w-full bg-accent hover:bg-accent-hover disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-[11px] rounded-btn transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 size={16} />
              {status === 'loading' ? '处理中...' : '编辑图片'}
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
            <h2 className="text-[22px] font-extrabold text-text-primary">图像编辑</h2>
            <p className="text-[12px] text-text-secondary mt-1">
              上传源图和可选蒙版，再用自然语言描述要修改的内容。
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
