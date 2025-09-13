import { NextRequest, NextResponse } from 'next/server';
import { searchCases, SearchQuery } from '@/lib/mongodb';

export const runtime = 'nodejs';

function toNum(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = searchParams.get('limit') ? Math.min(10000, Math.max(1, parseInt(searchParams.get('limit')!))) : undefined;
    const format = (searchParams.get('format') || 'csv').toLowerCase();

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
      page: 1,
      pageSize: limit || 2000,
    };

    // 使用 searchCases 以复用过滤逻辑与投影/排序
    const result = await searchCases(query);
    const items = result.items || [];

    if (format === 'json') {
      return NextResponse.json({ success: true, items, count: items.length });
    }

    // CSV 导出
    // Ensure keys are explicitly typed as strings for strict TS
    const keys: string[] = Array.from(items.reduce((s: Set<string>, r: any) => {
      Object.keys(r).forEach(k => s.add(k));
      return s;
    }, new Set<string>()));

    const esc = (val: any) => {
      if (val === null || val === undefined) return '';
      const raw = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const needsQuote = /[",\n]/.test(raw);
      const body = raw.replace(/"/g, '""');
      return needsQuote ? `"${body}"` : body;
    };

    const header = keys.join(',');
    // Explicitly type key as string to avoid "unknown cannot be used as an index type"
    const lines = items.map((row: Record<string, unknown>) =>
      keys.map((k: string) => esc((row as any)[k])).join(',')
    );
    const csv = [header, ...lines].join('\n');

    const ts = new Date();
    const name = `export-${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}.csv`;
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename=${name}`,
      }
    });
  } catch (error) {
    console.error('MongoDB export error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 });
  }
}
