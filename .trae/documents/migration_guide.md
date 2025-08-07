# Migration Guide: Streamlit to Next.js + FastAPI

## Overview
This guide provides step-by-step instructions for migrating the existing Streamlit-based PBOC regulatory penalty analysis system to a modern web application using Next.js for the frontend and FastAPI for the backend.

## Project Structure

```
dbpboc/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── lib/            # Utility functions and configurations
│   │   ├── hooks/          # Custom React hooks
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   ├── core/           # Core configurations
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   └── main.py         # FastAPI application entry point
│   ├── requirements.txt
│   └── Dockerfile
├── shared/                  # Shared configurations and types
├── docker-compose.yml
└── README.md
```

## Phase 1: Backend Migration (FastAPI)

### Step 1: Setup FastAPI Project Structure

1. Create the backend directory structure:
```bash
mkdir -p backend/app/{api,core,models,services,utils}
touch backend/app/__init__.py
touch backend/app/main.py
```

2. Create `backend/requirements.txt`:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.2
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
selenium==4.15.2
webdriver-manager==4.0.1
pytesseract==0.3.10
opencv-python-headless==4.8.1.78
python-docx==1.1.0
PyMuPDF==1.23.8
pdfplumber==0.10.3
requests==2.31.0
beautifulsoup4==4.12.2
pandas==2.1.4
numpy==1.25.2
pillow==10.1.0
python-dotenv==1.0.0
```

### Step 2: Migrate Core Functionality

1. **Database Connection** (`backend/app/core/database.py`):
```python
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "pboc_penalties"
    
    class Config:
        env_file = ".env"

settings = Settings()
client = AsyncIOMotorClient(settings.mongodb_url)
database = client[settings.database_name]
```

2. **Pydantic Models** (`backend/app/models/case.py`):
```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

class CaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    case_number: str
    company_name: str
    penalty_decision_number: Optional[str] = None
    violation_type: Optional[str] = None
    penalty_content: Optional[str] = None
    decision_authority: Optional[str] = None
    region: str
    province: Optional[str] = None
    penalty_date: Optional[datetime] = None
    penalty_amount: Optional[float] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
```

3. **Service Layer** (`backend/app/services/case_service.py`):
```python
from typing import List, Optional
from bson import ObjectId
from ..core.database import database
from ..models.case import CaseModel

class CaseService:
    collection = database.cases
    
    async def get_cases(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        region: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ):
        skip = (page - 1) * limit
        query = {}
        
        if search:
            query["$text"] = {"$search": search}
        if region:
            query["region"] = region
        if start_date and end_date:
            query["penalty_date"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        
        total = await self.collection.count_documents(query)
        cases = await self.collection.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "cases": cases,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    async def create_case(self, case_data: CaseModel):
        result = await self.collection.insert_one(case_data.dict(by_alias=True))
        return await self.collection.find_one({"_id": result.inserted_id})
    
    async def update_case(self, case_id: str, case_data: dict):
        await self.collection.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": case_data}
        )
        return await self.collection.find_one({"_id": ObjectId(case_id)})
```

4. **API Routes** (`backend/app/api/cases.py`):
```python
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.case_service import CaseService
from ..models.case import CaseModel

router = APIRouter(prefix="/cases", tags=["cases"])
case_service = CaseService()

@router.get("/")
async def get_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    region: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    return await case_service.get_cases(page, limit, search, region, start_date, end_date)

@router.post("/")
async def create_case(case: CaseModel):
    return await case_service.create_case(case)

@router.put("/{case_id}")
async def update_case(case_id: str, case_data: dict):
    return await case_service.update_case(case_id, case_data)
```

### Step 3: Migrate Document Processing

1. **Document Service** (`backend/app/services/document_service.py`):
```python
import os
import pytesseract
from PIL import Image
from docx import Document
import pdfplumber
from ..models.document import DocumentModel

class DocumentService:
    def __init__(self):
        self.upload_path = "uploads/"
        os.makedirs(self.upload_path, exist_ok=True)
    
    async def process_document(self, file_path: str, file_type: str) -> str:
        """Extract text from various document types"""
        try:
            if file_type.lower() == 'pdf':
                return self._extract_pdf_text(file_path)
            elif file_type.lower() in ['docx', 'doc']:
                return self._extract_docx_text(file_path)
            elif file_type.lower() in ['jpg', 'jpeg', 'png', 'tiff']:
                return self._extract_image_text(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            raise Exception(f"Document processing failed: {str(e)}")
    
    def _extract_pdf_text(self, file_path: str) -> str:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    
    def _extract_docx_text(self, file_path: str) -> str:
        doc = Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    
    def _extract_image_text(self, file_path: str) -> str:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image, lang='chi_sim')
        return text
