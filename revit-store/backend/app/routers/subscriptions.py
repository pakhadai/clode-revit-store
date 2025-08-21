"""
Роутер для роботи з підписками
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionHistory
from app.routers.auth import get_current_user_from_token
from app.services.payment_service import PaymentService

# Створюємо роутер
router = APIRouter(
    prefix="/api/subscriptions",
    tags=["Subscriptions"]
)

# Ініціалізуємо платіжний сервіс
payment_service = PaymentService()


# ====== ПЛАНИ ПІДПИСОК ======

@router.get("/plans")
async def get_subscription_plans(
        language: str = Query("en", description="Мова: en, ua, ru")
) -> Dict:
    """
    Отримати доступні плани підписок

    Args:
        language: Мова для локалізації

    Returns:
        Список планів з перевагами
    """
    plans = {
        "monthly": {
            "id": "monthly",
            "name": {
                "en": "Monthly Premium",
                "ua": "Місячна Premium",
                "ru": "Месячная Premium"
            },
            "description": {
                "en": "Get full access for 30 days",
                "ua": "Отримайте повний доступ на 30 днів",
                "ru": "Получите полный доступ на 30 дней"
            },
            "price": 500,  # В центах
            "price_display": "$5.00",
            "currency": "USD",
            "duration_days": 30,
            "benefits": {
                "en": [
                    "Access to new premium archives",
                    "+2 wheel spins daily",
                    "5% cashback in bonuses",
                    "Priority support",
                    "Exclusive discounts"
                ],
                "ua": [
                    "Доступ до нових преміум архівів",
                    "+2 прокрутки колеса щодня",
                    "5% кешбек бонусами",
                    "Пріоритетна підтримка",
                    "Ексклюзивні знижки"
                ],
                "ru": [
                    "Доступ к новым премиум архивам",
                    "+2 прокрутки колеса в день",
                    "5% кэшбэк бонусами",
                    "Приоритетная поддержка",
                    "Эксклюзивные скидки"
                ]
            },
            "badge": {
                "en": "POPULAR",
                "ua": "ПОПУЛЯРНЕ",
                "ru": "ПОПУЛЯРНОЕ"
            },
            "color": "blue"
        },
        "yearly": {
            "id": "yearly",
            "name": {
                "en": "Yearly Premium",
                "ua": "Річна Premium",
                "ru": "Годовая Premium"
            },
            "description": {
                "en": "Get full access for 365 days (Save 2 months!)",
                "ua": "Отримайте повний доступ на 365 днів (Економія 2 місяці!)",
                "ru": "Получите полный доступ на 365 дней (Экономия 2 месяца!)"
            },
            "price": 5000,  # В центах
            "price_display": "$50.00",
            "currency": "USD",
            "duration_days": 365,
            "benefits": {
                "en": [
                    "All monthly benefits",
                    "Save $10 (2 months free)",
                    "Annual exclusive content",
                    "Early access to new features",
                    "VIP status boost"
                ],
                "ua": [
                    "Всі переваги місячної підписки",
                    "Економія $10 (2 місяці безкоштовно)",
                    "Річний ексклюзивний контент",
                    "Ранній доступ до нових функцій",
                    "Прискорення VIP статусу"
                ],
                "ru": [
                    "Все преимущества месячной подписки",
                    "Экономия $10 (2 месяца бесплатно)",
                    "Годовой эксклюзивный контент",
                    "Ранний доступ к новым функциям",
                    "Ускорение VIP статуса"
                ]
            },
            "badge": {
                "en": "BEST VALUE",
                "ua": "НАЙКРАЩА ЦІНА",
                "ru": "ЛУЧШАЯ ЦЕНА"
            },
            "color": "purple",
            "savings": {
                "amount": 1000,
                "percentage": 17,
                "text": {
                    "en": "Save 17%",
                    "ua": "Економія 17%",
                    "ru": "Экономия 17%"
                }
            }
        }
    }

    # Формуємо відповідь з локалізацією
    localized_plans = []
    for plan_id, plan in plans.items():
        localized_plan = {
            "id": plan["id"],
            "name": plan["name"].get(language, plan["name"]["en"]),
            "description": plan["description"].get(language, plan["description"]["en"]),
            "price": plan["price"],
            "price_display": plan["price_display"],
            "currency": plan["currency"],
            "duration_days": plan["duration_days"],
            "benefits": plan["benefits"].get(language, plan["benefits"]["en"]),
            "color": plan["color"]
        }

        if "badge" in plan:
            localized_plan["badge"] = plan["badge"].get(language, plan["badge"]["en"])

        if "savings" in plan:
            localized_plan["savings"] = {
                "amount": plan["savings"]["amount"],
                "percentage": plan["savings"]["percentage"],
                "text": plan["savings"]["text"].get(language, plan["savings"]["text"]["en"])
            }

        localized_plans.append(localized_plan)

    return {
        "plans": localized_plans,
        "features": {
            "title": {
                "en": "Premium Features",
                "ua": "Premium можливості",
                "ru": "Premium возможности"
            }.get(language, "Premium Features"),
            "list": {
                "en": [
                    "📦 Access to all new premium archives",
                    "🎰 +2 daily wheel spins",
                    "💰 5% cashback on all purchases",
                    "⚡ Priority customer support",
                    "🎁 Exclusive bonuses and promotions",
                    "📥 Unlimited downloads",
                    "🏆 VIP status acceleration"
                ],
                "ua": [
                    "📦 Доступ до всіх нових преміум архівів",
                    "🎰 +2 щоденні прокрутки колеса",
                    "💰 5% кешбек з усіх покупок",
                    "⚡ Пріоритетна підтримка",
                    "🎁 Ексклюзивні бонуси та акції",
                    "📥 Необмежені завантаження",
                    "🏆 Прискорення VIP статусу"
                ],
                "ru": [
                    "📦 Доступ ко всем новым премиум архивам",
                    "🎰 +2 ежедневных прокрутки колеса",
                    "💰 5% кэшбэк со всех покупок",
                    "⚡ Приоритетная поддержка",
                    "🎁 Эксклюзивные бонусы и акции",
                    "📥 Неограниченные загрузки",
                    "🏆 Ускорение VIP статуса"
                ]
            }.get(language, [])
        }
    }


@router.get("/status")
async def get_subscription_status(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати статус підписки користувача

    Returns:
        Інформація про активну підписку
    """
    # Шукаємо активну підписку
    active_subscription = None
    for subscription in current_user.subscriptions:
        if subscription.is_valid():
            active_subscription = subscription
            break

    if active_subscription:
        return {
            "has_subscription": True,
            "subscription": {
                "id": active_subscription.id,
                "plan_type": active_subscription.plan_type,
                "started_at": active_subscription.started_at.isoformat(),
                "expires_at": active_subscription.expires_at.isoformat(),
                "days_remaining": active_subscription.days_remaining(),
                "auto_renew": active_subscription.auto_renew,
                "is_cancelled": active_subscription.is_cancelled,
                "benefits": {
                    "daily_spins_bonus": active_subscription.daily_spins_bonus,
                    "cashback_percent": active_subscription.cashback_percent
                }
            }
        }
    else:
        return {
            "has_subscription": False,
            "subscription": None
        }


