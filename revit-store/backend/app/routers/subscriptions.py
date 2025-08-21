"""
Роутер для управління підписками
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionHistory
from app.routers.auth import get_current_user_from_token
from app.services.payment_service import PaymentService
from app.utils.security import generate_order_number

load_dotenv()

# Створюємо роутер
router = APIRouter(
    prefix="/api/subscriptions",
    tags=["Subscriptions"]
)

# Ініціалізуємо платіжний сервіс
payment_service = PaymentService()

# Плани підписок
SUBSCRIPTION_PLANS = {
    "monthly": {
        "price_usd": 5.00,
        "price_cents": 500,
        "days": 30,
        "name": {"en": "Monthly", "ua": "Місячна", "ru": "Месячная"},
        "description": {
            "en": "Access to all premium archives for 30 days",
            "ua": "Доступ до всіх преміум архівів на 30 днів",
            "ru": "Доступ ко всем премиум архивам на 30 дней"
        },
        "benefits": {
            "daily_spins_bonus": 2,
            "cashback_percent": 5
        }
    },
    "yearly": {
        "price_usd": 50.00,
        "price_cents": 5000,
        "days": 365,
        "name": {"en": "Yearly", "ua": "Річна", "ru": "Годовая"},
        "description": {
            "en": "Access to all premium archives for 365 days (2 months free!)",
            "ua": "Доступ до всіх преміум архівів на 365 днів (2 місяці безкоштовно!)",
            "ru": "Доступ ко всем премиум архивам на 365 дней (2 месяца бесплатно!)"
        },
        "benefits": {
            "daily_spins_bonus": 2,
            "cashback_percent": 5
        },
        "discount": "2_months_free"
    }
}


@router.get("/plans")
async def get_subscription_plans(
    language: str = "en",
    current_user: Optional[User] = Depends(get_current_user_from_token)
) -> Dict:
    """
    Отримати доступні плани підписок

    Returns:
        Список планів з цінами та привілеями
    """
    plans = []
    for plan_id, plan in SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan["name"].get(language, plan["name"]["en"]),
            "description": plan["description"].get(language, plan["description"]["en"]),
            "price_usd": plan["price_usd"],
            "price_cents": plan["price_cents"],
            "duration_days": plan["days"],
            "benefits": plan["benefits"],
            "discount": plan.get("discount"),
            "is_best_value": plan_id == "yearly"
        })

    # Перевіряємо чи є активна підписка
    active_subscription = None
    if current_user:
        for sub in current_user.subscriptions:
            if sub.is_valid():
                active_subscription = {
                    "plan_type": sub.plan_type,
                    "expires_at": sub.expires_at.isoformat(),
                    "days_remaining": sub.days_remaining(),
                    "auto_renew": sub.auto_renew
                }
                break

    return {
        "plans": plans,
        "active_subscription": active_subscription,
        "features": [
            "✅ Доступ до нових архівів з дати підписки",
            "✅ +2 прокрутки колеса щодня",
            "✅ 5% кешбек бонусами",
            "✅ Пріоритетна підтримка",
            "✅ Всі куплені архіви зберігаються назавжди"
        ]
    }


@router.post("/create")
async def create_subscription(
    plan_type: str,
    payment_method: str = "crypto",
    currency: str = "USDT",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Створити нову підписку

    Args:
        plan_type: Тип плану (monthly/yearly)
        payment_method: Метод оплати (crypto/bonuses)
        currency: Криптовалюта для оплати (BTC/ETH/USDT)

    Returns:
        Інформація про підписку та платіжне посилання
    """
    # Перевіряємо план
    if plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    plan = SUBSCRIPTION_PLANS[plan_type]

    # Перевіряємо чи немає активної підписки
    for sub in current_user.subscriptions:
        if sub.is_valid():
            raise HTTPException(
                status_code=400,
                detail="У вас вже є активна підписка"
            )

    # Створюємо підписку
    subscription = Subscription.create_subscription(current_user.id, plan_type)
    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    # Обробка оплати
    if payment_method == "bonuses":
        # Оплата бонусами
        if current_user.balance < plan["price_cents"]:
            raise HTTPException(
                status_code=400,
                detail="Недостатньо бонусів"
            )

        # Списуємо бонуси
        current_user.balance -= plan["price_cents"]

        # Активуємо підписку
        subscription.payment_status = "completed"
        subscription.payment_method = "bonuses"
        subscription.is_active = True

        # Додаємо в історію
        history = SubscriptionHistory(
            user_id=current_user.id,
            subscription_id=subscription.id,
            action="created",
            details={"method": "bonuses", "amount": plan["price_cents"]}
        )
        db.add(history)
        db.commit()

        return {
            "success": True,
            "subscription_id": subscription.id,
            "message": "Підписка успішно активована",
            "expires_at": subscription.expires_at.isoformat()
        }

    elif payment_method == "crypto":
        # Створюємо платіж через Cryptomus
        order_id = generate_order_number()

        payment_data = payment_service.create_payment(
            amount=plan["price_usd"],
            currency=currency,
            order_id=order_id,
            description=f"OhMyRevit {plan_type} subscription",
            user_id=current_user.id,
            subscription_id=subscription.id
        )

        if payment_data["success"]:
            # Зберігаємо payment_id
            subscription.payment_id = payment_data["payment_id"]
            subscription.payment_method = f"crypto_{currency}"
            db.commit()

            # Плануємо перевірку статусу через 5 хвилин
            background_tasks.add_task(
                check_payment_status,
                subscription.id,
                payment_data["payment_id"],
                db
            )

            return {
                "success": True,
                "subscription_id": subscription.id,
                "payment_url": payment_data["payment_url"],
                "payment_id": payment_data["payment_id"],
                "amount": plan["price_usd"],
                "currency": currency,
                "message": "Перейдіть за посиланням для оплати"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Помилка створення платежу"
            )

    else:
        raise HTTPException(status_code=400, detail="Invalid payment method")


