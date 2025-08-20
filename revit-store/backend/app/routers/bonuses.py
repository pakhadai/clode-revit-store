"""
Роутер для роботи з бонусами та колесом фортуни
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user_from_token
from app.services.bonus_service import BonusService

# Створюємо роутер
router = APIRouter(
    prefix="/api/bonuses",
    tags=["Bonuses"]
)


# ====== ЩОДЕННІ БОНУСИ ======

@router.get("/daily/status")
async def get_daily_bonus_status(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати статус щоденного бонуса

    Returns:
        Інформація про поточний стрік та доступність бонуса
    """
    can_claim = BonusService.check_daily_bonus_available(current_user)
    current_streak = current_user.daily_streak

    # Наступний бонус
    next_day = min(current_streak + 1, 10) if can_claim else current_streak
    next_bonus = BonusService.STREAK_BONUSES.get(next_day, 10)

    return {
        "can_claim": can_claim,
        "current_streak": current_streak,
        "next_bonus_amount": next_bonus,
        "last_claimed": current_user.last_daily_bonus.isoformat() if current_user.last_daily_bonus else None,
        "streak_bonuses": BonusService.STREAK_BONUSES
    }


@router.post("/daily/claim")
async def claim_daily_bonus(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати щоденний бонус

    Returns:
        Інформація про отриманий бонус

    Raises:
        HTTPException: Якщо бонус вже отримано
    """
    try:
        result = BonusService.claim_daily_bonus(current_user, db)

        return {
            "success": True,
            "message": f"Отримано {result['bonus_amount']} бонусів!",
            "data": result
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        print(f"Помилка при отриманні бонуса: {e}")
        raise HTTPException(
            status_code=500,
            detail="Помилка при нарахуванні бонуса"
        )


# ====== КОЛЕСО ФОРТУНИ ======

@router.get("/wheel/config")
async def get_wheel_config() -> Dict:
    """
    Отримати конфігурацію колеса фортуни

    Returns:
        Інформація про сектори колеса
    """
    return {
        "sectors": BonusService.WHEEL_SECTORS,
        "spin_cost": 5,  # Вартість платного спіна
        "free_spins_daily": 1,  # Базова кількість безкоштовних спінів
        "subscription_bonus_spins": 2  # Додаткові спіни за підписку
    }


@router.get("/wheel/status")
async def get_wheel_status(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати статус колеса для користувача

    Returns:
        Кількість доступних спінів та статистика
    """
    # Отримуємо статистику
    stats = BonusService.get_wheel_statistics(current_user.id, db)

    return {
        "free_spins_available": current_user.free_spins_today,
        "spin_cost": 5,
        "user_balance": current_user.balance,
        "can_buy_spin": current_user.balance >= 5,
        "statistics": stats
    }


@router.post("/wheel/spin")
async def spin_wheel(
        is_free: bool = True,
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Крутити колесо фортуни

    Args:
        is_free: Чи використовувати безкоштовний спін

    Returns:
        Результат прокрутки

    Raises:
        HTTPException: Якщо немає спробок або бонусів
    """
    try:
        result = BonusService.spin_wheel(current_user, db, is_free)

        # Формуємо повідомлення
        if result["prize"] == 0:
            message = "На жаль, цього разу нічого 😔"
        elif result["is_jackpot"]:
            message = f"🎉 ДЖЕКПОТ! Ви виграли {result['prize']} бонусів!"
        else:
            message = f"Вітаємо! Ви виграли {result['prize']} бонусів!"

        return {
            "success": True,
            "message": message,
            "data": result
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        print(f"Помилка при прокрутці колеса: {e}")
        raise HTTPException(
            status_code=500,
            detail="Помилка при прокрутці колеса"
        )


@router.get("/wheel/history")
async def get_wheel_history(
        limit: int = 10,
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати історію прокруток колеса

    Args:
        limit: Кількість записів (максимум 50)

    Returns:
        Історія прокруток
    """
    from app.models.subscription import WheelSpin

    # Обмежуємо limit
    limit = min(limit, 50)

    # Отримуємо історію
    spins = db.query(WheelSpin).filter(
        WheelSpin.user_id == current_user.id
    ).order_by(
        WheelSpin.spun_at.desc()
    ).limit(limit).all()

    return {
        "history": [
            {
                "id": spin.id,
                "sector": spin.sector,
                "prize": spin.prize,
                "is_jackpot": spin.is_jackpot,
                "is_free": spin.is_free,
                "date": spin.spun_at.isoformat()
            }
            for spin in spins
        ],
        "total_count": db.query(WheelSpin).filter(
            WheelSpin.user_id == current_user.id
        ).count()
    }


@router.get("/wheel/leaderboard")
async def get_wheel_leaderboard(
        limit: int = 10,
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати таблицю лідерів колеса фортуни

    Args:
        limit: Кількість користувачів (максимум 100)

    Returns:
        Топ користувачів по виграшах
    """
    # Обмежуємо limit
    limit = min(limit, 100)

    leaderboard = BonusService.get_leaderboard(db, limit)

    return {
        "leaderboard": leaderboard,
        "updated_at": datetime.utcnow().isoformat()
    }


# ====== СТАТИСТИКА ======

@router.get("/statistics")
async def get_bonus_statistics(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати загальну статистику бонусів користувача

    Returns:
        Статистика по всіх типах бонусів
    """
    from app.models.subscription import DailyBonus, WheelSpin

    # Статистика щоденних бонусів
    daily_bonuses_count = db.query(DailyBonus).filter(
        DailyBonus.user_id == current_user.id
    ).count()

    total_daily_bonuses = db.query(
        db.func.sum(DailyBonus.bonus_amount)
    ).filter(
        DailyBonus.user_id == current_user.id
    ).scalar() or 0

    # Статистика колеса
    wheel_stats = BonusService.get_wheel_statistics(current_user.id, db)

    # Рахуємо витрачені бонуси на платні спіни
    paid_spins = db.query(WheelSpin).filter(
        WheelSpin.user_id == current_user.id,
        WheelSpin.is_free == False
    ).count()

    bonuses_spent_on_spins = paid_spins * 5  # 5 бонусів за спін

    return {
        "current_balance": current_user.balance,
        "daily_bonuses": {
            "current_streak": current_user.daily_streak,
            "total_claimed": daily_bonuses_count,
            "total_received": total_daily_bonuses,
            "max_streak": 10  # Максимальний стрік
        },
        "wheel": {
            "total_spins": wheel_stats["total_spins"],
            "total_won": wheel_stats["total_won"],
            "jackpots": wheel_stats["jackpots"],
            "win_rate": wheel_stats["win_rate"],
            "bonuses_spent": bonuses_spent_on_spins
        },
        "referrals": {
            "total_earned": current_user.referral_earnings,
            "referral_code": current_user.referral_code
        },
        "total_earned": total_daily_bonuses + wheel_stats["total_won"] + current_user.referral_earnings
    }


@router.get("/available")
async def get_available_bonuses(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати всі доступні бонуси та акції

    Returns:
        Список доступних бонусів
    """
    available = []

    # Щоденний бонус
    if BonusService.check_daily_bonus_available(current_user):
        next_bonus = BonusService.STREAK_BONUSES.get(
            min(current_user.daily_streak + 1, 10), 10
        )
        available.append({
            "type": "daily_bonus",
            "title": "Щоденний бонус",
            "description": f"Отримайте {next_bonus} бонусів за день {min(current_user.daily_streak + 1, 10)} стріку",
            "action": "claim_daily",
            "icon": "🎁"
        })

    # Безкоштовні спіни
    if current_user.free_spins_today > 0:
        available.append({
            "type": "free_spin",
            "title": "Безкоштовні спроби колеса",
            "description": f"У вас є {current_user.free_spins_today} безкоштовних спробок",
            "action": "spin_wheel",
            "icon": "🎰"
        })

    # Реферальний бонус
    available.append({
        "type": "referral",
        "title": "Запросіть друзів",
        "description": "Отримайте 30 бонусів за кожного запрошеного друга",
        "action": "share_referral",
        "icon": "🤝"
    })

    # Якщо немає підписки - пропонуємо
    has_subscription = False
    for sub in current_user.subscriptions:
        if sub.is_valid():
            has_subscription = True
            break

    if not has_subscription:
        available.append({
            "type": "subscription",
            "title": "Преміум підписка",
            "description": "+2 безкоштовні спіни щодня та 5% кешбек",
            "action": "get_subscription",
            "icon": "⭐"
        })

    return {
        "available_bonuses": available,
        "user_balance": current_user.balance
    }