import React from 'react'

interface SectionCardProps {
  title: string
  children: React.ReactNode
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="bg-surface border border-border rounded-card-sm px-4 pt-[14px] pb-4">
      <p className="text-[13px] font-extrabold text-text-primary mb-[10px]">
        {title}
      </p>
      {children}
    </div>
  )
}