@router.post("/cancel/{subscription_id}")
async def cancel_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Скасувати підписку (вимкнути автопродовження)
    """
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Підписка не знайдена")

    if not subscription.is_active:
        raise HTTPException(status_code=400, detail="Підписка вже неактивна")

    # Вимикаємо автопродовження
    subscription.auto_renew = False
    subscription.is_cancelled = True
    subscription.cancelled_at = datetime.utcnow()

    # Додаємо в історію
    history = SubscriptionHistory(
        user_id=current_user.id,
        subscription_id=subscription.id,
        action="cancelled",
        details={"reason": "user_request"}
    )
    db.add(history)
    db.commit()

    return {
        "success": True,
        "message": "Автопродовження вимкнено. Підписка буде активна до " + subscription.expires_at.isoformat()
    }


@router.get("/history")
async def get_subscription_history(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати історію підписок користувача
    """
    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).order_by(Subscription.created_at.desc()).all()

    history = []
    for sub in subscriptions:
        history.append({
            "id": sub.id,
            "plan_type": sub.plan_type,
            "started_at": sub.started_at.isoformat(),
            "expires_at": sub.expires_at.isoformat(),
            "is_active": sub.is_active,
            "is_valid": sub.is_valid(),
            "payment_status": sub.payment_status,
            "payment_method": sub.payment_method,
            "price": sub.plan_price,
            "auto_renew": sub.auto_renew,
            "days_remaining": sub.days_remaining() if sub.is_valid() else 0
        })

    return {
        "subscriptions": history,
        "has_active": any(s.is_valid() for s in subscriptions)
    }


@router.post("/webhook/cryptomus")
async def cryptomus_webhook(
    request_data: Dict,
    db: Session = Depends(get_db)
) -> Dict:
    """
    Webhook для обробки callback від Cryptomus
    """
    # Перевіряємо підпис
    if not payment_service.verify_webhook_signature(request_data):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payment_id = request_data.get("order_id")
    status = request_data.get("status")

    # Знаходимо підписку
    subscription = db.query(Subscription).filter(
        Subscription.payment_id == payment_id
    ).first()

    if not subscription:
        return {"success": False, "error": "Subscription not found"}

    # Оновлюємо статус
    if status == "paid" or status == "confirmed":
        subscription.payment_status = "completed"
        subscription.is_active = True

        # Додаємо в історію
        history = SubscriptionHistory(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            action="activated",
            details={"payment_id": payment_id, "status": status}
        )
        db.add(history)

    elif status == "cancel" or status == "fail":
        subscription.payment_status = "failed"
        subscription.is_active = False

        history = SubscriptionHistory(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            action="payment_failed",
            details={"payment_id": payment_id, "status": status}
        )
        db.add(history)

    db.commit()

    return {"success": True}


async def check_payment_status(subscription_id: int, payment_id: str, db: Session):
    """
    Фонова задача для перевірки статусу платежу
    """
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id
    ).first()

    if subscription and subscription.payment_status == "pending":
        # Перевіряємо статус через API Cryptomus
        status = payment_service.check_payment_status(payment_id)

        if status == "paid":
            subscription.payment_status = "completed"
            subscription.is_active = True
            db.commit()


@router.get("/benefits")
async def get_subscription_benefits(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати поточні привілеї підписки
    """
    active_subscription = None
    for sub in current_user.subscriptions:
        if sub.is_valid():
            active_subscription = sub
            break

    if not active_subscription:
        return {
            "has_subscription": False,
            "benefits": None
        }

    return {
        "has_subscription": True,
        "plan_type": active_subscription.plan_type,
        "expires_at": active_subscription.expires_at.isoformat(),
        "days_remaining": active_subscription.days_remaining(),
        "benefits": {
            "daily_spins_bonus": active_subscription.daily_spins_bonus,
            "cashback_percent": active_subscription.cashback_percent,
            "accessible_products": len(active_subscription.accessible_products or [])
        }
    }