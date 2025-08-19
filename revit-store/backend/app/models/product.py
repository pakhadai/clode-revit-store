"""
Модель продукту (архіву Revit) для OhMyRevit
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, JSON, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Таблиця для зв'язку many-to-many між користувачами та улюбленими товарами
user_favorites = Table(
    'user_favorites',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('product_id', Integer, ForeignKey('products.id', ondelete='CASCADE'))
)

# Таблиця для зв'язку many-to-many між продуктами та тегами
product_tags = Table(
    'product_tags',
    Base.metadata,
    Column('product_id', Integer, ForeignKey('products.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'))
)


class Product(Base):
    """Модель продукту (архіву Revit)"""
    __tablename__ = "products"

    # Основні поля
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False)  # Унікальний код товару

    # Мультимовні поля (JSON)
    title = Column(JSON, nullable=False)  # {"en": "Title", "ua": "Назва", "ru": "Название"}
    description = Column(JSON, nullable=False)  # {"en": "Description", "ua": "Опис", "ru": "Описание"}

    # Категорія та тип
    category = Column(String(50), nullable=False)  # free, premium, creator
    product_type = Column(String(50), nullable=False)  # furniture, textures, components, etc.

    # Ціна та знижки
    price = Column(Integer, default=0)  # Ціна в центах (0 = безкоштовно)
    discount_percent = Column(Integer, default=0)  # Знижка у відсотках
    discount_ends_at = Column(DateTime, nullable=True)  # Коли закінчується знижка

    # Файли та медіа
    file_url = Column(Text, nullable=False)  # URL архіву на S3
    file_size = Column(Integer, nullable=True)  # Розмір файлу в байтах
    preview_images = Column(JSON, default=[])  # Список URL превʼю зображень

    # Статистика
    downloads_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)  # Середній рейтинг (1-5)
    ratings_count = Column(Integer, default=0)  # Кількість оцінок

    # Статус
    is_active = Column(Boolean, default=True)  # Чи активний товар
    is_featured = Column(Boolean, default=False)  # Чи виділений (популярний)
    is_new = Column(Boolean, default=True)  # Чи новинка
    requires_subscription = Column(Boolean, default=False)  # Чи потрібна підписка

    # Для творців
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    is_approved = Column(Boolean, default=False)  # Чи схвалений адміном
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(Integer, nullable=True)  # ID адміна який схвалив
    rejection_reason = Column(Text, nullable=True)  # Причина відхилення

    # Метадані
    tags = Column(JSON, default=[])  # Список тегів ["modern", "classic", etc.]
    metadata = Column(JSON, default={})  # Додаткова інформація
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    released_at = Column(DateTime, default=datetime.utcnow)  # Дата релізу для підписників

    # Відносини
    creator = relationship("User", back_populates="products")
    favorited_by = relationship("User", secondary=user_favorites, back_populates="favorites")
    order_items = relationship("OrderItem", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product {self.sku}: {self.get_title('en')}>"

    def get_title(self, language='en'):
        """Отримати назву продукту на вибраній мові"""
        if isinstance(self.title, dict):
            return self.title.get(language, self.title.get('en', 'Untitled'))
        return str(self.title)

    def get_description(self, language='en'):
        """Отримати опис продукту на вибраній мові"""
        if isinstance(self.description, dict):
            return self.description.get(language, self.description.get('en', ''))
        return str(self.description)

    def get_current_price(self):
        """Отримати поточну ціну з урахуванням знижки"""
        if self.discount_percent > 0 and self.discount_ends_at:
            if datetime.utcnow() < self.discount_ends_at:
                return int(self.price * (100 - self.discount_percent) / 100)
        return self.price

    def is_free(self):
        """Чи безкоштовний продукт"""
        return self.price == 0

    def can_download(self, user, subscription=None):
        """Чи може користувач завантажити продукт"""
        # Безкоштовні доступні всім
        if self.is_free():
            return True

        # Перевірка чи куплений
        # TODO: Додати перевірку в таблиці покупок

        # Перевірка підписки для преміум товарів
        if self.requires_subscription and subscription:
            # Якщо товар вийшов під час активної підписки
            if subscription.is_active() and self.released_at >= subscription.started_at:
                return True

        return False


class Tag(Base):
    """Модель тегів для продуктів"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(JSON, nullable=False)  # {"en": "Modern", "ua": "Сучасний", "ru": "Современный"}
    slug = Column(String(50), unique=True, nullable=False)  # modern, classic, etc.
    category = Column(String(50), nullable=True)  # style, type, etc.

    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Tag {self.slug}>"