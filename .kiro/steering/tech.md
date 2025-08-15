# Technology Stack & Build System

## Active Technology Stack

### Backend (Primary)
- **Framework**: FastAPI with Python 3.11+
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens
- **Document Processing**: PyMuPDF, python-docx, pytesseract, opencv-python
- **Web Scraping**: Selenium WebDriver, BeautifulSoup4
- **Data Processing**: pandas, numpy, plotly

### Frontend (Primary) 
- **Framework**: Next.js 15+ with React 19+ and TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS 4+
- **State Management**: React Query (@tanstack/react-query)
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Icons**: Lucide React

### Legacy Components
- **Frontend (Legacy)**: Streamlit-based Python app - **DO NOT USE FOR NEW FEATURES**
- Use `backend/` and `web-frontend/` for all new development

## Development Commands

### Backend Setup & Run
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup & Run
```bash
cd web-frontend
npm install
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check
```

### Quick Health Check
```bash
curl http://localhost:8000/health
```

## Environment Configuration
- Backend: Copy `backend/.env.example` to `backend/.env` and configure:
  - `MONGODB_URL`, `SECRET_KEY`, `TESSERACT_CMD`, `ALLOWED_HOSTS`
- Frontend: Use `web-frontend/.env.local` for local environment variables
- **Never commit secrets or API keys**

## API Documentation
- FastAPI auto-docs available at `http://localhost:8000/docs`
- API routes prefixed with `/api/v1/`

## Deployment
- Docker containers for both frontend and backend
- MongoDB as external service