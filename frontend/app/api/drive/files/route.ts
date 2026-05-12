import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google, type drive_v3 } from 'googleapis'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/server/session-token'

function getDriveClient() {
  const raw = process.env.GOOGLE_CREDENTIALS ?? process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    throw new Error('GOOGLE_CREDENTIALS (ou GOOGLE_SERVICE_ACCOUNT_KEY) não configurada')
  }
  const credentials = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const payload = await verifySessionToken(token)
  if (!payload || payload.funcionalidade !== 'administracao geral') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Resolve folder to list:
  // 1. If a folderId query param is provided, use it (folder navigation).
  // 2. Else if DRIVE_ROOT_FOLDER_ID env var is set, use it.
  // 3. Else fall back to "everything shared with the service account",
  //    so a missing root id doesn't break the page.
  const folderId =
    req.nextUrl.searchParams.get('folderId') ?? process.env.DRIVE_ROOT_FOLDER_ID

  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : `sharedWithMe = true and trashed = false`

  try {
    const drive = getDriveClient()
    const allFiles: drive_v3.Schema$File[] = []
    let pageToken: string | undefined

    // Paginate through every page so folders with > pageSize entries
    // are not silently truncated.
    do {
      const res = await drive.files.list({
        q: query,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
        orderBy: 'folder, name',
        pageSize: 1000,
        pageToken,
      })
      if (res.data.files) allFiles.push(...res.data.files)
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return NextResponse.json({ files: allFiles })
  } catch (err) {
    console.error('[Drive] Erro ao listar arquivos:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
