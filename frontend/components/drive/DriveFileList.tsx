'use client'

import type { DriveFile } from './DriveExplorer'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

type Props = {
  files: DriveFile[]
  onOpenFolder: (file: DriveFile) => void
  onPreview: (file: DriveFile) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getExtension(name: string) {
  const parts = name.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : ''
}

function FileIcon({ name, isFolder }: { name: string; isFolder: boolean }) {
  if (isFolder) return <span>📁</span>
  const ext = getExtension(name)
  const icons: Record<string, string> = {
    '.pdf':  '📄',
    '.mk':   '📝',
    '.md':   '📝',
    '.json': '🗃️',
    '.xlsx': '📊',
    '.docx': '📃',
    '.pptx': '📊',
    '.png':  '🖼️',
    '.jpg':  '🖼️',
    '.jpeg': '🖼️',
  }
  return <span>{icons[ext] ?? '📎'}</span>
}

export default function DriveFileList({ files, onOpenFolder, onPreview }: Props) {
  if (files.length === 0) {
    return <p className="text-sm text-zinc-500">Pasta vazia.</p>
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {files.map(file => {
        const isFolder = file.mimeType === FOLDER_MIME
        return (
          <li key={file.id}>
            <button
              onClick={() => isFolder ? onOpenFolder(file) : onPreview(file)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
            >
              <FileIcon name={file.name} isFolder={isFolder} />
              <span className="flex-1 text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                {file.name}
              </span>
              <span className="text-xs text-zinc-500 shrink-0">
                {formatDate(file.modifiedTime)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
