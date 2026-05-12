'use client'

import { useEffect, useState } from 'react'
import DriveBreadcrumb from './DriveBreadcrumb'
import DriveFileList from './DriveFileList'
import DrivePreviewModal from './DrivePreviewModal'

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export type NavEntry = {
  id: string
  name: string
}

type Props = {
  rootFolderId: string
  rootFolderName?: string
}

export default function DriveExplorer({
  rootFolderId,
  rootFolderName = 'Drive',
}: Props) {
  const [history, setHistory] = useState<NavEntry[]>([
    { id: rootFolderId, name: rootFolderName },
  ])
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<DriveFile | null>(null)

  const currentFolder = history[history.length - 1]

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/drive/files?folderId=${currentFolder.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setFiles(data.files)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [currentFolder.id])

  function openFolder(file: DriveFile) {
    setHistory(prev => [...prev, { id: file.id, name: file.name }])
  }

  function navigateTo(index: number) {
    setHistory(prev => prev.slice(0, index + 1))
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <DriveBreadcrumb history={history} onNavigate={navigateTo} />

      {loading && (
        <p className="text-sm text-zinc-400">Carregando...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">Erro: {error}</p>
      )}

      {!loading && !error && (
        <DriveFileList
          files={files}
          onOpenFolder={openFolder}
          onPreview={setPreview}
        />
      )}

      {preview && (
        <DrivePreviewModal
          file={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
