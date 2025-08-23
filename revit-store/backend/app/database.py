"""
Конфігурація бази даних для OhMyRevit
Використовуємо PostgreSQL
"""

import os
from sqlalchemy import text, create_engine, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Завантажуємо змінні оточення
load_dotenv()

# Формуємо URL для підключення до PostgreSQL з .env файлу
# Переконайтесь, що у вас є .env файл в папці backend/ з цим рядком
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/db")

# Створюємо движок бази даних
engine = create_engine(DATABASE_URL)

# Створюємо фабрику сесій
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Додаємо атрибут func до сесії, щоб виправити помилки в інших файлах
SessionLocal.func = func

# Базовий клас для моделей
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("✅ З'єднання з БД успішне (PostgreSQL)")
        return True
    except Exception as e:
        print(f"❌ Помилка з'єднання з БД (PostgreSQL): {e}")
        return False

def init_db():
    from app.models import user, product, order, subscription
    Base.metadata.create_all(bind=engine)
    print("✅ База даних ініціалізована (PostgreSQL)")