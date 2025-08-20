"""
Скрипт для швидкого створення таблиць без Alembic
Запустіть: python create_tables.py
"""

from app.database import engine, Base
from app.models import user, product, order, subscription

# Створюємо всі таблиці
Base.metadata.create_all(bind=engine)
print("✅ Таблиці створено успішно!")