```

### Step 4: Migrate Web Scraping

1. **Scraping Service** (`backend/app/services/scraping_service.py`):
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
from typing import List, Dict

class ScrapingService:
    def __init__(self):
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        self.driver = webdriver.Chrome(
            service=webdriver.chrome.service.Service(ChromeDriverManager().install()),
            options=chrome_options
        )
    
    async def scrape_pboc_cases(self, region: str, start_page: int = 1, end_page: int = 1) -> List[Dict]:
        """Scrape cases from PBOC regional websites"""
        cases = []
        
        # Region URL mapping (from original code)
        region_urls = {
            "北京": "http://beijing.pbc.gov.cn/beijing/132030/132052/132059/19192/index",
            "上海": "http://shanghai.pbc.gov.cn/fzhshanghai/113577/114832/114918/14681/index",
            # ... add all other regions
        }
        
        base_url = region_urls.get(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        for page in range(start_page, end_page + 1):
            url = f"{base_url}_{page}.html" if page > 1 else f"{base_url}.html"
            
            try:
                self.driver.get(url)
                time.sleep(2)
                
                # Parse the page content
                soup = BeautifulSoup(self.driver.page_source, 'html.parser')
                page_cases = self._parse_case_list(soup, region)
                cases.extend(page_cases)
                
            except Exception as e:
                print(f"Error scraping page {page}: {str(e)}")
                continue
        
        return cases
    
    def _parse_case_list(self, soup: BeautifulSoup, region: str) -> List[Dict]:
        """Parse individual cases from the page"""
        cases = []
        
        # This would need to be adapted based on the actual HTML structure
        # of each PBOC regional website
        case_elements = soup.find_all('tr')  # Assuming table structure
        
        for element in case_elements[1:]:  # Skip header row
            try:
                cells = element.find_all('td')
                if len(cells) >= 6:  # Minimum expected columns
                    case = {
                        'company_name': cells[0].get_text(strip=True),
                        'penalty_decision_number': cells[1].get_text(strip=True),
                        'violation_type': cells[2].get_text(strip=True),
                        'penalty_content': cells[3].get_text(strip=True),
                        'decision_authority': cells[4].get_text(strip=True),
                        'penalty_date': cells[5].get_text(strip=True),
                        'region': region
                    }
                    cases.append(case)
            except Exception as e:
                print(f"Error parsing case: {str(e)}")
                continue
        
        return cases
    
    def __del__(self):
        if self.driver:
            self.driver.quit()
```

## Phase 2: Frontend Migration (Next.js)

### Step 1: Setup Next.js Project

1. Create the frontend directory:
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app
cd frontend
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install @tanstack/react-query axios
npm install next-auth
```

2. Setup shadcn/ui:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table dialog dropdown-menu
```

### Step 2: Create Core Components

1. **Layout Component** (`frontend/src/components/layout/sidebar.tsx`):
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Search,
  FileText,
  Upload,
  Settings,
  Users,
  Home
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Case Search', href: '/search', icon: Search },
  { name: 'Case Management', href: '/cases', icon: FileText },
  { name: 'Document Processing', href: '/documents', icon: Upload },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Administration', href: '/admin', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">PBOC Analysis</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start text-white hover:bg-gray-800',
                  isActive && 'bg-gray-800'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
```

2. **Case Search Component** (`frontend/src/components/cases/case-search.tsx`):
```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'
import { searchCases } from '@/lib/api'

interface SearchFilters {
  search: string
  region: string
  startDate: string
  endDate: string
}

