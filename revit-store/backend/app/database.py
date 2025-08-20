"""
Конфігурація бази даних для OhMyRevit
Використовуємо SQLite замість PostgreSQL
"""

import os
from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Використовуємо SQLite замість PostgreSQL
DATABASE_URL = "sqlite:///./ohmyrevit.db"

# Створюємо движок бази даних
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Потрібно для SQLite
)

# Створюємо фабрику сесій
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Базовий клас для моделей
Base = declarative_base()


# Dependency для отримання сесії БД
def get_db():
    """
    Dependency для FastAPI endpoints.
    Створює нову сесію БД для кожного запиту.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Функція для створення всіх таблиць
def init_db():
    """
    Ініціалізація бази даних.
    Створює всі таблиці на основі моделей.
    """
    # Імпортуємо всі моделі щоб Base знав про них
    from app.models import user, product, order, subscription

    Base.metadata.create_all(bind=engine)
    print("✅ База даних ініціалізована (SQLite)")


# Функція для перевірки з'єднання
def check_db_connection():
    """
    Перевірка з'єднання з базою даних
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))  # Додали text()
        db.close()
        print("✅ З'єднання з БД успішне (SQLite)")
        return True
    except Exception as e:
        print(f"❌ Помилка з'єднання з БД: {e}")
        return False