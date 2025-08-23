"""
Модель підписки для OhMyRevit
"""

from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Subscription(Base):
    """Модель підписки користувача"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)

    # Зв'язок з користувачем
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Тип підписки
    plan_type = Column(String(50), nullable=False)  # monthly, yearly
    plan_price = Column(Integer, nullable=False)  # Ціна в центах

    # Термін дії
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    # Оплата
    payment_method = Column(String(50), nullable=True)  # crypto, bonuses
    payment_id = Column(String(255), nullable=True)  # ID транзакції
    payment_status = Column(String(50), default='pending')  # pending, completed, failed

    # Статус
    is_active = Column(Boolean, default=True)
    is_cancelled = Column(Boolean, default=False)  # Чи скасована
    cancelled_at = Column(DateTime, nullable=True)
    auto_renew = Column(Boolean, default=True)  # Автопродовження

    # Привілеї
    daily_spins_bonus = Column(Integer, default=2)  # +2 прокрутки колеса на день
    cashback_percent = Column(Integer, default=5)  # 5% кешбек

    # Архіви доступні по підписці
    # Зберігаємо дату коли архів став доступний під час підписки
    accessible_products = Column(JSON, default=[])  # Список ID продуктів

    # Метадані
    meta = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Відносини
    user = relationship("User", back_populates="subscriptions")

    def __repr__(self):
        return f"<Subscription User:{self.user_id} Plan:{self.plan_type}>"

    def is_valid(self):
        """Перевірка чи дійсна підписка"""
        if not self.is_active:
            return False
        if self.is_cancelled:
            return False
        if datetime.utcnow() > self.expires_at:
            return False
        return self.payment_status == 'completed'

    def days_remaining(self):
        """Скільки днів залишилось"""
        if not self.is_valid():
            return 0
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)

    def renew(self):
        """Продовжити підписку"""
        if self.plan_type == 'monthly':
            self.expires_at = self.expires_at + timedelta(days=30)
        elif self.plan_type == 'yearly':
            self.expires_at = self.expires_at + timedelta(days=365)
        self.is_active = True
        self.is_cancelled = False
        self.cancelled_at = None

    @staticmethod
    def create_subscription(user_id, plan_type):
        """Створити нову підписку"""
        plans = {
            'monthly': {
                'price': 500,  # $5.00
                'days': 30
            },
            'yearly': {
                'price': 5000,  # $50.00 (2 місяці безкоштовно)
                'days': 365
            }
        }

        if plan_type not in plans:
            raise ValueError(f"Invalid plan type: {plan_type}")

        plan = plans[plan_type]

        return Subscription(
            user_id=user_id,
            plan_type=plan_type,
            plan_price=plan['price'],
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=plan['days']),
            is_active=False,  # Активується після оплати
            payment_status='pending'
        )


class SubscriptionHistory(Base):
    """Історія підписок"""
    __tablename__ = "subscription_history"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    subscription_id = Column(Integer, ForeignKey('subscriptions.id'), nullable=False)

    action = Column(String(50), nullable=False)  # created, renewed, cancelled, expired
    details = Column(JSON, default={})

    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<SubscriptionHistory {self.action} for User:{self.user_id}>"


class DailyBonus(Base):
    """Модель щоденних бонусів"""
    __tablename__ = "daily_bonuses"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Стрік система
    day_number = Column(Integer, nullable=False)  # День стріку (1-10)
    bonus_amount = Column(Integer, nullable=False)  # Кількість бонусів

    # Колесо фортуни
    wheel_spins_used = Column(Integer, default=0)  # Використані прокрутки
    wheel_winnings = Column(JSON, default=[])  # Виграші [{amount: 5, timestamp: ...}]

    claimed_at = Column(DateTime, default=datetime.utcnow)

    # Відносини
    user = relationship("User", back_populates="daily_bonuses")

    def __repr__(self):
        return f"<DailyBonus User:{self.user_id} Day:{self.day_number}>"

    @staticmethod
    def get_bonus_amount(day):
        """Отримати кількість бонусів для дня"""
        bonuses = {
            1: 1,
            2: 2,
            3: 3,
            4: 4,
            5: 5,
            6: 7,
            7: 10,
            8: 10,
            9: 10,
            10: 10
        }
        return bonuses.get(min(day, 10), 10)


class WheelSpin(Base):

    __tablename__ = "wheel_spins"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    sector = Column(Integer, nullable=False)
    prize = Column(Integer, nullable=False)
    is_jackpot = Column(Boolean, default=False)

    is_free = Column(Boolean, default=True)
    cost = Column(Integer, default=0)

    spun_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="wheel_spins")

    def __repr__(self):
        return f"<WheelSpin User:{self.user_id} Prize:{self.prize}>"