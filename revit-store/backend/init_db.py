"""
Скрипт для створення всіх таблиць в БД
Запустіть: python init_db.py
"""

import sys
import os

# Додаємо шлях до проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, init_db

# Імпортуємо всі моделі
from app.models import user, product, order, subscription

print("🔨 Створюю таблиці в базі даних...")

try:
    # Створюємо таблиці
    Base.metadata.create_all(bind=engine)
    print("✅ Всі таблиці створено успішно!")
    print("📁 База даних: ohmyrevit.db")

    # Додаємо тестові дані
    from app.database import SessionLocal
    from app.models.product import Product
    import json

    db = SessionLocal()

    # Перевіряємо чи є продукти
    if db.query(Product).count() == 0:
        # Додаємо тестовий продукт
        test_product = Product(
            sku="TEST001",
            title=json.dumps({"en": "Test Product", "ua": "Тестовий продукт", "ru": "Тестовый продукт"}),
            description=json.dumps({"en": "Test description", "ua": "Тестовий опис", "ru": "Тестовое описание"}),
            category="free",
            product_type="furniture",
            price=0,
            file_url="https://example.com/file.zip",
            is_active=True,
            is_featured=True,
            is_new=True
        )
        db.add(test_product)
        db.commit()
        print("✅ Додано тестовий продукт")

    db.close()

except Exception as e:
    print(f"❌ Помилка: {e}")
    sys.exit(1)