export function CaseSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    region: '',
    startDate: '',
    endDate: ''
  })
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', filters, page],
    queryFn: () => searchCases({ ...filters, page })
  })

  const handleSearch = () => {
    setPage(1)
    // Query will automatically refetch due to dependency on filters
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search cases..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Input
              placeholder="Region"
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
            />
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <Button onClick={handleSearch} className="mt-4">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error loading cases</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Decision Number</TableHead>
                  <TableHead>Violation Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Penalty Date</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.cases?.map((case_item: any) => (
                  <TableRow key={case_item._id}>
                    <TableCell>{case_item.company_name}</TableCell>
                    <TableCell>{case_item.penalty_decision_number}</TableCell>
                    <TableCell>{case_item.violation_type}</TableCell>
                    <TableCell>{case_item.region}</TableCell>
                    <TableCell>{case_item.penalty_date}</TableCell>
                    <TableCell>{case_item.penalty_amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 3: API Integration

1. **API Client** (`frontend/src/lib/api.ts`):
```typescript
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface SearchCasesParams {
  search?: string
  region?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export const searchCases = async (params: SearchCasesParams) => {
  const response = await apiClient.get('/api/cases', { params })
  return response.data
}

export const createCase = async (caseData: any) => {
  const response = await apiClient.post('/api/cases', caseData)
  return response.data
}

export const updateCase = async (caseId: string, caseData: any) => {
  const response = await apiClient.put(`/api/cases/${caseId}`, caseData)
  return response.data
}

export const uploadDocument = async (file: File, caseId?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  if (caseId) {
    formData.append('case_id', caseId)
  }
  
  const response = await apiClient.post('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
```

## Phase 3: Data Migration

### Step 1: Export Existing Data

1. Create a migration script to export current Streamlit data:
```python
# migration/export_data.py
import pandas as pd
import json
from datetime import datetime
from database import get_collection  # From existing Streamlit app

def export_cases_to_json():
    """Export existing cases to JSON format"""
    collection = get_collection("pboc_penalties", "cases")
    cases = list(collection.find({}))
    
    # Convert ObjectId and datetime to strings
    for case in cases:
        if '_id' in case:
            case['_id'] = str(case['_id'])
        for key, value in case.items():
            if isinstance(value, datetime):
                case[key] = value.isoformat()
    
    with open('exported_cases.json', 'w', encoding='utf-8') as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
    
    print(f"Exported {len(cases)} cases to exported_cases.json")

if __name__ == "__main__":
    export_cases_to_json()
```

### Step 2: Import Data to New System

1. Create an import script for the new FastAPI system:
```python
# migration/import_data.py
import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def import_cases_from_json():
    """Import cases from exported JSON to new MongoDB structure"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["pboc_penalties"]
    collection = db["cases"]
    
    with open('exported_cases.json', 'r', encoding='utf-8') as f:
        cases = json.load(f)
    
    # Transform data to match new schema
    transformed_cases = []
    for case in cases:
        transformed_case = {
            'case_number': case.get('case_number', ''),
            'company_name': case.get('company_name', ''),
            'penalty_decision_number': case.get('penalty_decision_number'),
            'violation_type': case.get('violation_type'),
            'penalty_content': case.get('penalty_content'),
            'decision_authority': case.get('decision_authority'),
            'region': case.get('region', ''),
            'province': case.get('province'),
            'penalty_date': datetime.fromisoformat(case['penalty_date']) if case.get('penalty_date') else None,
            'penalty_amount': case.get('penalty_amount'),
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        transformed_cases.append(transformed_case)
    
    # Insert in batches
    batch_size = 1000
    for i in range(0, len(transformed_cases), batch_size):
        batch = transformed_cases[i:i + batch_size]
        await collection.insert_many(batch)
        print(f"Imported batch {i//batch_size + 1}")
    
    print(f"Successfully imported {len(transformed_cases)} cases")
    client.close()

if __name__ == "__main__":
    asyncio.run(import_cases_from_json())
```

## Phase 4: Deployment

### Step 1: Docker Configuration

1. **Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    libreoffice \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. **Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

3. **Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: pboc-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  backend:
    build: ./backend
    container_name: pboc-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=mongodb://admin:password@mongodb:27017
      - DATABASE_NAME=pboc_penalties
    depends_on:
      - mongodb
    volumes:
      - ./uploads:/app/uploads

  frontend:
    build: ./frontend
    container_name: pboc-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  mongodb_data:
```

## Testing and Validation

### Step 1: Unit Tests

1. **Backend Tests** (`backend/tests/test_case_service.py`):
```python
import pytest
from app.services.case_service import CaseService
from app.models.case import CaseModel

@pytest.mark.asyncio
async def test_create_case():
    service = CaseService()
    case_data = CaseModel(
        case_number="TEST001",
        company_name="Test Company",
        region="北京"
    )
    
    result = await service.create_case(case_data)
    assert result is not None
    assert result["case_number"] == "TEST001"
```

2. **Frontend Tests** (`frontend/src/components/__tests__/case-search.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CaseSearch } from '../cases/case-search'

test('renders case search component', () => {
  const queryClient = new QueryClient()
  
  render(
    <QueryClientProvider client={queryClient}>
      <CaseSearch />
    </QueryClientProvider>
  )
  
  expect(screen.getByText('Search Cases')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Search cases...')).toBeInTheDocument()
})
```

## Deployment Steps

1. **Development Environment**:
```bash
# Start the development environment
docker-compose up -d

# Run database migrations
python migration/import_data.py

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

2. **Production Deployment**:
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose logs -f
```

## Post-Migration Checklist

- [ ] All existing functionality migrated and tested
- [ ] Data integrity verified
- [ ] Performance benchmarks met
- [ ] User authentication working
- [ ] Document processing functional
- [ ] Web scraping operational
- [ ] Analytics and reporting working
- [ ] Mobile responsiveness verified
- [ ] Security measures implemented
- [ ] Backup and monitoring configured

## Maintenance and Updates

1. **Regular Updates**:
   - Update dependencies monthly
   - Monitor security vulnerabilities
   - Review and optimize database queries
   - Update web scraping selectors as needed

2. **Monitoring**:
   - Set up application monitoring (e.g., Sentry)
   - Monitor database performance
   - Track API response times
   - Monitor document processing success rates

3. **Backup Strategy**:
   - Daily database backups
   - Weekly full system backups
   - Test restore procedures monthly

This migration guide provides a comprehensive roadmap for transforming the Streamlit application into a modern, scalable web application using Next.js and FastAPI.