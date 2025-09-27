import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    const url = process.env.MONGODB_URL;
    if (!url) throw new Error('Missing MONGODB_URL env');
    client = new MongoClient(url);
    await client.connect();
  }
  return client;
}

export async function getMongoDb(): Promise<Db> {
  if (!db) {
    const c = await getMongoClient();
    const name = process.env.MONGODB_DB;
    if (!name) throw new Error('Missing MONGODB_DB env');
    db = c.db(name);
  }
  return db;
}

export async function getCollection(name?: string): Promise<Collection> {
  const d = await getMongoDb();
  const coll = name || process.env.MONGODB_COLLECTION || 'pbocdtl';
  return d.collection(coll);
}

export interface SearchQuery {
  keyword?: string;
  docNo?: string;
  entityName?: string;
  violationType?: string;
  penaltyContent?: string;
  agency?: string;
  region?: string;
  province?: string;
  industry?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  caseType?: string;
  penaltyBasis?: string;
  penaltyDecision?: string;
  department?: string;
  keywords?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchCases(q: SearchQuery): Promise<SearchResult> {
  const collection = await getCollection();
  const page = q.page || 1;
  const pageSize = q.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const m: any = {};
  // Helper to AND an OR block of conditions
  const andOr = (conds: any[]) => {
    if (!conds.length) return
    m.$and = m.$and || []
    m.$and.push({ $or: conds })
  }
  if (q.keyword) {
    const r = new RegExp(q.keyword, 'i');
    m.$or = [
      { doc_no: r }, { entity_name: r }, { violation_type: r }, { penalty_content: r },
      { agency: r }, { title: r }, { category: r }, { industry: r }, { region: r },
      { province: r }, { case_type: r }, { penalty_basis: r }, { penalty_decision: r }
    ];
  }
  if (q.docNo) {
    const r = new RegExp(q.docNo, 'i')
    andOr([
      { doc_no: r }, { document_number: r }, { decision_number: r }, { case_number: r },
    ])
  }
  if (q.entityName) {
    const r = new RegExp(q.entityName, 'i')
    andOr([
      { entity_name: r }, { entity: r }, { name: r }, { company_name: r }, { enterprise_name: r },
      { org_name: r }, { party: r }, { ['当事人名称']: r } as any, { ['企业名称']: r } as any,
    ])
  }
  if (q.violationType) {
    const r = new RegExp(q.violationType, 'i')
    andOr([{ violation_type: r }, { category: r }, { ['违规类别']: r } as any])
  }
  if (q.penaltyContent) {
    const r = new RegExp(q.penaltyContent, 'i')
    andOr([{ penalty_content: r }, { content: r }, { ['处罚内容']: r } as any])
  }
  if (q.agency) {
    const r = new RegExp(q.agency, 'i')
    andOr([
      { agency: r }, { department: r }, { authority: r }, { organ: r },
      { ['发布机构']: r } as any, { ['处罚机关']: r } as any,
    ])
  }
  if (q.region && q.region !== 'all') {
    const r = new RegExp(q.region, 'i')
    andOr([
      { region: r }, { province: r }, { city: r }, { location: r },
      { ['地区']: r } as any, { ['省份']: r } as any, { ['行政区']: r } as any,
    ])
  }
  if (q.province) m.province = new RegExp(q.province, 'i');
  if (q.industry) m.industry = new RegExp(q.industry, 'i');
  if (q.category) m.category = new RegExp(q.category, 'i');
  if (q.caseType) {
    const r = new RegExp(q.caseType, 'i')
    andOr([{ case_type: r }, { category: r }, { ['案件类型']: r } as any, { ['案由']: r } as any])
  }
  if (q.penaltyBasis) {
    const r = new RegExp(q.penaltyBasis, 'i')
    andOr([
      { penalty_basis: r }, { legal_basis: r }, { basis: r },
      { ['处罚依据']: r } as any, { ['法律依据']: r } as any,
    ])
  }
  if (q.penaltyDecision) {
    const r = new RegExp(q.penaltyDecision, 'i')
    andOr([
      { penalty_decision: r }, { decision: r }, { decision_content: r },
      { ['处罚决定']: r } as any, { ['行政处罚决定']: r } as any, { ['决定内容']: r } as any,
    ])
  }
  if (q.department) {
    const r = new RegExp(q.department, 'i')
    andOr([
      { agency: r }, { department: r }, { authority: r }, { organ: r },
      { ['发布机构']: r } as any, { ['处罚机关']: r } as any,
    ])
  }
  if (q.keywords) {
    const r = new RegExp(q.keywords, 'i');
    if (m.$or) {
      m.$and = [{ $or: m.$or }, { $or: [
        { doc_no: r }, { entity_name: r }, { violation_type: r }, { penalty_content: r }, { agency: r },
        { title: r }, { category: r }, { industry: r }, { region: r }, { province: r },
        { case_type: r }, { penalty_basis: r }, { penalty_decision: r }
      ] }];
      delete m.$or;
    } else {
      m.$or = [
        { doc_no: r }, { entity_name: r }, { violation_type: r }, { penalty_content: r }, { agency: r },
        { title: r }, { category: r }, { industry: r }, { region: r }, { province: r },
        { case_type: r }, { penalty_basis: r }, { penalty_decision: r }
      ];
    }
  }
  if (q.startDate || q.endDate) {
    const orDates: any[] = []
    const addRange = (field: string) => {
      const c: any = {}
      c[field] = {}
      if (q.startDate) c[field].$gte = q.startDate
      if (q.endDate) c[field].$lte = q.endDate
      orDates.push(c)
    }
    addRange('publish_date')
    addRange('decision_date')
    andOr(orDates)
  }
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    const orAmount: any[] = []
    const numeric = ['amount_num', 'penalty_amount_num', 'fine_amount', 'fine_num']
    for (const f of numeric) {
      const c: any = {}
      c[f] = {}
      if (q.minAmount !== undefined) c[f].$gte = q.minAmount
      if (q.maxAmount !== undefined) c[f].$lte = q.maxAmount
      orAmount.push(c)
    }
    const conv = { $convert: { input: '$amount', to: 'double', onError: null, onNull: null } } as any
    const exprParts: any[] = []
    if (q.minAmount !== undefined) exprParts.push({ $gte: [conv, q.minAmount] })
    if (q.maxAmount !== undefined) exprParts.push({ $lte: [conv, q.maxAmount] })
    if (exprParts.length) orAmount.push({ $expr: { $and: exprParts } })
    andOr(orAmount)
  }

  const total = await collection.countDocuments(m);
  const items = await collection.find(m).project({ _id: 0 }).sort({ publish_date: -1 }).skip(skip).limit(pageSize).toArray();
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
