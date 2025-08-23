"""
Роутер для системи бонусів та колеса фортуни
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List
from datetime import datetime, timedelta
import random
import json

from app.database import get_db
from app.models.user import User
from app.models.subscription import DailyBonus, WheelSpin
from app.routers.auth import get_current_user_from_token

router = APIRouter(
    prefix="/api/bonuses",
    tags=["Bonuses"]
)

# Стрік бонуси: день -> кількість бонусів
STREAK_BONUSES = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 7,
    7: 10,
    # Після 7 дня завжди 10
}

# Конфігурація колеса фортуни
WHEEL_SECTORS = [
    {"id": 0, "value": 100, "probability": 0.0003, "label": "💎 МЕГАБОНУС"},  # 0.03%
    {"id": 1, "value": 0, "probability": 0.0997, "label": "😕 Пусто"},       # ~10%
    {"id": 2, "value": 0, "probability": 0.1, "label": "😕 Пусто"},           # 10%
    {"id": 3, "value": 0, "probability": 0.1, "label": "😕 Пусто"},           # 10%
    {"id": 4, "value": 1, "probability": 0.15, "label": "🎯 1 бонус"},        # 15%
    {"id": 5, "value": 2, "probability": 0.15, "label": "🎯 2 бонуси"},       # 15%
    {"id": 6, "value": 3, "probability": 0.1, "label": "🎯 3 бонуси"},        # 10%
    {"id": 7, "value": 4, "probability": 0.1, "label": "🎯 4 бонуси"},        # 10%
    {"id": 8, "value": 5, "probability": 0.1, "label": "🎯 5 бонусів"},       # 10%
    {"id": 9, "value": 3, "probability": 0.1, "label": "🎯 3 бонуси"}         # 10%
]

@router.get("/daily")
async def get_daily_bonus_status(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """Отримати статус щоденного бонусу"""

    today = datetime.utcnow().date()

    # Знаходимо останній бонус користувача
    last_bonus = db.query(DailyBonus).filter(
        DailyBonus.user_id == current_user.id
    ).order_by(DailyBonus.claimed_at.desc()).first()

    # Розраховуємо стрік
    current_streak = 1
    can_claim = True
    last_claimed = None

    if last_bonus:
        last_claimed = last_bonus.claimed_at.date()
        days_diff = (today - last_claimed).days

        if days_diff == 0:
            # Вже отримано сьогодні
            can_claim = False
            current_streak = last_bonus.streak_day
        elif days_diff == 1:
            # Продовжуємо стрік
            current_streak = min(last_bonus.streak_day + 1, 7)
        else:
            # Стрік обнулився
            current_streak = 1

    # Розраховуємо бонус
    bonus_amount = STREAK_BONUSES.get(current_streak, 10)

    return {
        "can_claim": can_claim,
        "current_streak": current_streak,
        "bonus_amount": bonus_amount,
        "last_claimed": last_claimed.isoformat() if last_claimed else None,
        "next_reset": (datetime.utcnow().replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat()
    }

@router.post("/daily/claim")
async def claim_daily_bonus(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """Отримати щоденний бонус"""

    # Перевіряємо чи можна отримати
    status = await get_daily_bonus_status(current_user, db)

    if not status["can_claim"]:
        raise HTTPException(
            status_code=400,
            detail="Daily bonus already claimed today"
        )

    # Створюємо запис
    daily_bonus = DailyBonus(
        user_id=current_user.id,
        streak_day=status["current_streak"],
        bonus_amount=status["bonus_amount"],
        claimed_at=datetime.utcnow()
    )
    db.add(daily_bonus)

    # Додаємо бонуси користувачу
    current_user.balance += status["bonus_amount"]

    # Записуємо в історію
    #history = BonusHistory(
    #   user_id=current_user.id,
    #    type="daily",
    #    amount=status["bonus_amount"],
    #    details={"streak_day": status["current_streak"]}
    #)
    #db.add(history)

    db.commit()

    return {
        "success": True,
        "bonus_amount": status["bonus_amount"],
        "new_balance": current_user.balance,
        "streak_day": status["current_streak"],
        "next_bonus": (datetime.utcnow().replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat()
    }

@router.get("/wheel")
async def get_wheel_status(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """Отримати статус колеса фортуни"""

    today = datetime.utcnow().date()

    # Рахуємо спроби за сьогодні
    spins_today = db.query(func.count(WheelSpin.id)).filter(
        WheelSpin.user_id == current_user.id,
        func.date(WheelSpin.spun_at) == today
    ).scalar() or 0

    # Перевіряємо підписку для додаткових спроб
    has_subscription = current_user.has_active_subscription(db)
    free_spins = 3 if has_subscription else 1

    return {
        "sectors": WHEEL_SECTORS,
        "spins_today": spins_today,
        "free_spins_remaining": max(0, free_spins - spins_today),
        "spin_cost": 5,  # бонусів за спробу
        "has_subscription": has_subscription
    }

@router.post("/wheel/spin")
async def spin_wheel(
    use_bonus: bool = False,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """Крутити колесо фортуни"""

    status = await get_wheel_status(current_user, db)

    # Перевіряємо чи є безкоштовні спроби
    if status["free_spins_remaining"] <= 0:
        if not use_bonus:
            raise HTTPException(
                status_code=400,
                detail="No free spins available"
            )

        # Перевіряємо баланс
        if current_user.balance < status["spin_cost"]:
            raise HTTPException(
                status_code=400,
                detail="Insufficient balance for spin"
            )

        # Знімаємо бонуси
        current_user.balance -= status["spin_cost"]

    # Вибираємо сектор з урахуванням вірогідностей
    random_value = random.random()
    cumulative_probability = 0
    selected_sector = WHEEL_SECTORS[-1]

    for sector in WHEEL_SECTORS:
        cumulative_probability += sector["probability"]
        if random_value <= cumulative_probability:
            selected_sector = sector
            break

    # Записуємо спробу
    spin = WheelSpin(
        user_id=current_user.id,
        sector_id=selected_sector["id"],
        prize_amount=selected_sector["value"],
        is_free=status["free_spins_remaining"] > 0,
        spun_at=datetime.utcnow()
    )
    db.add(spin)

    # Додаємо виграш
    if selected_sector["value"] > 0:
        current_user.balance += selected_sector["value"]

        # Записуємо в історію
        #history = BonusHistory(
        #    user_id=current_user.id,
        #    type="wheel",
        #    amount=selected_sector["value"],
        #    details={"sector": selected_sector["label"]}
        #)
        #db.add(history)

    db.commit()

    return {
        "success": True,
        "sector_id": selected_sector["id"],
        "prize": selected_sector["value"],
        "label": selected_sector["label"],
        "new_balance": current_user.balance,
        "is_jackpot": selected_sector["value"] == 100
    }
