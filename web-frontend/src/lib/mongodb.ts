import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB connection utility for frontend
let client: MongoClient | null = null;
let db: Db | null = null;

export interface MongoConnectionConfig {
  url: string;
  dbName: string;
  collectionName: string;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_MONGODB_URL || process.env.MONGODB_URL;
    if (!url) {
      throw new Error('MongoDB URL not found in environment variables');
    }
    
    client = new MongoClient(url);
    await client.connect();
  }
  return client;
}

export async function getMongoDb(): Promise<Db> {
  if (!db) {
    const client = await getMongoClient();
    const dbName = process.env.NEXT_PUBLIC_MONGODB_DB || process.env.MONGODB_DB;
    if (!dbName) {
      throw new Error('MongoDB database name not found in environment variables');
    }
    
    db = client.db(dbName);
  }
  return db;
}

export async function getMongoCollection(collectionName?: string): Promise<Collection> {
  const db = await getMongoDb();
  const collName = collectionName || 
                   process.env.NEXT_PUBLIC_MONGODB_COLLECTION || 
                   process.env.MONGODB_COLLECTION ||
                   'pbocdtl';
  
  return db.collection(collName);
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

export async function searchCases(query: SearchQuery): Promise<SearchResult> {
  const collection = await getMongoCollection();
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // Build MongoDB query
  const mongoQuery: any = {};
  // Helper to AND an OR-condition block
  const andOr = (conditions: any[]) => {
    if (!conditions.length) return;
    mongoQuery.$and = mongoQuery.$and || [];
    mongoQuery.$and.push({ $or: conditions });
  };

  // Keyword search across multiple fields
  if (query.keyword) {
    const keywordRegex = new RegExp(query.keyword, 'i');
    mongoQuery.$or = [
      { doc_no: keywordRegex },
      { entity_name: keywordRegex },
      { violation_type: keywordRegex },
      { penalty_content: keywordRegex },
      { agency: keywordRegex },
      { title: keywordRegex },
      { category: keywordRegex },
      { industry: keywordRegex },
      { region: keywordRegex },
      { province: keywordRegex },
      { case_type: keywordRegex },
      { penalty_basis: keywordRegex },
      { penalty_decision: keywordRegex }
    ];
  }

  // Specific field searches
  if (query.docNo) {
    const r = new RegExp(query.docNo, 'i');
    andOr([
      { doc_no: r },
      { document_number: r },
      { decision_number: r },
      { case_number: r },
    ]);
  }
  if (query.entityName) {
    const r = new RegExp(query.entityName, 'i');
    andOr([
      { entity_name: r },
      { entity: r },
      { name: r },
      { company_name: r },
      { enterprise_name: r },
      { org_name: r },
      { party: r },
      { '当事人名称': r },
      { '企业名称': r },
    ]);
  }
  if (query.violationType) {
    const r = new RegExp(query.violationType, 'i');
    andOr([
      { violation_type: r },
      { category: r },
      { 违规类别: r } as any,
    ]);
  }
  if (query.penaltyContent) {
    const r = new RegExp(query.penaltyContent, 'i');
    andOr([
      { penalty_content: r },
      { content: r },
      { 处罚内容: r } as any,
    ]);
  }
  if (query.agency) {
    const r = new RegExp(query.agency, 'i');
    andOr([
      { agency: r },
      { department: r },
      { authority: r },
      { organ: r },
      { 发布机构: r } as any,
      { 处罚机关: r } as any,
    ]);
  }
  if (query.region && query.region !== 'all') {
    const r = new RegExp(query.region, 'i');
    andOr([
      { region: r },
      { province: r },
      { city: r },
      { location: r },
      { 地区: r } as any,
      { 省份: r } as any,
      { 行政区: r } as any,
    ]);
  }
  if (query.province) {
    mongoQuery.province = new RegExp(query.province, 'i');
  }
  if (query.industry) {
    mongoQuery.industry = new RegExp(query.industry, 'i');
  }
  if (query.category) {
    mongoQuery.category = new RegExp(query.category, 'i');
  }
  if (query.caseType) {
    const r = new RegExp(query.caseType, 'i');
    andOr([
      { case_type: r },
      { category: r },
      { 案件类型: r } as any,
      { 案由: r } as any,
    ]);
  }
  if (query.penaltyBasis) {
    const r = new RegExp(query.penaltyBasis, 'i');
    andOr([
      { penalty_basis: r },
      { legal_basis: r },
      { basis: r },
      { 处罚依据: r } as any,
      { 法律依据: r } as any,
    ]);
  }
  if (query.penaltyDecision) {
    const r = new RegExp(query.penaltyDecision, 'i');
    andOr([
      { penalty_decision: r },
      { decision: r },
      { decision_content: r },
      { 处罚决定: r } as any,
      { 行政处罚决定: r } as any,
      { 决定内容: r } as any,
    ]);
  }
  if (query.department) {
    const r = new RegExp(query.department, 'i');
    andOr([
      { agency: r },
      { department: r },
      { authority: r },
      { organ: r },
      { 发布机构: r } as any,
      { 处罚机关: r } as any,
    ]);
  }
  if (query.keywords) {
    const keywordsRegex = new RegExp(query.keywords, 'i');
    if (mongoQuery.$or) {
      // If there's already a keyword search, combine with AND
      mongoQuery.$and = [
        { $or: mongoQuery.$or },
        {
          $or: [
            { doc_no: keywordsRegex },
            { entity_name: keywordsRegex },
            { violation_type: keywordsRegex },
            { penalty_content: keywordsRegex },
            { agency: keywordsRegex },
            { title: keywordsRegex },
            { category: keywordsRegex },
            { industry: keywordsRegex },
            { region: keywordsRegex },
            { province: keywordsRegex },
            { case_type: keywordsRegex },
            { penalty_basis: keywordsRegex },
            { penalty_decision: keywordsRegex }
          ]
        }
      ];
      delete mongoQuery.$or;
    } else {
      mongoQuery.$or = [
        { doc_no: keywordsRegex },
        { entity_name: keywordsRegex },
        { violation_type: keywordsRegex },
        { penalty_content: keywordsRegex },
        { agency: keywordsRegex },
        { title: keywordsRegex },
        { category: keywordsRegex },
        { industry: keywordsRegex },
        { region: keywordsRegex },
        { province: keywordsRegex },
        { case_type: keywordsRegex },
        { penalty_basis: keywordsRegex },
        { penalty_decision: keywordsRegex }
      ];
    }
  }

  // Date range filter across multiple possible fields
  if (query.startDate || query.endDate) {
    const orDates: any[] = [];
    const addRange = (field: string) => {
      const c: any = {};
      c[field] = {};
      if (query.startDate) c[field].$gte = query.startDate;
      if (query.endDate) c[field].$lte = query.endDate;
      orDates.push(c);
    };
    addRange('publish_date');
    addRange('decision_date');
    andOr(orDates);
  }

  // Amount range filter on multiple numeric fields, with fallback to string amount via $convert
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    const orAmount: any[] = [];
    const numericFields = [
      'amount_num',
      'penalty_amount_num',
      'fine_amount',
      'fine_num',
    ];
    for (const f of numericFields) {
      const cond: any = {};
      if (query.minAmount !== undefined || query.maxAmount !== undefined) {
        cond[f] = {};
        if (query.minAmount !== undefined) cond[f].$gte = query.minAmount;
        if (query.maxAmount !== undefined) cond[f].$lte = query.maxAmount;
        orAmount.push(cond);
      }
    }
    // Fallback: string amount -> double via $convert
    const amtExprParts: any[] = [];
    const conv = { $convert: { input: '$amount', to: 'double', onError: null, onNull: null } } as any;
    if (query.minAmount !== undefined) amtExprParts.push({ $gte: [conv, query.minAmount] });
    if (query.maxAmount !== undefined) amtExprParts.push({ $lte: [conv, query.maxAmount] });
    if (amtExprParts.length) {
      orAmount.push({ $expr: { $and: amtExprParts } });
    }
    andOr(orAmount);
  }

  // Get total count
  const total = await collection.countDocuments(mongoQuery);

  // Get paginated results
  const items = await collection
    .find(mongoQuery)
    .project({ _id: 0 })
    .sort({ publish_date: -1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
