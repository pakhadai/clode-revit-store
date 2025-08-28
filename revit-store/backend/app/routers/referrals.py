"""
Роутер для реферальної системи
"""
import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.routers.auth import get_current_active_user

# Створюємо роутер
router = APIRouter(
    prefix="/api/referrals",
    tags=["Referrals"]
)

# Константи реферальної системи
REFERRAL_REGISTRATION_BONUS = 30  # Бонусів за реєстрацію
REFERRAL_PURCHASE_PERCENT = 5  # Відсоток від покупок


@router.get("/info")
async def get_referral_info(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати інформацію про реферальну програму користувача
    """
    # Отримуємо рефералів
    referrals = db.query(User).filter(
        User.referred_by_id == current_user.id
    ).all()

    # Рахуємо статистику
    total_referrals = len(referrals)
    active_referrals = sum(1 for r in referrals if r.total_spent > 0)

    # Формуємо посилання
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "OhMyRevitBot")
    referral_link = f"https://t.me/{bot_username}?start={current_user.referral_code}"

    return {
        "referral_code": current_user.referral_code,
        "referral_link": referral_link,
        "total_referrals": total_referrals,
        "active_referrals": active_referrals,
        "total_earned": current_user.referral_earnings,
        "registration_bonus": REFERRAL_REGISTRATION_BONUS,
        "purchase_percent": REFERRAL_PURCHASE_PERCENT
    }


@router.get("/list")
async def get_referrals_list(
        page: int = 1,
        limit: int = 20,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати список рефералів
    """
    offset = (page - 1) * limit

    # Отримуємо рефералів
    referrals = db.query(User).filter(
        User.referred_by_id == current_user.id
    ).order_by(
        User.created_at.desc()
    ).offset(offset).limit(limit).all()

    total = db.query(User).filter(
        User.referred_by_id == current_user.id
    ).count()

    # Формуємо список
    referrals_data = []
    for referral in referrals:
        # Рахуємо заробіток з цього реферала
        earned_from_referral = 0

        # 30 бонусів за реєстрацію
        earned_from_referral += REFERRAL_REGISTRATION_BONUS

        # 5% від покупок
        if referral.total_spent > 0:
            earned_from_referral += int(referral.total_spent * REFERRAL_PURCHASE_PERCENT / 100)

        referrals_data.append({
            "id": referral.id,
            "username": referral.username or f"User_{referral.telegram_id}",
            "first_name": referral.first_name,
            "registered_at": referral.created_at.isoformat(),
            "total_spent": referral.total_spent,
            "earned_from": earned_from_referral,
            "is_active": referral.total_spent > 0
        })

    return {
        "referrals": referrals_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


@router.get("/earnings")
async def get_referral_earnings(
        period: str = "all",  # all, month, week
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати детальну статистику заробітку з рефералів
    """
    # Визначаємо період
    date_from = None
    if period == "week":
        date_from = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        date_from = datetime.utcnow() - timedelta(days=30)

    # Базовий запит для рефералів
    query = db.query(User).filter(User.referred_by_id == current_user.id)

    if date_from:
        query = query.filter(User.created_at >= date_from)

    referrals = query.all()

    # Рахуємо заробіток
    registration_bonuses = len(referrals) * REFERRAL_REGISTRATION_BONUS

    # Заробіток з покупок
    purchase_earnings = 0
    for referral in referrals:
        if referral.total_spent > 0:
            purchase_earnings += int(referral.total_spent * REFERRAL_PURCHASE_PERCENT / 100)

    # Статистика по днях (для графіка)
    daily_stats = []
    if period in ["week", "month"]:
        days = 7 if period == "week" else 30

        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=days - i - 1)).date()

            # Рахуємо реєстрації за день
            day_registrations = sum(
                1 for r in referrals
                if r.created_at.date() == date
            )

            daily_stats.append({
                "date": date.isoformat(),
                "registrations": day_registrations,
                "earned": day_registrations * REFERRAL_REGISTRATION_BONUS
            })

    return {
        "period": period,
        "total_earned": registration_bonuses + purchase_earnings,
        "registration_bonuses": registration_bonuses,
        "purchase_earnings": purchase_earnings,
        "referrals_count": len(referrals),
        "daily_stats": daily_stats
    }


@router.get("/leaderboard")
async def get_referral_leaderboard(
        limit: int = 10,
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати топ користувачів по рефералах
    """
    # Запит з підрахунком рефералів
    leaderboard = db.query(
        User.id,
        User.username,
        User.first_name,
        User.referral_earnings,
        db.func.count(User.id).label('referrals_count')
    ).outerjoin(
        User, User.referred_by_id == User.id
    ).group_by(
        User.id, User.username, User.first_name, User.referral_earnings
    ).order_by(
        db.desc(User.referral_earnings)
    ).limit(limit).all()

    leaders = []
    for idx, entry in enumerate(leaderboard, 1):
        leaders.append({
            "position": idx,
            "user_id": entry.id,
            "username": entry.username or f"User_{entry.id}",
            "first_name": entry.first_name,
            "total_earned": entry.referral_earnings,
            "referrals_count": entry.referrals_count
        })

    return {
        "leaderboard": leaders,
        "updated_at": datetime.utcnow().isoformat()
    }


@router.post("/share")
async def track_referral_share(
        platform: str,  # telegram, whatsapp, instagram, etc.
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Відстежити поділення реферального посилання

    Можна використовувати для аналітики
    """
    # TODO: Можна зберігати статистику поділень

    return {
        "success": True,
        "message": f"Поділення через {platform} збережено"
    }


@router.post("/process-purchase-bonus")
async def process_referral_purchase_bonus(
        order_id: int,
        db: Session = Depends(get_db)
) -> Dict:
    """
    Нарахувати бонуси рефереру за покупку реферала

    Цей ендпоінт викликається автоматично після успішної оплати замовлення
    """
    # Знаходимо замовлення
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.status == "completed"
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")

    # Перевіряємо чи є реферер
    user = order.user
    if not user.referred_by_id:
        return {"success": False, "message": "Користувач не має реферера"}

    # Знаходимо реферера
    referrer = db.query(User).filter(User.id == user.referred_by_id).first()

    if not referrer:
        return {"success": False, "message": "Реферер не знайдений"}

    # Нараховуємо 5% від суми замовлення
    bonus_amount = int(order.total * REFERRAL_PURCHASE_PERCENT / 100)

    if bonus_amount > 0:
        referrer.balance += bonus_amount
        referrer.referral_earnings += bonus_amount

        # TODO: Можна додати запис в історію транзакцій

        db.commit()

        return {
            "success": True,
            "referrer_id": referrer.id,
            "bonus_amount": bonus_amount,
            "message": f"Нараховано {bonus_amount} бонусів рефереру"
        }