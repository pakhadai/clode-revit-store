"""
Головний файл FastAPI додатку OhMyRevit
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Завантажуємо змінні оточення
load_dotenv()

# Імпортуємо роутери
from app.routers import auth, products, bonuses, orders, subscriptions, referrals, creators, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Функція для ініціалізації при запуску та очищення при зупинці
    """
    # Startup
    print("🚀 Запуск OhMyRevit API...")

    # Ініціалізуємо базу даних
    from app.database import init_db, check_db_connection

    # Перевіряємо з'єднання з БД
    if check_db_connection():
        print("✅ База даних підключена")
        # Створюємо таблиці якщо їх немає
        init_db()
    else:
        print("❌ Не вдалося підключитися до БД")

    yield

    # Shutdown
    print("👋 Зупинка OhMyRevit API...")


# Створюємо FastAPI додаток
app = FastAPI(
    title="OhMyRevit API",
    description="API для маркетплейсу архівів Revit - OhMyRevit",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Налаштування CORS (дозволяє запити з фронтенду)
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Можна змінити на ["*"] для всіх доменів
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====== БАЗОВІ ЕНДПОІНТИ ======

@app.get("/")
async def root():
    """Головна сторінка API"""
    return {
        "message": "Welcome to OhMyRevit API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/api/health")
async def health_check():
    """Перевірка стану сервера"""
    from app.database import check_db_connection

    db_status = "healthy" if check_db_connection() else "unhealthy"

    return {
        "status": "healthy",
        "service": "ohmyrevit-backend",
        "database": db_status,
        "version": "1.0.0"
    }


# ====== ПІДКЛЮЧЕННЯ РОУТЕРІВ ======
app.include_router(auth.router, tags=["Auth"])
app.include_router(bonuses.router, tags=["Bonuses"])
app.include_router(products.router, tags=["Products"])
app.include_router(orders.router, tags=["Orders"])
app.include_router(subscriptions.router, tags=["Subscriptions"])
app.include_router(referrals.router, tags=["Referrals"])
app.include_router(creators.router, tags=["Creators"])
app.include_router(admin.router, tags=["Admin"])



# TODO: Додати інші роутери коли вони будуть готові
# app.include_router(users.router, tags=["Users"])



# ====== ОБРОБКА ПОМИЛОК ======

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Обробка 404 помилок"""
    return JSONResponse( # <--- ВИКОРИСТОВУЙТЕ JSONResponse
        status_code=404,
        content={
            "error": "Not Found",
            "message": "Сторінку не знайдено",
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Обробка 500 помилок"""
    return JSONResponse( # <--- ВИКОРИСТОВУЙТЕ JSONResponse
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "Внутрішня помилка сервера",
        }
    )


# ====== STARTUP MESSAGE ======

if __name__ == "__main__":
    import uvicorn

    print("""
    ╔══════════════════════════════════════╗
    ║         OhMyRevit API v1.0.0         ║
    ║   Маркетплейс архівів Revit          ║
    ╚══════════════════════════════════════╝
    """)

    # Запускаємо сервер
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Автоперезапуск при змінах коду
    )