from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables are loaded from ai-service/.env
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.health import router as health_router
from app.routes.analysis import router as analysis_router

app = FastAPI(
    title="CivicAI AI Intelligence Service",
    description="Microservice providing AI categorization, severity estimation, duplicate detection, and priority scoring for CivicAI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(analysis_router)

@app.get("/")
def root():
    return {
        "service": "CivicAI AI Service",
        "status": "online",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": "/api/v1"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
