"""
Роутер для управління замовленнями та кошиком
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order, OrderItem, CartItem, PromoCode
from app.routers.auth import get_current_user_from_token
from app.services.payment_service import PaymentService, PromoCodeService
from app.utils.security import generate_order_number

# Створюємо роутер
router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"]
)

# Ініціалізуємо сервіси
payment_service = PaymentService()
promo_service = PromoCodeService()


# ====== КОШИК ======

@router.get("/cart")
async def get_cart(
    language: str = "en",
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати вміст кошика користувача
    """
    cart_items = db.query(CartItem).filter(
        CartItem.user_id == current_user.id
    ).all()

    items = []
    subtotal = 0

    for item in cart_items:
        product = item.product
        current_price = product.get_current_price()

        items.append({
            "id": item.id,
            "product_id": product.id,
            "sku": product.sku,
            "title": product.get_title(language),
            "preview_image": product.preview_images[0] if product.preview_images else None,
            "price": product.price,
            "current_price": current_price,
            "discount_percent": product.discount_percent if product.discount_ends_at and product.discount_ends_at > datetime.utcnow() else 0,
            "added_at": item.added_at.isoformat()
        })

        subtotal += current_price

    # Рахуємо можливий кешбек
    cashback_percent = current_user.get_cashback_percent()

    # Якщо є підписка - додаємо 5%
    for sub in current_user.subscriptions:
        if sub.is_valid():
            cashback_percent += 5
            break

    return {
        "items": items,
        "count": len(items),
        "subtotal": subtotal,
        "max_bonuses_use": min(current_user.balance, int(subtotal * 0.7)),  # Макс 70%
        "cashback_amount": int(subtotal * cashback_percent / 100),
        "user_balance": current_user.balance
    }


