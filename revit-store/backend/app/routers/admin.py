"""
Роутер для адмін панелі
Повний контроль над системою
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, cast, String
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.models.user import User, CreatorApplication
from app.models.product import Product
from app.models.order import Order, PromoCode, OrderItem
from app.models.subscription import Subscription
from app.routers.auth import get_current_active_user
from app.services.telegram_bot import bot_service
from app.services.local_file_service import local_file_service

# Створюємо роутер
router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


# ====== MIDDLEWARE ======

async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Перевірка чи користувач є адміністратором
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    return current_user


# ====== DASHBOARD СТАТИСТИКА ======

@router.get("/dashboard")
async def get_dashboard_stats(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати статистику для дашборду

    Returns:
        Загальна статистика платформи
    """
    # Статистика користувачів
    users_stats = db.query(
        func.count(User.id).label('total_users'),
        func.count(User.id).filter(User.is_creator == True).label('creators'),
        func.count(User.id).filter(User.is_blocked == True).label('blocked'),
        func.count(User.id).filter(
            User.last_login >= datetime.utcnow() - timedelta(days=7)
        ).label('active_week')
    ).first()

    # Статистика продуктів
    products_stats = db.query(
        func.count(Product.id).label('total_products'),
        func.count(Product.id).filter(Product.is_active == True).label('active'),
        func.count(Product.id).filter(
            Product.is_approved == False,
            Product.rejection_reason == None
        ).label('pending_moderation'),
        func.sum(Product.downloads_count).label('total_downloads')
    ).first()

    # Статистика замовлень
    orders_stats = db.query(
        func.count(Order.id).label('total_orders'),
        func.count(Order.id).filter(Order.status == 'completed').label('completed'),
        func.sum(Order.total).filter(Order.status == 'completed').label('total_revenue')
    ).first()

    # Статистика підписок
    subscriptions_stats = db.query(
        func.count(Subscription.id).filter(
            Subscription.is_active == True,
            Subscription.expires_at > datetime.utcnow()
        ).label('active_subscriptions'),
        func.sum(Subscription.plan_price).filter(
            Subscription.payment_status == 'completed'
        ).label('subscription_revenue')
    ).first()

    # Останні 7 днів - графік доходів
    week_ago = datetime.utcnow() - timedelta(days=7)
    daily_revenue = db.query(
        func.date(Order.created_at).label('date'),
        func.sum(Order.total).label('revenue'),
        func.count(Order.id).label('orders')
    ).filter(
        Order.status == 'completed',
        Order.created_at >= week_ago
    ).group_by(
        func.date(Order.created_at)
    ).all()

    # Топ продукти за тиждень (ВИПРАВЛЕНО)
    top_products = db.query(
        Product.id,
        Product.sku,
        Product.title,
        func.count(Order.id).label('sales')
    ).join(
        OrderItem, Product.id == OrderItem.product_id
    ).join(
        Order, OrderItem.order_id == Order.id
    ).filter(
        Order.status == 'completed',
        Order.created_at >= week_ago
    ).group_by(
        Product.id, Product.sku, cast(Product.title, String)
    ).order_by(
        desc('sales')
    ).limit(5).all()

    return {
        "users": {
            "total": users_stats.total_users,
            "creators": users_stats.creators,
            "blocked": users_stats.blocked,
            "active_week": users_stats.active_week
        },
        "products": {
            "total": products_stats.total_products,
            "active": products_stats.active,
            "pending_moderation": products_stats.pending_moderation,
            "total_downloads": products_stats.total_downloads or 0
        },
        "orders": {
            "total": orders_stats.total_orders,
            "completed": orders_stats.completed,
            "total_revenue": orders_stats.total_revenue or 0
        },
        "subscriptions": {
            "active": subscriptions_stats.active_subscriptions or 0,
            "revenue": subscriptions_stats.subscription_revenue or 0
        },
        "revenue_chart": [
            {
                "date": day.date.isoformat(),
                "revenue": day.revenue or 0,
                "orders": day.orders
            }
            for day in daily_revenue
        ],
        "top_products": [
            {
                "id": p.id,
                "sku": p.sku,
                "title": p.title.get('en') if isinstance(p.title, dict) else p.title,
                "sales": p.sales
            }
            for p in top_products
        ]
    }


