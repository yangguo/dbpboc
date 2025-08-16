import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
) {
  try {
    const { orgName } = await params
    
    if (!orgName) {
      return NextResponse.json({ error: 'Missing orgName' }, { status: 400 })
    }
    
    // Call the backend API
    const backendUrl = config.backendUrl
    const response = await fetch(`${backendUrl}/api/v1/cases/pending-details/${encodeURIComponent(orgName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching pending details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending details' },
      { status: 500 }
    )
  }
}