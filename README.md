# PBOC Case Management System

A comprehensive web application for managing and analyzing penalty cases from the People's Bank of China (PBOC). This system provides advanced search capabilities, document processing, data visualization, and case management tools for regulatory compliance and research purposes.

## 🚀 Features

- **Case Search & Analysis**: Advanced search functionality with multiple filters and sorting options
- **Document Processing**: Automated OCR and document parsing for case files
- **Data Visualization**: Interactive charts and analytics for case trends and statistics  
- **Multi-Modal Interface**: Modern web frontend and API-first architecture
- **Real-time Updates**: Live data synchronization and updates
- **Mobile Responsive**: Optimized for desktop and mobile devices

## 🏗️ Architecture

The system follows a microservices architecture with clear separation of concerns:

```
├── backend/                 # FastAPI REST API (Active)
├── web-frontend/           # Next.js React Application (Active)  
├── vercel/                 # Lightweight Vercel deployment version
├── frontend/               # Legacy Streamlit app (Deprecated)
└── data/                   # Data processing and storage
```

### Technology Stack

**Backend (FastAPI)**
- Python 3.11+ with FastAPI framework
- MongoDB with Motor async driver  
- Document processing (PyMuPDF, pytesseract, OpenCV)
- Web scraping (Selenium, BeautifulSoup4)
- Data analysis (pandas, numpy, plotly)

**Frontend (Next.js)**
- Next.js 15+ with React 19+ and TypeScript
- shadcn/ui components with Radix UI primitives
- Tailwind CSS 4+ for styling
- React Query for state management
- Recharts for data visualization

**Database**
- MongoDB for primary data storage
- Collections: users, cases, documents, regions

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **MongoDB** 4.4+
- **Git**

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yangguo/dbpboc.git
cd dbpboc
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL, secrets, etc.
```

### 3. Frontend Setup

```bash
cd web-frontend

# Install dependencies  
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your backend URL and other settings
```

### 4. Database Setup

Ensure MongoDB is running and create the required database and collections as specified in your `.env` file.

## 🚀 Development

### Start the Backend API

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Start the Frontend

```bash
cd web-frontend
npm run dev
```

The web application will be available at `http://localhost:3000`

### Development Commands

```bash
# Backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Frontend development
cd web-frontend && npm run dev

# Frontend production build
cd web-frontend && npm run build && npm run start

# Linting (note: may show warnings for existing code)
cd web-frontend && npm run lint

# Quick health check
curl http://localhost:8000/health
```

## 📖 API Documentation

The FastAPI backend provides comprehensive API documentation:

- **Interactive API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Alternative Docs**: `http://localhost:8000/redoc` (ReDoc)
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### Key API Endpoints

- `GET /api/v1/cases` - List and search cases
- `POST /api/v1/cases` - Create new case
- `GET /api/v1/cases/{id}` - Get case details
- `POST /api/v1/documents/upload` - Upload documents
- `GET /api/v1/analytics` - Get analytics data

## 🌐 Deployment

### Production Environment

1. **Backend**: Deploy FastAPI app using Docker or cloud services
2. **Frontend**: Deploy Next.js app to Vercel, Netlify, or similar
3. **Database**: Use MongoDB Atlas or self-hosted MongoDB

### Environment Variables

**Backend (.env)**
```bash
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=pboc_cases
SECRET_KEY=your-secret-key-change-in-production
TESSERACT_CMD=/usr/bin/tesseract
ALLOWED_HOSTS=["http://localhost:3000", "http://127.0.0.1:3000"]
```

**Frontend (.env.local)**
```bash
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=your_database_name
MONGODB_COLLECTION=your_collection_name
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following our coding standards
4. Run tests and linting: `npm run lint`
5. Commit using conventional commits: `git commit -m "feat: add new feature"`
6. Push and create a Pull Request

### Coding Standards

- **Python**: Follow PEP 8, use type hints, 4-space indentation
- **TypeScript**: Follow ESLint config, use PascalCase for components
- **Commits**: Use Conventional Commits format (`feat:`, `fix:`, `chore:`)

### Project Structure Rules

- **Active Development**: Use `backend/` (FastAPI) and `web-frontend/` (Next.js)
- **Legacy Code**: Avoid modifying `frontend/` (Streamlit) - deprecated
- **File Naming**: Use descriptive names, avoid abbreviations
- **API Routes**: Keep under `app/api/v1/`, business logic in `app/services/`

## 📁 Project Structure

```
dbpboc/
├── backend/                    # FastAPI application (ACTIVE)
│   ├── app/
│   │   ├── api/v1/            # API route handlers  
│   │   ├── core/              # Configuration, database, security
│   │   ├── models/            # Pydantic models
│   │   ├── services/          # Business logic layer
│   │   └── utils/             # Utility functions
│   ├── main.py                # FastAPI app entry point
│   ├── requirements.txt       # Python dependencies
│   └── uploads/               # File upload storage
├── web-frontend/              # Next.js application (ACTIVE)
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   ├── components/        # Reusable UI components  
│   │   └── lib/               # Utilities and configurations
│   ├── public/                # Static assets
│   └── package.json           # Node.js dependencies
├── vercel/                    # Lightweight Vercel deployment
├── frontend/                  # Legacy Streamlit app (DEPRECATED)
├── data/                      # Additional datasets
└── .kiro/                     # Project documentation
```

## 📄 License

This project is open source. Please check with the maintainers for licensing details.

## 🔗 Links

- [Project Documentation](.kiro/)
- [API Documentation](http://localhost:8000/docs)
- [Issue Tracker](https://github.com/yangguo/dbpboc/issues)
- [Contributing Guidelines](AGENTS.md)

## 📧 Support

For questions and support:

- Create an [Issue](https://github.com/yangguo/dbpboc/issues)
- Check the [Documentation](.kiro/)
- Review [AGENTS.md](AGENTS.md) for development guidelines

---

**Note**: This system is designed for research and compliance purposes. Ensure proper data handling and privacy compliance when working with regulatory case data.