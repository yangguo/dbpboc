import { NextRequest, NextResponse } from 'next/server'
import { searchCases, type SearchQuery } from '@/lib/mongodb'

export const runtime = 'nodejs'

function toNum(v: string | null): number | undefined {
  if (!v) return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query: SearchQuery = {
      keyword: searchParams.get('q') || undefined,
      docNo: searchParams.get('doc_no') || undefined,
      entityName: searchParams.get('entity_name') || undefined,
      violationType: searchParams.get('violation_type') || undefined,
      penaltyContent: searchParams.get('penalty_content') || undefined,
      agency: searchParams.get('agency') || undefined,
      region: searchParams.get('region') || undefined,
      province: searchParams.get('province') || undefined,
      industry: searchParams.get('industry') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('start_date') || searchParams.get('publish_date_start') || undefined,
      endDate: searchParams.get('end_date') || searchParams.get('publish_date_end') || undefined,
      minAmount: toNum(searchParams.get('min_amount') || searchParams.get('amount_min')),
      maxAmount: toNum(searchParams.get('max_amount') || searchParams.get('amount_max')),
      caseType: searchParams.get('case_type') || undefined,
      penaltyBasis: searchParams.get('penalty_basis') || undefined,
      penaltyDecision: searchParams.get('penalty_decision') || undefined,
      department: searchParams.get('department') || undefined,
      keywords: searchParams.get('keywords') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 20,
    }
    if (query.page && query.page < 1) query.page = 1
    if (query.pageSize && (query.pageSize < 1 || query.pageSize > 100)) query.pageSize = 20

    const data = await searchCases(query)
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('mongodb-search GET error', e)
    return NextResponse.json({ success: false, error: e?.message || 'Search failed' }, { status: 500 })
  }
}

