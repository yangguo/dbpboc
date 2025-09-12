import { NextRequest, NextResponse } from 'next/server';
import { searchCases, SearchQuery } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
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
      minAmount: searchParams.get('min_amount') || searchParams.get('amount_min') ? parseFloat(searchParams.get('min_amount') || searchParams.get('amount_min')!) : undefined,
      maxAmount: searchParams.get('max_amount') || searchParams.get('amount_max') ? parseFloat(searchParams.get('max_amount') || searchParams.get('amount_max')!) : undefined,
      caseType: searchParams.get('case_type') || undefined,
      penaltyBasis: searchParams.get('penalty_basis') || undefined,
      penaltyDecision: searchParams.get('penalty_decision') || undefined,
      department: searchParams.get('department') || undefined,
      keywords: searchParams.get('keywords') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 20,
    };

    // Validate page parameters
    if (query.page && query.page < 1) query.page = 1;
    if (query.pageSize && (query.pageSize < 1 || query.pageSize > 100)) query.pageSize = 20;

    const result = await searchCases(query);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('MongoDB search error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both direct query and filters object
    const filters = body.filters || {};
    
    // Validate and sanitize input
    const query: SearchQuery = {
      keyword: body.keyword || body.q || body.query,
      docNo: body.doc_no || body.docNo || filters.doc_no,
      entityName: body.entity_name || body.entityName || filters.entity_name,
      violationType: body.violation_type || body.violationType,
      penaltyContent: body.penalty_content || body.penaltyContent,
      agency: body.agency,
      region: body.region || filters.region,
      province: body.province,
      industry: body.industry,
      category: body.category,
      startDate: body.start_date || body.startDate || filters.publish_date_start,
      endDate: body.end_date || body.endDate || filters.publish_date_end,
      minAmount: body.min_amount || body.minAmount || (filters.amount_min ? parseFloat(filters.amount_min) : undefined),
      maxAmount: body.max_amount || body.maxAmount || (filters.amount_max ? parseFloat(filters.amount_max) : undefined),
      caseType: body.case_type || body.caseType || filters.case_type,
      penaltyBasis: body.penalty_basis || body.penaltyBasis || filters.penalty_basis,
      penaltyDecision: body.penalty_decision || body.penaltyDecision || filters.penalty_decision,
      department: body.department || filters.department,
      keywords: body.keywords || filters.keywords,
      page: body.page || 1,
      pageSize: body.page_size || body.pageSize || 20,
    };

    // Validate page parameters
    if (query.page && query.page < 1) query.page = 1;
    if (query.pageSize && (query.pageSize < 1 || query.pageSize > 100)) query.pageSize = 20;

    const result = await searchCases(query);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('MongoDB search error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }, { status: 500 });
  }
}