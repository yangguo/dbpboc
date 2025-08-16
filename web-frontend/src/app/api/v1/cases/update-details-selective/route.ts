import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgName } = body

    if (!orgName) {
      return NextResponse.json({ error: 'Missing orgName' }, { status: 400 })
    }
    
    // Call the backend API
    const backendUrl = config.backendUrl
    const response = await fetch(`${backendUrl}/api/v1/cases/update-details-selective`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Backend error ${response.status}: ${text}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating details selectively:', error)
    return NextResponse.json(
      { error: 'Failed to update details selectively' },
      { status: 500 }
    )
  }
}