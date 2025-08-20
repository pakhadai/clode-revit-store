"""
Сервіс для роботи з бонусами та колесом фортуни
"""

import random
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.subscription import DailyBonus, WheelSpin


class BonusService:
    """
    Сервіс для управління бонусами
    """

    # Конфігурація колеса фортуни
    # 10 секторів: 1 мегабонус (100), 3 пусті, 6 з бонусами
    WHEEL_SECTORS = [
        {"id": 0, "value": 100, "type": "mega", "probability": 0.003, "color": "#FFD700"},  # Золотий
        {"id": 1, "value": 0, "type": "empty", "probability": 0.15, "color": "#9CA3AF"},  # Сірий
        {"id": 2, "value": 1, "type": "bonus", "probability": 0.20, "color": "#3B82F6"},  # Синій
        {"id": 3, "value": 0, "type": "empty", "probability": 0.15, "color": "#9CA3AF"},  # Сірий
        {"id": 4, "value": 3, "type": "bonus", "probability": 0.15, "color": "#10B981"},  # Зелений
        {"id": 5, "value": 0, "type": "empty", "probability": 0.15, "color": "#9CA3AF"},  # Сірий
        {"id": 6, "value": 2, "type": "bonus", "probability": 0.15, "color": "#8B5CF6"},  # Фіолетовий
        {"id": 7, "value": 5, "type": "bonus", "probability": 0.10, "color": "#F59E0B"},  # Жовтий
        {"id": 8, "value": 4, "type": "bonus", "probability": 0.10, "color": "#EF4444"},  # Червоний
        {"id": 9, "value": 1, "type": "bonus", "probability": 0.197, "color": "#EC4899"},  # Рожевий
    ]

    # Бонуси за дні стріку
    STREAK_BONUSES = {
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
        6: 7,
        7: 10,
        8: 10,
        9: 10,
        10: 10,  # Після 10 дня завжди 10 бонусів
    }

    @staticmethod
    def check_daily_bonus_available(user: User) -> bool:
        """
        Перевірка чи доступний щоденний бонус

        Args:
            user: Користувач

        Returns:
            True якщо можна отримати бонус
        """
        if not user.last_daily_bonus:
            return True

        # Перевіряємо чи минуло 24 години
        last_bonus_date = user.last_daily_bonus.date()
        today = datetime.utcnow().date()

        return last_bonus_date < today

    @staticmethod
    def calculate_streak(user: User) -> int:
        """
        Розрахунок поточного стріку

        Args:
            user: Користувач

        Returns:
            Номер дня стріку
        """
        if not user.last_daily_bonus:
            return 1

        last_bonus_date = user.last_daily_bonus.date()
        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)

        # Якщо бонус був вчора - продовжуємо стрік
        if last_bonus_date == yesterday:
            return min(user.daily_streak + 1, 10)  # Максимум 10
        # Якщо сьогодні вже брали - повертаємо поточний
        elif last_bonus_date == today:
            return user.daily_streak
        # Інакше стрік скидається
        else:
            return 1

    @classmethod
    def claim_daily_bonus(cls, user: User, db: Session) -> Dict:
        """
        Отримати щоденний бонус

        Args:
            user: Користувач
            db: Сесія БД

        Returns:
            Інформація про бонус
        """
        # Перевіряємо доступність
        if not cls.check_daily_bonus_available(user):
            raise ValueError("Щоденний бонус вже отримано сьогодні")

        # Розраховуємо стрік
        streak_day = cls.calculate_streak(user)

        # Отримуємо суму бонуса
        bonus_amount = cls.STREAK_BONUSES.get(streak_day, 10)

        # Оновлюємо користувача
        user.daily_streak = streak_day
        user.last_daily_bonus = datetime.utcnow()
        user.balance += bonus_amount

        # Записуємо в історію
        daily_bonus = DailyBonus(
            user_id=user.id,
            day_number=streak_day,
            bonus_amount=bonus_amount,
            claimed_at=datetime.utcnow()
        )
        db.add(daily_bonus)

        # Оновлюємо безкоштовні спіни
        user.free_spins_today = 1  # Базовий 1 спін

        # Якщо є підписка - додаємо ще 2 спіни
        for subscription in user.subscriptions:
            if subscription.is_valid():
                user.free_spins_today += 2
                break

        db.commit()

        return {
            "streak_day": streak_day,
            "bonus_amount": bonus_amount,
            "new_balance": user.balance,
            "free_spins": user.free_spins_today,
            "next_bonus_amount": cls.STREAK_BONUSES.get(min(streak_day + 1, 10), 10)
        }

    @classmethod
    def spin_wheel(cls, user: User, db: Session, is_free: bool = True) -> Dict:
        """
        Крутити колесо фортуни

        Args:
            user: Користувач
            db: Сесія БД
            is_free: Чи це безкоштовний спін

        Returns:
            Результат прокрутки
        """
        # Перевіряємо можливість крутити
        if is_free:
            if user.free_spins_today <= 0:
                raise ValueError("Немає безкоштовних спробок")
            user.free_spins_today -= 1
        else:
            spin_cost = 5  # Вартість платного спіна
            if user.balance < spin_cost:
                raise ValueError(f"Недостатньо бонусів. Потрібно {spin_cost}")
            user.balance -= spin_cost

        # Вибираємо сектор з урахуванням ймовірностей
        sector = cls._select_wheel_sector()

        # Отримуємо приз
        prize = sector["value"]

        # Нараховуємо бонуси якщо виграли
        if prize > 0:
            user.balance += prize

        # Записуємо спін в історію
        wheel_spin = WheelSpin(
            user_id=user.id,
            sector=sector["id"],
            prize=prize,
            is_jackpot=(sector["type"] == "mega"),
            is_free=is_free,
            cost=0 if is_free else 5,
            spun_at=datetime.utcnow()
        )
        db.add(wheel_spin)
        db.commit()

        return {
            "sector": sector["id"],
            "prize": prize,
            "type": sector["type"],
            "color": sector["color"],
            "is_jackpot": sector["type"] == "mega",
            "new_balance": user.balance,
            "free_spins_left": user.free_spins_today
        }

    @classmethod
    def _select_wheel_sector(cls) -> Dict:
        """
        Вибір сектора колеса з урахуванням ймовірностей

        Returns:
            Обраний сектор
        """
        # Генеруємо випадкове число від 0 до 1
        rand = random.random()

        # Проходимо по секторах з накопиченням ймовірностей
        cumulative_prob = 0.0
        for sector in cls.WHEEL_SECTORS:
            cumulative_prob += sector["probability"]
            if rand <= cumulative_prob:
                return sector

        # На всякий випадок повертаємо останній сектор
        return cls.WHEEL_SECTORS[-1]

    @staticmethod
    def get_wheel_statistics(user_id: int, db: Session) -> Dict:
        """
        Отримати статистику колеса для користувача

        Args:
            user_id: ID користувача
            db: Сесія БД

        Returns:
            Статистика
        """
        # Загальна кількість спінів
        total_spins = db.query(WheelSpin).filter(
            WheelSpin.user_id == user_id
        ).count()

        # Кількість виграшів
        wins = db.query(WheelSpin).filter(
            WheelSpin.user_id == user_id,
            WheelSpin.prize > 0
        ).count()

        # Загальний виграш
        total_won = db.query(db.func.sum(WheelSpin.prize)).filter(
            WheelSpin.user_id == user_id
        ).scalar() or 0

        # Кількість джекпотів
        jackpots = db.query(WheelSpin).filter(
            WheelSpin.user_id == user_id,
            WheelSpin.is_jackpot == True
        ).count()

        # Останні 10 спінів
        recent_spins = db.query(WheelSpin).filter(
            WheelSpin.user_id == user_id
        ).order_by(WheelSpin.spun_at.desc()).limit(10).all()

        return {
            "total_spins": total_spins,
            "wins": wins,
            "total_won": total_won,
            "jackpots": jackpots,
            "win_rate": (wins / total_spins * 100) if total_spins > 0 else 0,
            "recent_spins": [
                {
                    "sector": spin.sector,
                    "prize": spin.prize,
                    "is_jackpot": spin.is_jackpot,
                    "date": spin.spun_at.isoformat()
                }
                for spin in recent_spins
            ]
        }

    @staticmethod
    def get_leaderboard(db: Session, limit: int = 10) -> list:
        """
        Отримати топ користувачів по виграшах

        Args:
            db: Сесія БД
            limit: Кількість користувачів

        Returns:
            Список лідерів
        """
        # Запит з групуванням по користувачах
        leaderboard = db.query(
            WheelSpin.user_id,
            db.func.sum(WheelSpin.prize).label('total_won'),
            db.func.count(WheelSpin.id).label('total_spins')
        ).filter(
            WheelSpin.prize > 0
        ).group_by(
            WheelSpin.user_id
        ).order_by(
            db.desc('total_won')
        ).limit(limit).all()

        # Отримуємо інформацію про користувачів
        result = []
        for entry in leaderboard:
            user = db.query(User).filter(User.id == entry.user_id).first()
            if user:
                result.append({
                    "user_id": user.id,
                    "username": user.username or f"User_{user.telegram_id}",
                    "first_name": user.first_name,
                    "total_won": entry.total_won,
                    "total_spins": entry.total_spins
                })

        return result