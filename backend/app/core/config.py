from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "DBCSRC Backend API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "localhost"
    PORT: int = 8000
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "PBOC Case Management"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGO_DB_URL: str = "mongodb://localhost:27017"  # Alternative name used in .env
    DATABASE_NAME: str = "pboc_cases"
    
    # OpenAI Settings (for existing functionality)
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # OCR Settings
    TESSERACT_CMD: str = "/usr/bin/tesseract"  # Adjust path as needed
    
    # LLM OCR Settings
    OPENAI_API_KEY: str = ""
    OPENAI_VISION_MODEL: str = "gpt-4-vision-preview"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)