# Project Structure & Organization

## Directory Overview

```
├── backend/                 # FastAPI application (ACTIVE)
│   ├── app/
│   │   ├── api/v1/         # API route handlers
│   │   ├── core/           # Configuration, database, security
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic layer
│   │   └── utils/          # Utility functions
│   ├── main.py             # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── uploads/            # File upload storage
├── web-frontend/           # Next.js application (ACTIVE)
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   ├── components/     # Reusable UI components
│   │   └── lib/            # Utilities and configurations
│   ├── public/             # Static assets
│   └── package.json        # Node.js dependencies
├── frontend/               # Legacy Streamlit app (DEPRECATED)
├── pboc/                   # Data files and CSVs (local only)
├── data/                   # Additional datasets
├── temp/                   # Temporary processing files
├── map/                    # Geographic data and assets
└── .trae/                  # Project documentation
```

## Active Development Areas

### Backend Structure (`backend/`)
- **`app/api/v1/`**: REST API endpoints organized by feature
- **`app/core/`**: Core configurations (database, settings, security)
- **`app/models/`**: Pydantic models for request/response validation
- **`app/services/`**: Business logic separated from API handlers
- **`app/utils/`**: Shared utility functions
- **`main.py`**: FastAPI application factory and middleware setup

### Frontend Structure (`web-frontend/`)
- **`src/app/`**: Next.js 13+ app router pages and layouts
- **`src/components/`**: Reusable React components with shadcn/ui
- **`src/lib/`**: Utility functions, API clients, configurations
- **`public/`**: Static assets (images, icons, etc.)

## File Naming Conventions

### Python (Backend)
- **Modules/Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions/Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`

### TypeScript/React (Frontend)
- **Components**: `PascalCase.tsx` (e.g., `CaseSearchForm.tsx`)
- **Pages**: `page.tsx`, `layout.tsx` (Next.js convention)
- **Utilities**: `camelCase.ts`
- **Types**: `PascalCase` interfaces and types

## Data Organization

### Local Data Files
- **`pboc/`**: Raw CSV files from PBOC scraping (exclude from commits when large)
- **`data/`**: Processed datasets and reference data
- **`temp/`**: Temporary files during processing (gitignored)
- **`backend/uploads/`**: User-uploaded documents

### Database Collections (MongoDB)
- **`users`**: User accounts and permissions
- **`cases`**: Penalty case records
- **`documents`**: Uploaded/processed document metadata
- **`regions`**: PBOC regional branch information

## Development Guidelines

### New Feature Development
1. **Backend**: Add routes in `app/api/v1/`, business logic in `app/services/`
2. **Frontend**: Create components in `src/components/`, pages in `src/app/`
3. **Avoid**: Adding features to legacy `frontend/` directory

### File Organization Rules
- Keep related functionality grouped in modules
- Separate API logic from business logic
- Co-locate related components and utilities
- Use descriptive file names, avoid abbreviations