import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { verifySessionToken } from '@/lib/server/session-token'

// Force Node runtime (we rely on stream.Readable.toWeb).
export const runtime = 'nodejs'

function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

// Maps native Google Workspace mime types to a sensible export format.
// Picks formats that browsers can render inline when possible (PDF), so the
// same proxy works both for downloads and for iframe previews.
const WORKSPACE_EXPORT: Record<string, { mime: string; ext: string }> = {
  'application/vnd.google-apps.document':     { mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.drawing':      { mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.spreadsheet':  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
  },
}

function sanitizeFileName(name: string): string {
  // Strip characters that would break a Content-Disposition header.
  return name.replace(/[\r\n"]/g, '').slice(0, 200)
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('lumii_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const payload = await verifySessionToken(token)
  if (!payload || payload.funcionalidade !== 'administracao geral') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const fileId = req.nextUrl.searchParams.get('fileId')
  if (!fileId) {
    return NextResponse.json({ error: 'fileId obrigatório' }, { status: 400 })
  }

  const disposition =
    req.nextUrl.searchParams.get('disposition') === 'attachment'
      ? 'attachment'
      : 'inline'

  try {
    const drive = getDriveClient()
    const meta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
    })

    const sourceMime = meta.data.mimeType ?? 'application/octet-stream'
    const baseName = meta.data.name ?? 'arquivo'
    const exportSpec = WORKSPACE_EXPORT[sourceMime]

    let nodeStream: Readable
    let outMime: string
    let outName: string

    if (exportSpec) {
      // Google Workspace native files don't support alt=media; export instead.
      const res = await drive.files.export(
        { fileId, mimeType: exportSpec.mime },
        { responseType: 'stream' },
      )
      nodeStream = res.data as unknown as Readable
      outMime = exportSpec.mime
      outName = `${baseName}.${exportSpec.ext}`
    } else {
      const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      )
      nodeStream = res.data as unknown as Readable
      outMime = sourceMime
      outName = baseName
    }

    const safeName = sanitizeFileName(outName)
    const headers = new Headers({
      'Content-Type': outMime,
      'Content-Disposition': `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'Cache-Control': 'private, no-store',
    })
    if (meta.data.size && !exportSpec) {
      headers.set('Content-Length', meta.data.size)
    }

    // Convert Node Readable to Web ReadableStream so the runtime can stream it.
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream
    return new Response(webStream, { status: 200, headers })
  } catch (err) {
    console.error('[Drive Download] Erro ao baixar arquivo:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
