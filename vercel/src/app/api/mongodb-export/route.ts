import { NextRequest, NextResponse } from 'next/server'
import { getCollection, type SearchQuery } from '@/lib/mongodb'

export const runtime = 'nodejs'

function toNum(v: string | null): number | undefined {
  if (!v) return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

function parseQuery(url: string): SearchQuery & { limit?: number, format?: string } {
  const sp = new URL(url).searchParams
  return {
    keyword: sp.get('q') || undefined,
    docNo: sp.get('doc_no') || undefined,
    entityName: sp.get('entity_name') || undefined,
    violationType: sp.get('violation_type') || undefined,
    penaltyContent: sp.get('penalty_content') || undefined,
    agency: sp.get('agency') || undefined,
    region: sp.get('region') || undefined,
    province: sp.get('province') || undefined,
    industry: sp.get('industry') || undefined,
    category: sp.get('category') || undefined,
    startDate: sp.get('start_date') || sp.get('publish_date_start') || undefined,
    endDate: sp.get('end_date') || sp.get('publish_date_end') || undefined,
    minAmount: toNum(sp.get('min_amount') || sp.get('amount_min')),
    maxAmount: toNum(sp.get('max_amount') || sp.get('amount_max')),
    caseType: sp.get('case_type') || undefined,
    penaltyBasis: sp.get('penalty_basis') || undefined,
    penaltyDecision: sp.get('penalty_decision') || undefined,
    department: sp.get('department') || undefined,
    keywords: sp.get('keywords') || undefined,
    page: 1,
    pageSize: 20,
    // extras
    limit: sp.get('limit') ? Math.min(10000, Math.max(1, parseInt(sp.get('limit')!))) : undefined,
    format: sp.get('format') || undefined,
  } as any
}

function buildFilter(q: SearchQuery): any {
  const m: any = {}
  const andOr = (conds: any[]) => { if (conds.length) { m.$and = m.$and || []; m.$and.push({ $or: conds }) } }
  if (q.keyword) {
    const r = new RegExp(q.keyword, 'i')
    m.$or = [
      { doc_no: r }, { entity_name: r }, { violation_type: r }, { penalty_content: r },
      { agency: r }, { title: r }, { category: r }, { industry: r }, { region: r },
      { province: r }, { case_type: r }, { penalty_basis: r }, { penalty_decision: r }
    ]
  }
  if (q.docNo) { const r = new RegExp(q.docNo, 'i'); andOr([{ doc_no: r }, { document_number: r }, { decision_number: r }, { case_number: r }]) }
  if (q.entityName) {
    const r = new RegExp(q.entityName, 'i')
    andOr([{ entity_name: r }, { entity: r }, { name: r }, { company_name: r }, { enterprise_name: r }, { org_name: r }, { party: r }, { ['当事人名称']: r } as any, { ['企业名称']: r } as any])
  }
  if (q.violationType) { const r = new RegExp(q.violationType, 'i'); andOr([{ violation_type: r }, { category: r }, { ['违规类别']: r } as any]) }
  if (q.penaltyContent) { const r = new RegExp(q.penaltyContent, 'i'); andOr([{ penalty_content: r }, { content: r }, { ['处罚内容']: r } as any]) }
  if (q.agency) { const r = new RegExp(q.agency, 'i'); andOr([{ agency: r }, { department: r }, { authority: r }, { organ: r }, { ['发布机构']: r } as any, { ['处罚机关']: r } as any]) }
  if (q.region && q.region !== 'all') {
    const r = new RegExp(q.region, 'i')
    andOr([{ region: r }, { province: r }, { city: r }, { location: r }, { ['地区']: r } as any, { ['省份']: r } as any, { ['行政区']: r } as any])
  }
  if (q.province) m.province = new RegExp(q.province, 'i')
  if (q.industry) m.industry = new RegExp(q.industry, 'i')
  if (q.category) m.category = new RegExp(q.category, 'i')
  if (q.caseType) { const r = new RegExp(q.caseType, 'i'); andOr([{ case_type: r }, { category: r }, { ['案件类型']: r } as any, { ['案由']: r } as any]) }
  if (q.penaltyBasis) { const r = new RegExp(q.penaltyBasis, 'i'); andOr([{ penalty_basis: r }, { legal_basis: r }, { basis: r }, { ['处罚依据']: r } as any, { ['法律依据']: r } as any]) }
  if (q.penaltyDecision) { const r = new RegExp(q.penaltyDecision, 'i'); andOr([{ penalty_decision: r }, { decision: r }, { decision_content: r }, { ['处罚决定']: r } as any, { ['行政处罚决定']: r } as any, { ['决定内容']: r } as any]) }
  if (q.department) { const r = new RegExp(q.department, 'i'); andOr([{ agency: r }, { department: r }, { authority: r }, { organ: r }, { ['发布机构']: r } as any, { ['处罚机关']: r } as any]) }
  if (q.startDate || q.endDate) {
    const orDates: any[] = []
    const addRange = (field: string) => { const c: any = {}; c[field] = {}; if (q.startDate) c[field].$gte = q.startDate; if (q.endDate) c[field].$lte = q.endDate; orDates.push(c) }
    addRange('publish_date'); addRange('decision_date'); andOr(orDates)
  }
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    const orAmount: any[] = []
    const numeric = ['amount_num', 'penalty_amount_num', 'fine_amount', 'fine_num']
    for (const f of numeric) { const c: any = {}; c[f] = {}; if (q.minAmount !== undefined) c[f].$gte = q.minAmount; if (q.maxAmount !== undefined) c[f].$lte = q.maxAmount; orAmount.push(c) }
    const conv = { $convert: { input: '$amount', to: 'double', onError: null, onNull: null } } as any
    const exprParts: any[] = []
    if (q.minAmount !== undefined) exprParts.push({ $gte: [conv, q.minAmount] })
    if (q.maxAmount !== undefined) exprParts.push({ $lte: [conv, q.maxAmount] })
    if (exprParts.length) orAmount.push({ $expr: { $and: exprParts } })
    andOr(orAmount)
  }
  return m
}

function toCSV(rows: any[]): string {
  if (!rows.length) return ''
  // Collect all keys
  const keys = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s }, new Set<string>()))
  const esc = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    const needs = /[",\n]/.test(s)
    const t = s.replace(/"/g, '""')
    return needs ? `"${t}"` : t
  }
  const header = keys.join(',')
  const lines = rows.map(r => keys.map(k => esc((r as any)[k])).join(','))
  return [header, ...lines].join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const query = parseQuery(req.url)
    const m = buildFilter(query)
    const coll = await getCollection()
    const limit = query.limit ?? 2000
    const items = await coll.find(m).project({ _id: 0 }).sort({ publish_date: -1 }).limit(limit).toArray()

    const format = (query.format || 'csv').toLowerCase()
    if (format === 'json') {
      return NextResponse.json({ success: true, items, count: items.length })
    }

    const csv = toCSV(items)
    const ts = new Date()
    const name = `export-${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}.csv`
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename=${name}`,
      }
    })
  } catch (e: any) {
    console.error('mongodb-export error', e)
    return NextResponse.json({ success: false, error: e?.message || 'Export failed' }, { status: 500 })
  }
}

