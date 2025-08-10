import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const { org } = await params
    if (!org) {
      return NextResponse.json({ error: 'Missing org' }, { status: 400 })
    }

    const resp = await fetch(
      `${config.backendUrl}/api/v1/stats/${encodeURIComponent(org)}`
    )

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Backend error ${resp.status}: ${text}`)
    }

    const data = await resp.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching org stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization stats' },
      { status: 500 }
    )
  }
}
