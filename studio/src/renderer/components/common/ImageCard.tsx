import { Save } from 'lucide-react'

interface ImageCardProps {
  b64Json: string
  index: number
  onSave: (b64Json: string, index: number) => void
}

export function ImageCard({ b64Json, index, onSave }: ImageCardProps) {
  return (
    <div className="bg-surface border border-border rounded-card p-[14px]">
      <div className="flex items-center justify-center min-h-[260px]">
        <img
          src={`data:image/png;base64,${b64Json}`}
          alt={`Image ${index + 1}`}
          className="max-w-full max-h-[360px] object-contain rounded-lg"
        />
      </div>
      <div className="flex items-center mt-3">
        <span className="text-[13px] font-extrabold text-text-primary">
          Image {index + 1}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => onSave(b64Json, index)}
          className="flex items-center gap-1 bg-accent hover:bg-accent-hover text-white font-bold px-3 py-1.5 rounded-btn text-sm transition-colors"
        >
          <Save size={14} />
          保存
        </button>
      </div>
    </div>
  )
}
