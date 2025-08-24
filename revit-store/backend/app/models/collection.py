"""
Моделі для Колекцій користувачів
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

# Таблиця зв'язку many-to-many між колекціями та продуктами
collection_products = Table(
    'collection_products',
    Base.metadata,
    Column('collection_id', Integer, ForeignKey('collections.id', ondelete="CASCADE"), primary_key=True),
    Column('product_id', Integer, ForeignKey('products.id', ondelete="CASCADE"), primary_key=True)
)

class Collection(Base):
    """Модель Колекції користувача"""
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    icon = Column(String(10), default="🤍")
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False) # Для майбутньої можливості ділитися колекціями

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Зв'язки
    user = relationship("User", back_populates="collections")
    products = relationship("Product", secondary=collection_products, back_populates="collections")

    def __repr__(self):
        return f"<Collection {self.id}: {self.name}>"