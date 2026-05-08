'use client'

import type { NavEntry } from './DriveExplorer'

type Props = {
  history: NavEntry[]
  onNavigate: (index: number) => void
}

export default function DriveBreadcrumb({ history, onNavigate }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm text-zinc-400 flex-wrap">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1
        return (
          <span key={entry.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-zinc-600">/</span>}
            {isLast ? (
              <span className="text-white font-medium">{entry.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(i)}
                className="hover:text-white transition-colors"
              >
                {entry.name}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