@router.post("/cart/add")
async def add_to_cart(
    product_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Додати товар в кошик
    """
    # Перевіряємо чи існує продукт
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Продукт не знайдено")

    # Перевіряємо чи вже в кошику
    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == product_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Товар вже в кошику")

    # Додаємо в кошик
    cart_item = CartItem(
        user_id=current_user.id,
        product_id=product_id
    )
    db.add(cart_item)
    db.commit()

    return {
        "success": True,
        "message": "Товар додано в кошик",
        "cart_count": db.query(CartItem).filter(CartItem.user_id == current_user.id).count()
    }


@router.delete("/cart/{item_id}")
async def remove_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Видалити товар з кошика
    """
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Товар не знайдено в кошику")

    db.delete(cart_item)
    db.commit()

    return {
        "success": True,
        "message": "Товар видалено з кошика",
        "cart_count": db.query(CartItem).filter(CartItem.user_id == current_user.id).count()
    }


@router.delete("/cart")
async def clear_cart(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Очистити кошик
    """
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()

    return {
        "success": True,
        "message": "Кошик очищено"
    }


# ====== ПРОМОКОДИ ======

@router.post("/promo/validate")
async def validate_promo_code(
    code: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Перевірити промокод
    """
    promo = promo_service.validate_promo_code(code, db)

    if not promo:
        raise HTTPException(status_code=400, detail="Невірний або прострочений промокод")

    return {
        "valid": True,
        "code": promo["code"],
        "discount_type": promo["discount_type"],
        "discount_value": promo["discount_value"],
        "min_order_amount": promo["min_order_amount"]
    }


# ====== ЗАМОВЛЕННЯ ======

@router.post("/")
async def create_order(
    order_data: Dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Створити замовлення

    order_data:
        - items: список товарів [{product_id: int}]
        - payment_method: спосіб оплати (crypto/bonuses/subscription)
        - promo_code: промокод (опціонально)
        - bonuses_used: кількість бонусів для використання
        - email: email для дублювання (опціонально)
        - crypto_currency: валюта для крипто-оплати (BTC/ETH/USDT)
    """
    items = order_data.get("items", [])
    if not items:
        # Беремо з кошика
        cart_items = db.query(CartItem).filter(
            CartItem.user_id == current_user.id
        ).all()

        if not cart_items:
            raise HTTPException(status_code=400, detail="Кошик порожній")

        items = [{"product_id": item.product_id} for item in cart_items]

    # Створюємо замовлення
    order = Order(
        order_number=generate_order_number(),
        user_id=current_user.id,
        payment_method=order_data.get("payment_method", "crypto"),
        email=order_data.get("email"),
        status="pending"
    )

    # Рахуємо суму
    subtotal = 0
    for item_data in items:
        product = db.query(Product).filter(
            Product.id == item_data["product_id"],
            Product.is_active == True
        ).first()

        if not product:
            continue

        current_price = product.get_current_price()

        # Додаємо товар в замовлення
        order_item = OrderItem(
            product_id=product.id,
            product_title=product.get_title("en"),
            product_price=product.price,
            discount_percent=product.discount_percent if product.discount_ends_at and product.discount_ends_at > datetime.utcnow() else 0,
            final_price=current_price
        )
        order.items.append(order_item)

        subtotal += current_price

    order.subtotal = subtotal

    # Застосовуємо промокод
    promo_code = order_data.get("promo_code")
    if promo_code:
        promo = promo_service.validate_promo_code(promo_code, db)

        if promo and subtotal >= promo["min_order_amount"]:
            order.promo_code = promo["code"]

            if promo["discount_type"] == "percent":
                order.discount_amount = int(subtotal * promo["discount_value"] / 100)
                order.promo_discount_percent = promo["discount_value"]
            else:
                order.discount_amount = promo["discount_value"]

            # Збільшуємо лічильник використань
            promo_service.apply_promo_code(promo["id"], db)

    # Використовуємо бонуси
    bonuses_to_use = min(
        order_data.get("bonuses_used", 0),
        current_user.balance,
        int((subtotal - order.discount_amount) * 0.7)  # Макс 70%
    )
    order.bonuses_used = bonuses_to_use

    # Рахуємо фінальну суму
    order.calculate_total()

    # Рахуємо кешбек
    cashback_percent = current_user.get_cashback_percent()
    for sub in current_user.subscriptions:
        if sub.is_valid():
            cashback_percent += 5
            break

    order.calculate_cashback(cashback_percent)

    db.add(order)
    db.commit()
    db.refresh(order)

    # Обробка оплати
    if order.payment_method == "bonuses":
        # Оплата тільки бонусами
        if order.total > 0:
            raise HTTPException(
                status_code=400,
                detail="Недостатньо бонусів для повної оплати"
            )

        # Списуємо бонуси
        current_user.balance -= order.bonuses_used

        # Завершуємо замовлення
        order.status = "completed"
        order.payment_status = "completed"
        order.completed_at = datetime.utcnow()

        # Нараховуємо кешбек
        if order.cashback_amount > 0:
            current_user.balance += order.cashback_amount
            order.cashback_credited = True

        # Оновлюємо VIP статус
        current_user.total_spent += order.total
        current_user.update_vip_level()

        # Очищаємо кошик
        db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()

        db.commit()

        # Відправляємо email якщо вказано
        if order.email:
            background_tasks.add_task(send_order_email, order, db)

        return {
            "success": True,
            "order_id": order.id,
            "order_number": order.order_number,
            "message": "Замовлення успішно оформлено"
        }

    elif order.payment_method == "subscription":
        # Перевіряємо підписку
        has_valid_subscription = False
        for sub in current_user.subscriptions:
            if sub.is_valid():
                has_valid_subscription = True
                break

        if not has_valid_subscription:
            raise HTTPException(
                status_code=400,
                detail="У вас немає активної підписки"
            )

        # Перевіряємо чи всі товари доступні по підписці
        for item in order.items:
            if not item.product.requires_subscription:
                raise HTTPException(
                    status_code=400,
                    detail=f"Товар {item.product_title} не доступний по підписці"
                )

        # Списуємо використані бонуси
        if order.bonuses_used > 0:
            current_user.balance -= order.bonuses_used

        # Завершуємо замовлення
        order.status = "completed"
        order.payment_status = "subscription"
        order.completed_at = datetime.utcnow()

        # Нараховуємо кешбек
        if order.cashback_amount > 0:
            current_user.balance += order.cashback_amount
            order.cashback_credited = True

        # Очищаємо кошик
        db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()

        db.commit()

        return {
            "success": True,
            "order_id": order.id,
            "order_number": order.order_number,
            "message": "Товари доступні по підписці"
        }

    elif order.payment_method == "crypto":
        # Створюємо платіж
        crypto_currency = order_data.get("crypto_currency", "USDT")

        # Списуємо використані бонуси
        if order.bonuses_used > 0:
            current_user.balance -= order.bonuses_used

        # Конвертуємо центи в долари
        amount_usd = order.total / 100

        payment_data = payment_service.create_payment(
            amount=amount_usd,
            currency=crypto_currency,
            order_id=order.order_number,
            description=f"OhMyRevit Order #{order.order_number}",
            user_id=current_user.id
        )

        if payment_data["success"]:
            order.payment_id = payment_data["payment_id"]
            order.crypto_currency = crypto_currency
            order.crypto_amount = payment_data.get("amount_crypto", "")
            order.crypto_address = payment_data.get("address", "")

            db.commit()

            # Плануємо перевірку статусу
            background_tasks.add_task(
                check_order_payment_status,
                order.id,
                payment_data["payment_id"],
                db
            )

            return {
                "success": True,
                "order_id": order.id,
                "order_number": order.order_number,
                "payment_url": payment_data["payment_url"],
                "payment_id": payment_data["payment_id"],
                "amount": amount_usd,
                "currency": crypto_currency,
                "message": "Перейдіть за посиланням для оплати"
            }
        else:
            order.status = "failed"
            order.payment_status = "failed"
            db.commit()

            raise HTTPException(
                status_code=500,
                detail="Помилка створення платежу"
            )

    else:
        raise HTTPException(status_code=400, detail="Невірний метод оплати")


@router.get("/")
async def get_orders(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати історію замовлень
    """
    offset = (page - 1) * limit

    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(
        Order.created_at.desc()
    ).offset(offset).limit(limit).all()

    total = db.query(Order).filter(Order.user_id == current_user.id).count()

    orders_data = []
    for order in orders:
        orders_data.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "payment_status": order.payment_status,
            "payment_method": order.payment_method,
            "total": order.total,
            "items_count": len(order.items),
            "created_at": order.created_at.isoformat(),
            "completed_at": order.completed_at.isoformat() if order.completed_at else None
        })

    return {
        "orders": orders_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


@router.get("/{order_id}")
async def get_order_details(
    order_id: int,
    language: str = "en",
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати детальну інформацію про замовлення
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")

    items = []
    for item in order.items:
        items.append({
            "product_id": item.product_id,
            "title": item.product.get_title(language) if item.product else item.product_title,
            "price": item.product_price,
            "discount_percent": item.discount_percent,
            "final_price": item.final_price,
            "is_downloaded": item.is_downloaded,
            "download_count": item.download_count
        })

    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "subtotal": order.subtotal,
        "discount_amount": order.discount_amount,
        "bonuses_used": order.bonuses_used,
        "total": order.total,
        "cashback_amount": order.cashback_amount,
        "cashback_credited": order.cashback_credited,
        "items": items,
        "created_at": order.created_at.isoformat(),
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "email": order.email,
        "email_sent": order.email_sent
    }


async def check_order_payment_status(order_id: int, payment_id: str, db: Session):
    """
    Фонова задача для перевірки статусу оплати
    """
    order = db.query(Order).filter(Order.id == order_id).first()

    if order and order.payment_status == "pending":
        status = payment_service.check_payment_status(payment_id)

        if status == "paid":
            order.payment_status = "completed"
            order.status = "completed"
            order.completed_at = datetime.utcnow()

            # Нараховуємо кешбек
            if order.cashback_amount > 0:
                order.user.balance += order.cashback_amount
                order.cashback_credited = True

            # Оновлюємо VIP статус
            order.user.total_spent += order.total
            order.user.update_vip_level()

            # Очищаємо кошик
            db.query(CartItem).filter(CartItem.user_id == order.user_id).delete()

            db.commit()


async def send_order_email(order: Order, db: Session):
    """
    Відправити email з деталями замовлення
    """
    #TODO: Налаштувати SMTP та відправку email
    pass