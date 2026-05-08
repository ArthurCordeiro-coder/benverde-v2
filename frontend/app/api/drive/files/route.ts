import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google, type drive_v3 } from 'googleapis'
import { verifySessionToken } from '@/lib/server/session-token'

function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
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

  const folderId =
    req.nextUrl.searchParams.get('folderId') ?? process.env.DRIVE_ROOT_FOLDER_ID!

  try {
    const drive = getDriveClient()
    const allFiles: drive_v3.Schema$File[] = []
    let pageToken: string | undefined

    // Paginate through every page so folders with > pageSize entries
    // are not silently truncated.
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
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
