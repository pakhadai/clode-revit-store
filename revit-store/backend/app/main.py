from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Завантажуємо змінні оточення
load_dotenv()

# Створюємо FastAPI додаток
app = FastAPI(
    title="OhMyRevit API",
    description="API для маркетплейсу архівів Revit - OhMyRevit",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Налаштування CORS (дозволяє запити з фронтенду)
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Базовий ендпоінт для перевірки
@app.get("/")
async def root():
    """Головна сторінка API"""
    return {
        "message": "Welcome to OhMyRevit API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    """Перевірка стану сервера"""
    return {
        "status": "healthy",
        "service": "ohmyrevit-backend"
    }

# Тут будуть підключатися роутери (поки що закоментовано)
# from app.routers import auth, products, users
# app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
# app.include_router(products.router, prefix="/api/products", tags=["Products"])
# app.include_router(users.router, prefix="/api/users", tags=["Users"])