"use client"

import { useCallback, useEffect, useState } from 'react'

type SearchResult = {
  items: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type Filters = {
  doc_no: string
  entity_name: string
  case_type: string
  penalty_basis: string
  penalty_decision: string
  publish_date_start: string
  publish_date_end: string
  amount_min: string
  amount_max: string
  department: string
  region: string
}

export default function Home() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Filters>({
    doc_no: '',
    entity_name: '',
    case_type: '',
    penalty_basis: '',
    penalty_decision: '',
    publish_date_start: '',
    publish_date_end: '',
    amount_min: '',
    amount_max: '',
    department: '',
    region: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<SearchResult | null>(null)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ page: '1', page_size: '20' })
    if (q.trim()) params.set('q', q.trim())
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v.toString().trim() !== '') params.set(k, v.toString().trim())
    })
    return params
  }, [q, filters])

  const search = useCallback(async () => {
    // 若无关键词与筛选，清空结果
    const hasFilter = Object.values(filters).some(v => v && v.toString().trim() !== '')
    if (!q.trim() && !hasFilter) { setRes(null); return }
    setLoading(true); setError(null)
    try {
      const params = buildParams()
      const r = await fetch(`/api/mongodb-search?${params}`)
      const data = await r.json()
      if (data.success) setRes(data.data)
      else setError(data.error || '搜索失败')
    } catch (e: any) {
      setError(e?.message || '搜索失败')
    } finally { setLoading(false) }
  }, [q, filters, buildParams])

  const download = useCallback((format: 'csv' | 'json') => {
    const params = buildParams()
    params.set('format', format)
    if (res?.total) {
      const cap = Math.min(10000, res.total)
      params.set('limit', String(cap))
    }
    const url = `/api/mongodb-export?${params.toString()}`
    const a = document.createElement('a')
    a.href = url
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [buildParams, res?.total])

  // 仅对关键词做轻微防抖；筛选项通过按钮触发
  useEffect(() => {
    const t = setTimeout(() => { if (q.trim()) search() }, 400)
    return () => clearTimeout(t)
  }, [q, search])

  const getTitle = useCallback((it: any): string => {
    const pick = (v: any) => (typeof v === 'string' ? v.trim() : '')
    const p = pick(it?.entity_name); if (p) return p
    const aliases = ['company', 'company_name', 'org_name', 'organization', 'enterprise_name', 'name', '单位名称', '企业名称', '当事人名称']
    for (const k of aliases) { const v = pick(it?.[k]); if (v) return v }
    const t = pick(it?.title); if (t) return t
    const doc = pick(it?.doc_no) || pick(it?.document_number); if (doc) return doc
    const agency = pick(it?.agency); const date = pick(it?.decision_date) || pick(it?.publish_date)
    if (agency && date) return `${agency} · ${date}`
    if (agency) return agency
    const cat = pick(it?.category) || pick(it?.case_type)
    return cat || '-'
  }, [])

  return (
    <main className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="card-hdr">
          <div className="card-ttl">MongoDB 搜索</div>
          <div className="card-desc">面向 Vercel 部署的精简版搜索页</div>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => { e.preventDefault(); search() }} className="row">
            <input className="input grow" placeholder="输入关键词，例如：XX公司，违规类型…" value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn" type="submit" disabled={loading}>{loading ? '搜索中…' : '搜索'}</button>
          </form>
          {error && <div style={{ marginTop: 12 }} className="pill" role="alert">{error}</div>}

          {/* 高级筛选 */}
          <div className="sp-4" />
          <div className="grid grid-2">
            <Input label="文号" value={filters.doc_no} onChange={v => setFilters(s => ({ ...s, doc_no: v }))} />
            <Input label="当事人" value={filters.entity_name} onChange={v => setFilters(s => ({ ...s, entity_name: v }))} />
            <Input label="案件类型" value={filters.case_type} onChange={v => setFilters(s => ({ ...s, case_type: v }))} />
            <Input label="处罚依据" value={filters.penalty_basis} onChange={v => setFilters(s => ({ ...s, penalty_basis: v }))} />
            <Input label="处罚决定" value={filters.penalty_decision} onChange={v => setFilters(s => ({ ...s, penalty_decision: v }))} />
            <Input label="处罚机关" value={filters.department} onChange={v => setFilters(s => ({ ...s, department: v }))} />
            <Input label="地区" value={filters.region} onChange={v => setFilters(s => ({ ...s, region: v }))} />

            <div className="card" style={{ padding: 12 }}>
              <div className="muted">发布日期（起止）</div>
              <div className="row" style={{ marginTop: 6 }}>
                <input className="input" type="date" value={filters.publish_date_start} onChange={e => setFilters(s => ({ ...s, publish_date_start: e.target.value }))} />
                <input className="input" type="date" value={filters.publish_date_end} onChange={e => setFilters(s => ({ ...s, publish_date_end: e.target.value }))} />
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="muted">罚款金额（区间）</div>
              <div className="row" style={{ marginTop: 6 }}>
                <input className="input" type="number" placeholder="最小金额" value={filters.amount_min} onChange={e => setFilters(s => ({ ...s, amount_min: e.target.value }))} />
                <input className="input" type="number" placeholder="最大金额" value={filters.amount_max} onChange={e => setFilters(s => ({ ...s, amount_max: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={search} disabled={loading}>{loading ? '应用中…' : '应用筛选'}</button>
            <button className="btn btn-outline" onClick={() => { setQ(''); setFilters({ doc_no:'', entity_name:'', case_type:'', penalty_basis:'', penalty_decision:'', publish_date_start:'', publish_date_end:'', amount_min:'', amount_max:'', department:'', region:'' }); setRes(null); setError(null) }}>清除全部</button>
            <span className="sp-4" />
            <button className="btn btn-secondary" type="button" onClick={() => download('csv')}>下载 CSV</button>
            <button className="btn btn-secondary" type="button" onClick={() => download('json')}>下载 JSON</button>
          </div>
        </div>
      </div>

      {res && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-ttl">搜索结果</div>
            <div className="card-desc">共 {res.total} 条记录</div>
          </div>
          <div className="card-body">
            {/* 结果卡片改为单列显示 */}
            <div className="grid">
              {res.items.map((it, i) => (
                <article key={i} className="card" style={{ borderRadius: 10 }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="card-ttl" style={{ fontSize: 16, wordBreak: 'break-word' }}>{getTitle(it)}</div>
                        <div className="row" style={{ gap: 8, marginTop: 8 }}>
                          {it.doc_no && <span className="badge">文号 {it.doc_no}</span>}
                          {it.case_type && <span className="badge">{it.case_type}</span>}
                          {it.decision_date && <span className="badge">决定日期 {it.decision_date}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {typeof it.amount_num === 'number' && (
                          <div className="danger">¥{Number(it.amount_num).toLocaleString()}</div>
                        )}
                        {(it.publish_date || it.decision_date) && (
                          <div className="muted">{it.publish_date || it.decision_date}</div>
                        )}
                      </div>
                    </div>

                    <div className="sp-4" />

                    <div className="grid grid-2">
                      {it.entity_name && (
                        <Field label="当事人" value={it.entity_name} />
                      )}
                      {it.agency && (
                        <Field label="处罚机关" value={it.agency} />
                      )}
                      {(it.province || it.region) && (
                        <Field label="地区" value={[it.province, it.region].filter(Boolean).join(' - ')} />
                      )}

                      {!(typeof it.amount_num === 'number') && it.amount && (
                        <Field label="罚款金额" value={it.amount ? `¥${it.amount}` : ''} />
                      )}

                      {it.industry && (
                        <Field label="行业" value={it.industry} />
                      )}
                    </div>

                    {it.violation_type && (
                      <Block label="违规类型" value={it.violation_type} />
                    )}
                    {it.penalty_content && (
                      <Block label="处罚内容" value={it.penalty_content} />
                    )}

                    {(() => {
                      const shown = new Set<string>([
                        'doc_no','entity_name','case_type','decision_date','publish_date','amount_num','amount','agency','region','province','industry','violation_type','penalty_content','category','penalty_basis','penalty_decision','case_number','decision_number','link','uid','_id'
                      ])
                      if (it.doc_no) shown.add('document_number')
                      const labelMap: Record<string, string> = {
                        title: '标题', source: '来源', url: '链接', website: '网站',
                        category: '违规类别', doc_no: '文号', document_number: '文号',
                        entity_name: '当事人', case_type: '案件类型', penalty_basis: '处罚依据',
                        penalty_decision: '处罚决定', publish_date: '发布日期', decision_date: '决定日期',
                        amount: '罚款金额', amount_num: '罚款金额', agency: '处罚机关', region: '地区',
                        province: '省份', industry: '行业', case_number: '案件编号', decision_number: '决定书编号',
                        keywords: '关键词'
                      }
                      const additional = Object.entries(it)
                        .filter(([k]) => !shown.has(k))
                        .filter(([k]) => !k.startsWith('_'))
                        .filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                      if (additional.length === 0) return null
                      return (
                        <div className="grid grid-2" style={{ marginTop: 12 }}>
                          {additional.map(([k, v]) => (
                            <Field key={k} label={labelMap[k] || k} value={typeof v === 'object' ? <pre className="mono">{JSON.stringify(v, null, 2)}</pre> : String(v)} />
                          ))}
                        </div>
                      )
                    })()}

                    <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                      <div className="row" style={{ gap: 8 }}>
                        {it.uid && <span className="pill">ID: {String(it.uid).slice(-8)}</span>}
                      </div>
                      {it.link && (
                        <a className="btn btn-outline" href={it.link} target="_blank" rel="noreferrer">查看原文</a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {res.total === 0 && (
              <div className="muted">未找到相关结果</div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

function Field({ label, value }: { label: string, value: any }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="muted">{label}</div>
      <div style={{ marginTop: 4, wordBreak: 'break-word' }}>{value ?? ''}</div>
    </div>
  )
}

function Block({ label, value }: { label: string, value: any }) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  return (
    <div className="card" style={{ padding: 12, borderLeft: '4px solid var(--accent-2)', marginTop: 12 }}>
      <div className="muted">{label}</div>
      <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{typeof value === 'object' ? <pre className="mono">{JSON.stringify(value, null, 2)}</pre> : String(value)}</div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="muted">{label}</div>
      <input className="input" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
