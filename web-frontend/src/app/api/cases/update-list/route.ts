import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgName, startPage, endPage } = body

    if (!orgName || !startPage || !endPage) {
      return NextResponse.json(
        { error: 'Missing orgName, startPage or endPage' },
        { status: 400 }
      )
    }

    const resp = await fetch(`${config.backendUrl}/api/v1/cases/update-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName, startPage, endPage })
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Backend error ${resp.status}: ${text}`)
    }

    const data = await resp.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating case list:', error)
    return NextResponse.json(
      { error: 'Failed to update case list' },
      { status: 500 }
    )
  }
}
