import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgName } = body

    if (!orgName) {
      return NextResponse.json({ error: 'Missing orgName' }, { status: 400 })
    }

    const resp = await fetch(`${config.backendUrl}/api/v1/cases/update-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName })
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Backend error ${resp.status}: ${text}`)
    }

    const data = await resp.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating case details:', error)
    return NextResponse.json(
      { error: 'Failed to update case details' },
      { status: 500 }
    )
  }
}
