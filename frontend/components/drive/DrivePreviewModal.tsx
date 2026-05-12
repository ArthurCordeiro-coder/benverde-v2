'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { DriveFile } from './DriveExplorer'

type PreviewData =
  | { type: 'iframe'; url: string }
  | { type: 'text'; content: string; fileName: string }
  | { type: 'loading' }
  | { type: 'error'; message: string }

type Props = {
  file: DriveFile
  onClose: () => void
}

export default function DrivePreviewModal({ file, onClose }: Props) {
  const [data, setData] = useState<PreviewData>({ type: 'loading' })

  useEffect(() => {
    fetch(
      `/api/drive/preview?fileId=${file.id}&name=${encodeURIComponent(file.name)}`
    )
      .then(res => res.json())
      .then(json => {
        if (json.error) setData({ type: 'error', message: json.error })
        else setData(json)
      })
      .catch(() =>
        setData({ type: 'error', message: 'Erro ao carregar preview' })
      )
  }, [file.id, file.name])

  const isMarkdown =
    file.name.endsWith('.mk') || file.name.endsWith('.md')
  const isJson = file.name.endsWith('.json')

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <span className="text-sm text-zinc-300 truncate">{file.name}</span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-lg leading-none ml-4 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {data.type === 'loading' && (
            <p className="text-sm text-zinc-400">Carregando preview...</p>
          )}

          {data.type === 'error' && (
            <p className="text-sm text-red-400">{data.message}</p>
          )}

          {data.type === 'iframe' && (
            <iframe
              src={data.url}
              className="w-full h-[70vh] border-0 rounded"
              title={file.name}
            />
          )}

          {data.type === 'text' && isMarkdown && (
            <article className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{data.content}</ReactMarkdown>
            </article>
          )}

          {data.type === 'text' && isJson && (
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words font-mono">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(data.content), null, 2)
                } catch {
                  return data.content
                }
              })()}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