@router.post("/create")
async def create_subscription(
        plan_type: str,
        language: str = Query("en"),
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Створити нову підписку

    Args:
        plan_type: Тип плану (monthly/yearly)
        language: Мова для платежу

    Returns:
        Посилання на оплату
    """
    # Перевіряємо чи немає активної підписки
    for subscription in current_user.subscriptions:
        if subscription.is_valid():
            raise HTTPException(
                status_code=400,
                detail={
                    "en": "You already have an active subscription",
                    "ua": "У вас вже є активна підписка",
                    "ru": "У вас уже есть активная подписка"
                }.get(language, "You already have an active subscription")
            )

    # Створюємо нову підписку
    new_subscription = Subscription.create_subscription(
        user_id=current_user.id,
        plan_type=plan_type
    )

    db.add(new_subscription)
    db.commit()
    db.refresh(new_subscription)

    # Створюємо платіж через Cryptomus
    try:
        payment_data = payment_service.create_subscription_payment(
            user_id=current_user.id,
            plan_type=plan_type,
            language=language
        )

        # Зберігаємо payment_id в підписці
        new_subscription.payment_id = payment_data['payment_id']
        db.commit()

        # Записуємо в історію
        history = SubscriptionHistory(
            user_id=current_user.id,
            subscription_id=new_subscription.id,
            action='created',
            details={
                'plan_type': plan_type,
                'payment_id': payment_data['payment_id']
            }
        )
        db.add(history)
        db.commit()

        return {
            "success": True,
            "subscription_id": new_subscription.id,
            "payment_url": payment_data['payment_url'],
            "payment_id": payment_data['payment_id'],
            "amount": payment_data['amount'],
            "currency": payment_data['currency'],
            "expires_at": payment_data.get('expires_at'),
            "message": {
                "en": "Redirecting to payment...",
                "ua": "Перенаправлення на оплату...",
                "ru": "Перенаправление на оплату..."
            }.get(language, "Redirecting to payment...")
        }

    except Exception as e:
        # Видаляємо підписку якщо не вдалося створити платіж
        db.delete(new_subscription)
        db.commit()

        raise HTTPException(
            status_code=500,
            detail={
                "en": f"Failed to create payment: {str(e)}",
                "ua": f"Не вдалося створити платіж: {str(e)}",
                "ru": f"Не удалось создать платеж: {str(e)}"
            }.get(language, f"Failed to create payment: {str(e)}")
        )


@router.post("/cancel")
async def cancel_subscription(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Скасувати автопродовження підписки

    Returns:
        Статус скасування
    """
    # Шукаємо активну підписку
    active_subscription = None
    for subscription in current_user.subscriptions:
        if subscription.is_valid():
            active_subscription = subscription
            break

    if not active_subscription:
        raise HTTPException(
            status_code=404,
            detail="No active subscription found"
        )

    # Скасовуємо автопродовження
    active_subscription.auto_renew = False
    active_subscription.is_cancelled = True
    active_subscription.cancelled_at = datetime.utcnow()

    # Записуємо в історію
    history = SubscriptionHistory(
        user_id=current_user.id,
        subscription_id=active_subscription.id,
        action='cancelled',
        details={'cancelled_by': 'user'}
    )
    db.add(history)
    db.commit()

    return {
        "success": True,
        "message": "Subscription auto-renewal cancelled",
        "expires_at": active_subscription.expires_at.isoformat(),
        "days_remaining": active_subscription.days_remaining()
    }


@router.post("/renew")
async def renew_subscription(
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Відновити автопродовження підписки

    Returns:
        Статус відновлення
    """
    # Шукаємо активну підписку
    active_subscription = None
    for subscription in current_user.subscriptions:
        if subscription.is_valid() and subscription.is_cancelled:
            active_subscription = subscription
            break

    if not active_subscription:
        raise HTTPException(
            status_code=404,
            detail="No cancelled subscription found"
        )

    # Відновлюємо автопродовження
    active_subscription.auto_renew = True
    active_subscription.is_cancelled = False
    active_subscription.cancelled_at = None

    # Записуємо в історію
    history = SubscriptionHistory(
        user_id=current_user.id,
        subscription_id=active_subscription.id,
        action='renewed',
        details={'renewed_by': 'user'}
    )
    db.add(history)