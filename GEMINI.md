# GEMINI.md - Project Overview

This document provides a comprehensive overview of the PBOC Case Management System, designed to be used as a context for AI-powered development assistance.

## Project Overview

The project is a web application designed for managing and analyzing cases for the People's Bank of China (PBOC). It consists of three main components:

*   **`web-frontend`**: A Next.js application that provides the main user interface for the system. It includes a dashboard for visualizing case statistics, as well as pages for managing cases, documents, and other entities.
*   **`backend`**: A FastAPI application that serves as the backend for the system. It provides a RESTful API for managing cases, documents, and other data, and it also includes a number of data processing and analysis features.
*   **`frontend`**: A Streamlit application that provides a secondary interface for data visualization and analysis.

The system uses MongoDB as its primary database.

## Building and Running

### Web Frontend

To run the web frontend in development mode, use the following commands:

```bash
cd web-frontend
npm install
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Backend

To run the backend server, use the following commands:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000).

### Streamlit Frontend

To run the Streamlit frontend, use the following commands:

```bash
cd frontend
pip install -r requirements.txt
streamlit run app.py
```

The application will be available at [http://localhost:8501](http://localhost:8501).

## Development Conventions

### Code Style

*   **Python**: The Python code in the `backend` and `frontend` directories follows the PEP 8 style guide. The `ruff` linter is used to enforce code style.
*   **TypeScript/JavaScript**: The TypeScript and JavaScript code in the `web-frontend` directory follows the standard Next.js and React conventions. ESLint is used to enforce code style.

### Testing

The project does not currently have any tests.

### Contribution Guidelines

There are no formal contribution guidelines for the project at this time.
