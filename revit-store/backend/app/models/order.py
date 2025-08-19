"""
Модель замовлення для OhMyRevit
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Order(Base):
    """Модель замовлення"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False)  # Унікальний номер замовлення

    # Зв'язок з користувачем
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Суми
    subtotal = Column(Integer, default=0)  # Сума до знижок (в центах)
    discount_amount = Column(Integer, default=0)  # Сума знижки
    bonuses_used = Column(Integer, default=0)  # Використані бонуси
    total = Column(Integer, default=0)  # Фінальна сума

    # Оплата
    payment_method = Column(String(50), nullable=True)  # crypto, bonuses
    payment_status = Column(String(50), default='pending')  # pending, processing, completed, failed, refunded
    payment_id = Column(String(255), nullable=True)  # ID транзакції в платіжній системі

    # Криптовалюта (якщо оплата крипто)
    crypto_currency = Column(String(10), nullable=True)  # BTC, ETH, USDT
    crypto_amount = Column(String(50), nullable=True)  # Сума в крипто
    crypto_address = Column(String(255), nullable=True)  # Адреса для оплати

    # Промокод
    promo_code = Column(String(50), nullable=True)
    promo_discount_percent = Column(Integer, default=0)

    # Email для дублювання
    email = Column(String(255), nullable=True)
    email_sent = Column(Boolean, default=False)

    # Кешбек
    cashback_amount = Column(Integer, default=0)  # Нараховані бонуси кешбеку
    cashback_credited = Column(Boolean, default=False)

    # Статус та дати
    status = Column(String(50), default='pending')  # pending, completed, cancelled
    notes = Column(Text, nullable=True)  # Примітки до замовлення
    metadata = Column(JSON, default={})  # Додаткові дані

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Відносини
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.order_number} - User {self.user_id}>"

    def calculate_total(self):
        """Розрахувати фінальну суму"""
        self.total = max(0, self.subtotal - self.discount_amount - self.bonuses_used)
        return self.total

    def calculate_cashback(self, vip_percent=0):
        """Розрахувати кешбек"""
        base_percent = 5 if self.user and hasattr(self.user, 'has_subscription') else 0
        total_percent = base_percent + vip_percent
        self.cashback_amount = int(self.total * total_percent / 100)
        return self.cashback_amount


class OrderItem(Base):
    """Модель товару в замовленні"""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)

    # Зв'язки
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)

    # Інформація про товар на момент покупки
    product_title = Column(String(255), nullable=False)  # Збережена назва
    product_price = Column(Integer, nullable=False)  # Збережена ціна
    discount_percent = Column(Integer, default=0)  # Знижка на момент покупки
    final_price = Column(Integer, nullable=False)  # Фінальна ціна

    # Статус
    is_downloaded = Column(Boolean, default=False)
    downloaded_at = Column(DateTime, nullable=True)
    download_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Відносини
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem Order:{self.order_id} Product:{self.product_id}>"


class CartItem(Base):
    """Модель товару в кошику"""
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)

    # Зв'язки
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)

    # Дата додавання
    added_at = Column(DateTime, default=datetime.utcnow)

    # Відносини
    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")

    def __repr__(self):
        return f"<CartItem User:{self.user_id} Product:{self.product_id}>"


class PromoCode(Base):
    """Модель промокодів"""
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # Код

    # Тип знижки
    discount_type = Column(String(20), default='percent')  # percent або fixed
    discount_value = Column(Integer, nullable=False)  # Відсоток або фіксована сума

    # Обмеження
    max_uses = Column(Integer, nullable=True)  # Максимальна кількість використань
    uses_count = Column(Integer, default=0)  # Поточна кількість використань
    min_order_amount = Column(Integer, default=0)  # Мінімальна сума замовлення

    # Термін дії
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)

    # Статус
    is_active = Column(Boolean, default=True)

    # Метадані
    description = Column(Text, nullable=True)
    created_by_id = Column(Integer, nullable=True)  # Хто створив
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<PromoCode {self.code}>"

    def is_valid(self):
        """Перевірка чи дійсний промокод"""
        now = datetime.utcnow()

        if not self.is_active:
            return False

        if self.valid_until and now > self.valid_until:
            return False

        if self.valid_from and now < self.valid_from:
            return False

        if self.max_uses and self.uses_count >= self.max_uses:
            return False

        return True