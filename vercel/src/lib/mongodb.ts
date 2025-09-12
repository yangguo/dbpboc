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
  if (q.keyword) {
    const r = new RegExp(q.keyword, 'i');
    m.$or = [
      { doc_no: r }, { entity_name: r }, { violation_type: r }, { penalty_content: r },
      { agency: r }, { title: r }, { category: r }, { industry: r }, { region: r },
      { province: r }, { case_type: r }, { penalty_basis: r }, { penalty_decision: r }
    ];
  }
  if (q.docNo) m.doc_no = new RegExp(q.docNo, 'i');
  if (q.entityName) m.entity_name = new RegExp(q.entityName, 'i');
  if (q.violationType) m.violation_type = new RegExp(q.violationType, 'i');
  if (q.penaltyContent) m.penalty_content = new RegExp(q.penaltyContent, 'i');
  if (q.agency) m.agency = new RegExp(q.agency, 'i');
  if (q.region && q.region !== 'all') m.region = q.region;
  if (q.province) m.province = new RegExp(q.province, 'i');
  if (q.industry) m.industry = new RegExp(q.industry, 'i');
  if (q.category) m.category = new RegExp(q.category, 'i');
  if (q.caseType) m.case_type = new RegExp(q.caseType, 'i');
  if (q.penaltyBasis) m.penalty_basis = new RegExp(q.penaltyBasis, 'i');
  if (q.penaltyDecision) m.penalty_decision = new RegExp(q.penaltyDecision, 'i');
  if (q.department) m.agency = new RegExp(q.department, 'i');
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
    m.publish_date = {};
    if (q.startDate) m.publish_date.$gte = q.startDate;
    if (q.endDate) m.publish_date.$lte = q.endDate;
  }
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    m.amount_num = {};
    if (q.minAmount !== undefined) m.amount_num.$gte = q.minAmount;
    if (q.maxAmount !== undefined) m.amount_num.$lte = q.maxAmount;
  }

  const total = await collection.countDocuments(m);
  const items = await collection.find(m).project({ _id: 0 }).sort({ publish_date: -1 }).skip(skip).limit(pageSize).toArray();
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

