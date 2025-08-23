"""
Модель користувача OhMyRevit
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """Модель користувача"""
    __tablename__ = "users"

    # Основні поля
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    photo_url = Column(Text, nullable=True)  # URL фото профілю з Telegram

    # Налаштування
    language = Column(String(10), default="en")  # en, ua, ru
    theme = Column(String(10), default="light")  # light, dark
    notifications_enabled = Column(Boolean, default=True)

    # Баланс та статус
    balance = Column(Integer, default=0)  # Бонуси
    vip_level = Column(Integer, default=0)  # 0: none, 1: bronze, 2: silver, 3: gold, 4: diamond
    total_spent = Column(Integer, default=0)  # Загальна сума покупок (в центах)

    # Ролі
    is_creator = Column(Boolean, default=False)  # Чи є творцем
    is_admin = Column(Boolean, default=False)  # Чи є адміном
    is_blocked = Column(Boolean, default=False)  # Чи заблокований

    # Реферальна система
    referral_code = Column(String(20), unique=True, nullable=True)
    referred_by_id = Column(Integer, nullable=True)  # ID користувача який запросив
    referral_earnings = Column(Integer, default=0)  # Заробіток з рефералів

    # Щоденні бонуси
    daily_bonuses = relationship("DailyBonus", back_populates="user")
    wheel_spins = relationship("WheelSpin", back_populates="user")
    #bonus_history = relationship("BonusHistory", back_populates="user")
    daily_streak = Column(Integer, default=0)  # Поточний стрік
    last_daily_bonus = Column(DateTime, nullable=True)  # Остання дата отримання
    free_spins_today = Column(Integer, default=1)  # Безкоштовні прокрутки колеса

    # Безпека
    pin_code = Column(String(100), nullable=True)  # Хешований PIN-код
    two_factor_enabled = Column(Boolean, default=False)

    # Додаткова інформація
    email = Column(String(255), nullable=True)  # Опціональний email
    creator_bio = Column(Text, nullable=True)  # Опис для творців
    creator_verified = Column(Boolean, default=False)  # Чи підтверджений творець

    # Метадані
    settings = Column(JSON, default={})  # Додаткові налаштування
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)

    # Відносини
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="creator")  # Продукти створені користувачем
    favorites = relationship("Product", secondary="user_favorites", back_populates="favorited_by")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    #notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username or self.first_name} (TG: {self.telegram_id})>"

    def get_full_name(self):
        """Отримати повне ім'я користувача"""
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) if parts else self.username or f"User_{self.telegram_id}"

    def get_vip_level_name(self):
        """Отримати назву VIP рівня"""
        levels = {
            0: "None",
            1: "Bronze 🥉",
            2: "Silver 🥈",
            3: "Gold 🥇",
            4: "Diamond 💎"
        }
        return levels.get(self.vip_level, "None")

    def get_cashback_percent(self):
        """Отримати відсоток кешбеку відповідно до VIP рівня"""
        cashback = {
            0: 0,
            1: 3,  # Bronze
            2: 5,  # Silver
            3: 7,  # Gold
            4: 10  # Diamond
        }
        return cashback.get(self.vip_level, 0)

    def update_vip_level(self):
        """Оновити VIP рівень на основі total_spent"""
        # Суми в доларах (конвертуємо центи в долари)
        spent_usd = self.total_spent / 100

        if spent_usd >= 5000:
            self.vip_level = 4  # Diamond
        elif spent_usd >= 1000:
            self.vip_level = 3  # Gold
        elif spent_usd >= 500:
            self.vip_level = 2  # Silver
        elif spent_usd >= 100:
            self.vip_level = 1  # Bronze
        else:
            self.vip_level = 0  # None

    def has_active_subscription(self, db: "Session") -> bool:  # <--- Додайте цей метод
        """Перевіряє, чи є у користувача активна підписка."""
        for sub in self.subscriptions:
            if sub.is_valid():
                return True
        return False

class CreatorApplication(Base):
    __tablename__ = "creator_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    portfolio_url = Column(Text, nullable=True)
    about_me = Column(Text, nullable=False)
    status = Column(String(50), default='pending')  # pending, approved, rejected
    review_notes = Column(Text, nullable=True) # Коментар адміна
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="creator_applications")


# Тепер потрібно додати зворотній зв'язок в основну модель User
User.creator_applications = relationship("CreatorApplication", back_populates="user", cascade="all, delete-orphan")