import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
) {
  try {
    const { orgName } = await params;
    const decodedOrgName = decodeURIComponent(orgName);
    const response = await fetch(`${config.backendUrl}/api/v1/stats/${decodedOrgName}`);
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization statistics' },
      { status: 500 }
    );
  }
}
