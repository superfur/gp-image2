import { ImageCard } from './ImageCard'

interface ImageGridProps {
  images: string[]
  onSave: (b64Json: string, index: number) => void
}

export function ImageGrid({ images, onSave }: ImageGridProps) {
  if (images.length === 0) return null

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: images.length > 1 ? 'repeat(2, 1fr)' : '1fr',
      }}
    >
      {images.map((b64Json, idx) => (
        <ImageCard key={idx} b64Json={b64Json} index={idx} onSave={onSave} />
      ))}
    </div>
  )
}
