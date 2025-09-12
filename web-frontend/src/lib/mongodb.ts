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
    mongoQuery.doc_no = new RegExp(query.docNo, 'i');
  }
  if (query.entityName) {
    mongoQuery.entity_name = new RegExp(query.entityName, 'i');
  }
  if (query.violationType) {
    mongoQuery.violation_type = new RegExp(query.violationType, 'i');
  }
  if (query.penaltyContent) {
    mongoQuery.penalty_content = new RegExp(query.penaltyContent, 'i');
  }
  if (query.agency) {
    mongoQuery.agency = new RegExp(query.agency, 'i');
  }
  if (query.region && query.region !== 'all') {
    mongoQuery.region = query.region;
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
    mongoQuery.case_type = new RegExp(query.caseType, 'i');
  }
  if (query.penaltyBasis) {
    mongoQuery.penalty_basis = new RegExp(query.penaltyBasis, 'i');
  }
  if (query.penaltyDecision) {
    mongoQuery.penalty_decision = new RegExp(query.penaltyDecision, 'i');
  }
  if (query.department) {
    mongoQuery.agency = new RegExp(query.department, 'i');
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

  // Date range filter
  if (query.startDate || query.endDate) {
    mongoQuery.publish_date = {};
    if (query.startDate) {
      mongoQuery.publish_date.$gte = query.startDate;
    }
    if (query.endDate) {
      mongoQuery.publish_date.$lte = query.endDate;
    }
  }

  // Amount range filter
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    mongoQuery.amount_num = {};
    if (query.minAmount !== undefined) {
      mongoQuery.amount_num.$gte = query.minAmount;
    }
    if (query.maxAmount !== undefined) {
      mongoQuery.amount_num.$lte = query.maxAmount;
    }
  }

  // Get total count
  const total = await collection.countDocuments(mongoQuery);

  // Get paginated results
  const items = await collection
    .find(mongoQuery)
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