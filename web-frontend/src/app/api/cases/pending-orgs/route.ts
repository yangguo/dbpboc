import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  try {
    const response = await fetch(`${config.backendUrl}/api/v1/cases/pending-orgs`)
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json({ orgs: data })
  } catch (error) {
    console.error('Error fetching pending orgs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending organizations' },
      { status: 500 }
    )
  }
}