# ====== УПРАВЛІННЯ КОРИСТУВАЧАМИ ======

@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = Query(None, description="all, users, creators, admins"),
    status: Optional[str] = Query(None, description="all, active, blocked"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати список користувачів

    Returns:
        Список користувачів з фільтрацією
    """
    query = db.query(User)

    # Пошук
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                User.username.ilike(search_term),
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                cast(User.telegram_id, String).like(search_term)
            )
        )

    # Фільтр по ролі
    if role == "creators":
        query = query.filter(User.is_creator == True)
    elif role == "admins":
        query = query.filter(User.is_admin == True)
    elif role == "users":
        query = query.filter(
            User.is_creator == False,
            User.is_admin == False
        )

    # Фільтр по статусу
    if status == "active":
        query = query.filter(User.is_blocked == False)
    elif status == "blocked":
        query = query.filter(User.is_blocked == True)

    # Пагінація
    total = query.count()
    offset = (page - 1) * limit
    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()

    return {
        "users": [
            {
                "id": u.id,
                "telegram_id": u.telegram_id,
                "username": u.username,
                "full_name": u.get_full_name(),
                "balance": u.balance,
                "vip_level": u.vip_level,
                "is_creator": u.is_creator,
                "is_admin": u.is_admin,
                "is_blocked": u.is_blocked,
                "total_spent": u.total_spent,
                "created_at": u.created_at.isoformat(),
                "last_login": u.last_login.isoformat() if u.last_login else None
            }
            for u in users
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    balance: Optional[int] = Body(None),
    vip_level: Optional[int] = Body(None),
    is_creator: Optional[bool] = Body(None),
    is_admin: Optional[bool] = Body(None),
    is_blocked: Optional[bool] = Body(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Оновити дані користувача

    Returns:
        Оновлені дані користувача
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Оновлюємо поля
    if balance is not None:
        user.balance = balance
    if vip_level is not None:
        user.vip_level = min(max(vip_level, 0), 4)  # 0-4
    if is_creator is not None:
        user.is_creator = is_creator
    if is_admin is not None and user.id != admin.id:  # Не можна змінити свої права
        user.is_admin = is_admin
    if is_blocked is not None and user.id != admin.id:  # Не можна заблокувати себе
        user.is_blocked = is_blocked

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "balance": user.balance,
            "vip_level": user.vip_level,
            "is_creator": user.is_creator,
            "is_admin": user.is_admin,
            "is_blocked": user.is_blocked
        }
    }


@router.post("/users/{user_id}/subscription")
async def grant_subscription(
    user_id: int,
    plan_type: str = Body(..., description="monthly or yearly"),
    days: Optional[int] = Body(None, description="Custom days"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Видати підписку користувачу

    Returns:
        Інформація про підписку
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Створюємо підписку
    if days:
        expires_at = datetime.utcnow() + timedelta(days=days)
        plan_price = 0  # Безкоштовно від адміна
    else:
        if plan_type == "monthly":
            expires_at = datetime.utcnow() + timedelta(days=30)
            plan_price = 500
        else:  # yearly
            expires_at = datetime.utcnow() + timedelta(days=365)
            plan_price = 5000

    subscription = Subscription(
        user_id=user_id,
        plan_type=plan_type,
        plan_price=plan_price,
        started_at=datetime.utcnow(),
        expires_at=expires_at,
        payment_method="admin_grant",
        payment_status="completed",
        is_active=True
    )

    db.add(subscription)
    db.commit()

    return {
        "success": True,
        "message": "Subscription granted successfully",
        "subscription": {
            "id": subscription.id,
            "plan_type": subscription.plan_type,
            "expires_at": subscription.expires_at.isoformat()
        }
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Повністю видалити користувача з бази даних.
    """
    user_to_delete = db.query(User).filter(User.id == user_id).first()

    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    if user_to_delete.is_admin:
        raise HTTPException(status_code=403, detail="Неможливо видалити іншого адміністратора")

    # Тут можна додати додаткову логіку, наприклад,
    # перепризначення його товарів або анонімізацію даних.
    # Для простоти - просто видаляємо.

    db.delete(user_to_delete)
    db.commit()

    return {"success": True, "message": f"Користувач ID:{user_id} був повністю видалений з БД."}

# ====== МОДЕРАЦІЯ ТОВАРІВ ======

@router.get("/moderation")
async def get_moderation_queue(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати товари на модерації

    Returns:
        Список товарів що очікують схвалення
    """
    pending_products = db.query(Product).filter(
        Product.is_approved == False,
        Product.rejection_reason == None
    ).order_by(Product.created_at).all()

    return {
        "count": len(pending_products),
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "title": p.title,
                "description": p.description,
                "price": p.price,
                "category": p.category,
                "creator": {
                    "id": p.creator.id,
                    "username": p.creator.username,
                    "full_name": p.creator.get_full_name()
                } if p.creator else None,
                "preview_images": p.preview_images,
                "created_at": p.created_at.isoformat()
            }
            for p in pending_products
        ]
    }


@router.post("/moderation/{product_id}/approve")
async def approve_product(
    product_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Схвалити товар

    Returns:
        Результат схвалення
    """
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.is_approved = True
    product.is_active = True
    product.approved_at = datetime.utcnow()
    product.approved_by_id = admin.id
    product.rejection_reason = None

    db.commit()

    # Повідомляємо творця через Telegram
    if product.creator:
        await bot_service.send_message(
            product.creator.telegram_id,
            f"✅ Ваш товар '{product.get_title('en')}' схвалено та опубліковано!"
        )

    return {
        "success": True,
        "message": "Product approved and published"
    }


@router.post("/moderation/{product_id}/reject")
async def reject_product(
    product_id: int,
    reason: str = Body(..., description="Rejection reason"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Відхилити товар

    Returns:
        Результат відхилення
    """
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.is_approved = False
    product.is_active = False
    product.rejection_reason = reason
    product.approved_at = datetime.utcnow()
    product.approved_by_id = admin.id

    db.commit()

    # Повідомляємо творця
    if product.creator:
        await bot_service.send_message(
            product.creator.telegram_id,
            f"❌ Ваш товар '{product.get_title('en')}' відхилено.\nПричина: {reason}"
        )

    return {
        "success": True,
        "message": "Product rejected",
        "reason": reason
    }


@router.post("/moderation/{product_id}/revision")
async def send_for_revision(
        product_id: int,
        notes: str = Body(..., description="Що потрібно виправити"),
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
) -> Dict:
    """
    Відправити товар на доопрацювання

    Returns:
        Результат відправки на доопрацювання
    """
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Помічаємо товар як такий, що потребує доопрацювання
    product.is_approved = False
    product.is_active = False
    product.rejection_reason = f"REVISION_NEEDED: {notes}"
    product.approved_at = datetime.utcnow()
    product.approved_by_id = admin.id

    db.commit()

    # Повідомляємо творця
    if product.creator:
        message = (
            f"📝 Ваш товар '{product.get_title('uk')}' потребує доопрацювання.\n\n"
            f"<b>Що потрібно виправити:</b>\n{notes}\n\n"
            f"Після внесення змін ви можете повторно відправити товар на модерацію."
        )
        await bot_service.send_message(
            product.creator.telegram_id,
            message
        )

    return {
        "success": True,
        "message": "Product sent for revision",
        "notes": notes
    }

# ====== ПРОМОКОДИ ======

@router.get("/promocodes")
async def get_promocodes(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати список промокодів

    Returns:
        Список всіх промокодів
    """
    promocodes = db.query(PromoCode).order_by(desc(PromoCode.created_at)).all()

    return {
        "promocodes": [
            {
                "id": p.id,
                "code": p.code,
                "discount_type": p.discount_type,
                "discount_value": p.discount_value,
                "max_uses": p.max_uses,
                "uses_count": p.uses_count,
                "min_order_amount": p.min_order_amount,
                "valid_from": p.valid_from.isoformat() if p.valid_from else None,
                "valid_until": p.valid_until.isoformat() if p.valid_until else None,
                "is_active": p.is_active,
                "is_valid": p.is_valid()
            }
            for p in promocodes
        ]
    }


@router.post("/promocodes")
async def create_promocode(
    code: str = Body(...),
    discount_type: str = Body(..., description="percent or fixed"),
    discount_value: int = Body(..., ge=1),
    max_uses: Optional[int] = Body(None),
    min_order_amount: int = Body(0),
    valid_days: Optional[int] = Body(None, description="Days until expiration"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Створити новий промокод

    Returns:
        Створений промокод
    """
    # Перевіряємо унікальність
    existing = db.query(PromoCode).filter(
        PromoCode.code == code.upper()
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Promo code already exists"
        )

    # Створюємо промокод
    promocode = PromoCode(
        code=code.upper(),
        discount_type=discount_type,
        discount_value=discount_value,
        max_uses=max_uses,
        min_order_amount=min_order_amount,
        valid_from=datetime.utcnow(),
        valid_until=datetime.utcnow() + timedelta(days=valid_days) if valid_days else None,
        is_active=True,
        created_by_id=admin.id
    )

    db.add(promocode)
    db.commit()

    return {
        "success": True,
        "message": "Promo code created",
        "promocode": {
            "id": promocode.id,
            "code": promocode.code,
            "discount_type": promocode.discount_type,
            "discount_value": promocode.discount_value
        }
    }


@router.delete("/promocodes/{promocode_id}")
async def delete_promocode(
    promocode_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Видалити промокод

    Returns:
        Результат видалення
    """
    promocode = db.query(PromoCode).filter(PromoCode.id == promocode_id).first()

    if not promocode:
        raise HTTPException(
            status_code=404,
            detail="Promo code not found"
        )

    promocode.is_active = False
    db.commit()

    return {
        "success": True,
        "message": "Promo code deactivated"
    }


# ====== ЗАЯВКИ ТВОРЦІВ ======

@router.get("/creator-applications")
async def get_creator_applications(
        status: str = "pending",
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """Отримати список заявок на статус творця."""
    applications = db.query(CreatorApplication).filter(
        CreatorApplication.status == status
    ).all()

    # Додаємо інформацію про користувачів
    result = []
    for app in applications:
        user = db.query(User).filter(User.id == app.user_id).first()
        app_data = {
            "id": app.id,
            "user_id": app.user_id,
            "portfolio_url": app.portfolio_url,
            "about_me": app.about_me,
            "status": app.status,
            "review_notes": app.review_notes,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "user": {
                "id": user.id,
                "telegram_id": user.telegram_id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "photo_url": user.photo_url
            } if user else None
        }
        result.append(app_data)

    return result


@router.post("/creator-applications/{app_id}/reject")
async def reject_creator_application(
        app_id: int,
        data: Dict = Body(...),  # Змінено: приймаємо як словник
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """Відхилити заявку творця."""
    application = db.query(CreatorApplication).filter(CreatorApplication.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Заявку не знайдено.")

    reason = data.get("reason", "Не вказано")  # Змінено: витягуємо reason з словника

    application.status = "rejected"
    application.review_notes = reason

    user = db.query(User).filter(User.id == application.user_id).first()
    if user:
        await bot_service.send_message(
            user.telegram_id,
            f"❌ На жаль, вашу заявку на статус творця було відхилено.\n\nПричина: {reason}\n\nВи можете подати нову заявку після виправлення зауважень."
        )

    db.commit()
    return {"success": True, "message": "Заявку відхилено."}


@router.post("/creator-applications/{app_id}/approve")
async def approve_creator_application(
        app_id: int,
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """Схвалити заявку творця."""
    application = db.query(CreatorApplication).filter(CreatorApplication.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Заявку не знайдено.")

    application.status = "approved"
    application.reviewed_by_id = admin.id

    user_to_promote = db.query(User).filter(User.id == application.user_id).first()
    if user_to_promote:
        user_to_promote.is_creator = True
        db.commit()
        await bot_service.send_message(
            user_to_promote.telegram_id,
            "🎉 Вітаємо! Вашу заявку на статус творця було схвалено. Тепер вам доступний 'Кабінет творця' у профілі."
        )
        return {"message": "Заявку схвалено, користувач отримав статус творця."}

    db.commit()
    return {"message": "Статус заявки оновлено, але користувача не знайдено."}

# ====== РОЗСИЛКИ ======

@router.post("/broadcast")
async def send_broadcast(
    message: str = Body(...),
    target: str = Body(..., description="all, users, creators, subscribers"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Відправити масову розсилку через Telegram

    Returns:
        Результат розсилки
    """
    # Визначаємо цільову аудиторію
    query = db.query(User)

    if target == "creators":
        query = query.filter(User.is_creator == True)
    elif target == "subscribers":
        # Користувачі з активною підпискою
        active_subs = db.query(Subscription.user_id).filter(
            Subscription.is_active == True,
            Subscription.expires_at > datetime.utcnow()
        ).subquery()
        query = query.filter(User.id.in_(active_subs))
    elif target == "users":
        query = query.filter(User.is_creator == False, User.is_admin == False)
    # else: all users

    users = query.all()

    # Відправляємо повідомлення
    telegram_ids = [user.telegram_id for user in users]
    stats = await bot_service.broadcast(telegram_ids, message)

    return {
        "success": True,
        "message": "Broadcast sent",
        "stats": stats
    }


# ====== УПРАВЛІННЯ ТОВАРАМИ (АДМІН) ======

@router.get("/products", response_model=Dict)
async def admin_get_products(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        search: Optional[str] = None,
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """
    Отримати список всіх товарів для адмін-панелі.
    """
    query = db.query(Product)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Product.title.cast(String).ilike(search_term),
                Product.sku.ilike(search_term)
            )
        )

    total = query.count()
    products = query.order_by(desc(Product.created_at)).offset((page - 1) * limit).limit(limit).all()

    return {
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "title": p.get_title('en'),
                "price": p.price,
                "is_active": p.is_active,
                "is_approved": p.is_approved,
                "creator_id": p.creator_id
            } for p in products
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


@router.put("/products/{product_id}")
async def admin_update_product(
        product_id: int,
        data: Dict = Body(...),
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """
    Оновити дані товару адміном.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")

    # Оновлюємо поля, які були передані
    for key, value in data.items():
        if hasattr(product, key):
            setattr(product, key, value)

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    return {"success": True, "message": "Товар успішно оновлено"}


@router.delete("/products/{product_id}")
async def admin_delete_product(
        product_id: int,
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """
    Видалити товар адміном.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")

    # Тут можна додати логіку видалення файлів з S3/локального сховища
    # Наприклад: file_service.delete_file(product.file_url)

    db.delete(product)
    db.commit()

    return {"success": True, "message": "Товар успішно видалено"}


@router.get("/products/{product_id}", response_model=Dict)
async def admin_get_product_details(
        product_id: int,
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """
    Отримати повну інформацію про товар для редагування.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")

    return {
        "id": product.id,
        "sku": product.sku,
        "title": product.title,
        "description": product.description,
        "category": product.category,
        "product_type": product.product_type,
        "price": product.price,
        "tags": product.tags,
        "is_active": product.is_active,
        "is_approved": product.is_approved,
        "preview_images": product.preview_images,
        "creator_id": product.creator_id
    }


@router.post("/products")
async def admin_create_product(
        title_en: str = Form(...),
        description_en: str = Form(...),
        price: int = Form(...),
        category: str = Form(...),
        product_type: str = Form(...),
        tags: Optional[str] = Form(None),
        archive_file: UploadFile = File(...),
        preview_images: List[UploadFile] = File(...),
        admin: User = Depends(get_admin_user),
        db: Session = Depends(get_db)
):
    """
    Створити новий товар з адмін-панелі.
    """
    try:
        archive_result = await file_service.upload_file(archive_file, 'archives')

        preview_urls = []
        for image_file in preview_images:
            image_result = await file_service.upload_file(image_file, 'previews')
            if image_result['success']:
                preview_urls.append(image_result['file_url'])

        title_json = {"en": title_en, "ua": title_en, "ru": title_en}
        description_json = {"en": description_en, "ua": description_en, "ru": description_en}
        tags_list = [tag.strip() for tag in tags.split(',')] if tags else []

        product = Product(
            sku=f"ADM{admin.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            title=title_json,
            description=description_json,
            category=category,
            product_type=product_type,
            price=price,
            file_url=archive_result['s3_key'],
            file_size=archive_result['file_size'],
            preview_images=preview_urls,
            tags=tags_list,
            is_active=True,
            is_approved=True,  # Адмінські товари одразу схвалені
            creator_id=None  # Можна додати логіку вибору творця
        )

        db.add(product)
        db.commit()

        return {"success": True, "message": "Товар успішно створено"}
    except Exception as e:
        print(f"!!! CRITICAL ERROR while creating product: {e}")  # Додаємо логування
        # Тут можна додати логіку видалення файлів у разі помилки
        raise HTTPException(status_code=500, detail=f"Помилка створення товару: {str(e)}")