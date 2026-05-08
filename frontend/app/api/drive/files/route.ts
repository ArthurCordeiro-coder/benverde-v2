import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
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
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime, size)',
      orderBy: 'folder, name',
      pageSize: 200,
    })

    return NextResponse.json({ files: res.data.files ?? [] })
  } catch (err) {
    console.error('[Drive] Erro ao listar arquivos:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
