import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
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

const TEXT_EXTENSIONS = ['.mk', '.md', '.json', '.txt']

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

  const fileId = req.nextUrl.searchParams.get('fileId')
  const fileName = req.nextUrl.searchParams.get('name') ?? ''

  if (!fileId) {
    return NextResponse.json({ error: 'fileId obrigatório' }, { status: 400 })
  }

  const isText = TEXT_EXTENSIONS.some(ext =>
    fileName.toLowerCase().endsWith(ext)
  )

  if (!isText) {
    // Stream through our own proxy so the request is authenticated by the
    // service account, not by the end user's Google session. Drive's native
    // /preview iframe would 403 because the folder is shared only with the
    // service account, not with the logged-in user.
    return NextResponse.json({
      type: 'iframe',
      url: `/api/drive/download?fileId=${encodeURIComponent(fileId)}&disposition=inline`,
    })
  }

  try {
    const drive = getDriveClient()
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    )
    return NextResponse.json({
      type: 'text',
      content: res.data as string,
      fileName,
    })
  } catch (err) {
    console.error('[Drive Preview] Erro ao buscar conteúdo:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
