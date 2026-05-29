import { getAuthUrl } from '../../../../lib/google'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
