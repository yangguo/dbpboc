from fastapi import APIRouter
from .endpoints import cases, documents, stats, attachments, search, downloads, uplink, dashboard, org, pending

api_router = APIRouter()

api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"]) 
api_router.include_router(search.router, prefix="/search", tags=["search"]) 
api_router.include_router(downloads.router, prefix="/downloads", tags=["downloads"]) 
api_router.include_router(uplink.router, prefix="/uplink", tags=["uplink"])
api_router.include_router(pending.router, prefix="/uplink", tags=["uplink"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(org.router, prefix="/org", tags=["org"])
