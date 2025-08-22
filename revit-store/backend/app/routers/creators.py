"""
Роутер для кабінету творця
Управління товарами та статистика продажів
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.routers.auth import get_current_user_from_token
from app.services.s3_service import s3_service
from app.utils.security import generate_unique_code

# Створюємо роутер
router = APIRouter(
    prefix="/api/creators",
    tags=["Creators"]
)


# ====== MIDDLEWARE ======

async def get_creator_user(
    current_user: User = Depends(get_current_user_from_token)
) -> User:
    """
    Перевірка чи користувач є творцем
    """
    if not current_user.is_creator:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Creator account required."
        )
    return current_user


# ====== УПРАВЛІННЯ ТОВАРАМИ ======

@router.get("/products")
async def get_creator_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="pending, approved, rejected"),
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати товари творця

    Args:
        page: Номер сторінки
        limit: Кількість на сторінці
        status: Фільтр по статусу модерації

    Returns:
        Список товарів творця з пагінацією
    """
    # Базовий запит
    query = db.query(Product).filter(Product.creator_id == creator.id)

    # Фільтр по статусу
    if status:
        if status == 'pending':
            query = query.filter(Product.is_approved == False, Product.rejection_reason == None)
        elif status == 'approved':
            query = query.filter(Product.is_approved == True)
        elif status == 'rejected':
            query = query.filter(Product.rejection_reason != None)

    # Пагінація
    total = query.count()
    offset = (page - 1) * limit
    products = query.order_by(desc(Product.created_at)).offset(offset).limit(limit).all()

    # Формуємо відповідь
    return {
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "title": p.title,
                "price": p.price,
                "category": p.category,
                "is_active": p.is_active,
                "is_approved": p.is_approved,
                "rejection_reason": p.rejection_reason,
                "downloads_count": p.downloads_count,
                "views_count": p.views_count,
                "rating": p.rating,
                "created_at": p.created_at.isoformat()
            }
            for p in products
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


@router.post("/products")
async def create_product(
    # Форм дані
    title_en: str = Form(..., description="Title in English"),
    title_ua: Optional[str] = Form(None, description="Title in Ukrainian"),
    title_ru: Optional[str] = Form(None, description="Title in Russian"),
    description_en: str = Form(..., description="Description in English"),
    description_ua: Optional[str] = Form(None),
    description_ru: Optional[str] = Form(None),
    price: int = Form(..., ge=0, description="Price in cents"),
    category: str = Form(..., description="free, premium, creator"),
    product_type: str = Form(..., description="furniture, textures, components"),
    tags: Optional[str] = Form(None, description="Tags separated by comma"),

    # Файли
    archive_file: UploadFile = File(..., description="Archive file (ZIP, RAR, 7Z)"),
    preview_images: List[UploadFile] = File(..., description="Preview images (1-5)"),

    # Залежності
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Створити новий товар

    Returns:
        Інформація про створений товар
    """
    try:
        # Валідація кількості превʼю
        if len(preview_images) < 1 or len(preview_images) > 5:
            raise HTTPException(
                status_code=400,
                detail="You must upload 1-5 preview images"
            )

        # Завантажуємо архів на S3
        archive_result = await s3_service.upload_file(
            archive_file,
            folder_type='archives',
            public=False,
            metadata={
                'creator_id': creator.id,
                'product_type': product_type
            }
        )

        if not archive_result['success']:
            raise HTTPException(
                status_code=500,
                detail="Failed to upload archive file"
            )

        # Завантажуємо превʼю зображення
        preview_urls = []
        for idx, image_file in enumerate(preview_images):
            image_result = await s3_service.upload_file(
                image_file,
                folder_type='previews',
                public=True,  # Превʼю публічні
                metadata={
                    'creator_id': creator.id,
                    'preview_index': idx
                }
            )

            if image_result['success']:
                preview_urls.append(image_result['file_url'])

        # Формуємо мультимовні дані
        title_json = {
            "en": title_en,
            "ua": title_ua or title_en,
            "ru": title_ru or title_en
        }

        description_json = {
            "en": description_en,
            "ua": description_ua or description_en,
            "ru": description_ru or description_en
        }

        # Обробляємо теги
        tags_list = []
        if tags:
            tags_list = [tag.strip() for tag in tags.split(',') if tag.strip()]

        # Створюємо продукт
        product = Product(
            sku=f"CRT{creator.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            title=title_json,
            description=description_json,
            category=category,
            product_type=product_type,
            price=price,
            file_url=archive_result['s3_key'],  # Зберігаємо S3 ключ
            file_size=archive_result['file_size'],
            preview_images=preview_urls,
            tags=tags_list,
            creator_id=creator.id,
            is_active=False,  # Неактивний до модерації
            is_approved=False,  # Потребує схвалення
            created_at=datetime.utcnow()
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        return {
            "success": True,
            "message": "Product created successfully. Waiting for moderation.",
            "product": {
                "id": product.id,
                "sku": product.sku,
                "title": product.title,
                "status": "pending_moderation"
            }
        }

    except Exception as e:
        print(f"Error creating product: {e}")
        # Видаляємо завантажені файли якщо щось пішло не так
        if 'archive_result' in locals():
            s3_service.delete_file(archive_result['s3_key'])
        if 'preview_urls' in locals():
            for url in preview_urls:
                # Видаляємо превʼю
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create product: {str(e)}"
        )


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    title: Optional[Dict] = None,
    description: Optional[Dict] = None,
    price: Optional[int] = None,
    tags: Optional[List[str]] = None,
    is_active: Optional[bool] = None,
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Оновити товар

    Args:
        product_id: ID товару

    Returns:
        Оновлений товар
    """
    # Шукаємо товар
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.creator_id == creator.id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Оновлюємо поля
    if title is not None:
        product.title = title
    if description is not None:
        product.description = description
    if price is not None:
        product.price = price
    if tags is not None:
        product.tags = tags
    if is_active is not None and product.is_approved:
        product.is_active = is_active

    product.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(product)

    return {
        "success": True,
        "message": "Product updated successfully",
        "product": {
            "id": product.id,
            "sku": product.sku,
            "title": product.title,
            "is_active": product.is_active
        }
    }


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Видалити товар

    Args:
        product_id: ID товару

    Returns:
        Результат видалення
    """
    # Шукаємо товар
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.creator_id == creator.id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Перевіряємо чи немає активних замовлень
    has_orders = db.query(OrderItem).filter(
        OrderItem.product_id == product_id
    ).first() is not None

    if has_orders:
        # Не видаляємо, а деактивуємо
        product.is_active = False
        db.commit()

        return {
            "success": True,
            "message": "Product deactivated (has orders)",
            "deactivated": True
        }

    # Видаляємо файли з S3
    if product.file_url:
        s3_service.delete_file(product.file_url)

    # Видаляємо продукт
    db.delete(product)
    db.commit()

    return {
        "success": True,
        "message": "Product deleted successfully",
        "deleted": True
    }


# ====== СТАТИСТИКА ======

@router.get("/statistics")
async def get_creator_statistics(
    period: str = Query("month", description="day, week, month, year, all"),
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати статистику продажів

    Args:
        period: Період статистики

    Returns:
        Детальна статистика
    """
    # Визначаємо період
    now = datetime.utcnow()
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:  # all
        start_date = datetime(2020, 1, 1)

    # Отримуємо продукти творця
    creator_products = db.query(Product.id).filter(
        Product.creator_id == creator.id
    ).subquery()

    # Рахуємо продажі
    sales_query = db.query(
        func.count(OrderItem.id).label('total_sales'),
        func.sum(OrderItem.final_price).label('total_revenue')
    ).join(
        Order, OrderItem.order_id == Order.id
    ).filter(
        OrderItem.product_id.in_(creator_products),
        Order.status == 'completed',
        Order.created_at >= start_date
    )

    sales_data = sales_query.first()

    # Топ продукти
    top_products = db.query(
        Product.id,
        Product.sku,
        Product.title,
        func.count(OrderItem.id).label('sales_count'),
        func.sum(OrderItem.final_price).label('revenue')
    ).join(
        OrderItem, Product.id == OrderItem.product_id
    ).join(
        Order, OrderItem.order_id == Order.id
    ).filter(
        Product.creator_id == creator.id,
        Order.status == 'completed',
        Order.created_at >= start_date
    ).group_by(
        Product.id, Product.sku, Product.title
    ).order_by(
        desc('sales_count')
    ).limit(5).all()

    # Статистика по продуктах
    products_stats = db.query(
        func.count(Product.id).label('total_products'),
        func.count(Product.id).filter(Product.is_active == True).label('active_products'),
        func.count(Product.id).filter(Product.is_approved == True).label('approved_products'),
        func.count(Product.id).filter(Product.is_approved == False, Product.rejection_reason == None).label('pending_products')
    ).filter(
        Product.creator_id == creator.id
    ).first()

    # Загальна статистика переглядів та завантажень
    views_downloads = db.query(
        func.sum(Product.views_count).label('total_views'),
        func.sum(Product.downloads_count).label('total_downloads'),
        func.avg(Product.rating).label('average_rating')
    ).filter(
        Product.creator_id == creator.id
    ).first()

    # Графік продажів по днях (останні 30 днів)
    thirty_days_ago = now - timedelta(days=30)
    daily_sales = db.query(
        func.date(Order.created_at).label('date'),
        func.count(OrderItem.id).label('sales'),
        func.sum(OrderItem.final_price).label('revenue')
    ).join(
        OrderItem, Order.id == OrderItem.order_id
    ).filter(
        OrderItem.product_id.in_(creator_products),
        Order.status == 'completed',
        Order.created_at >= thirty_days_ago
    ).group_by(
        func.date(Order.created_at)
    ).order_by(
        func.date(Order.created_at)
    ).all()

    return {
        "period": period,
        "sales": {
            "total_sales": sales_data.total_sales or 0,
            "total_revenue": sales_data.total_revenue or 0,
            "commission_rate": 0.2,  # 20% комісія платформи
            "net_revenue": int((sales_data.total_revenue or 0) * 0.8)  # 80% творцю
        },
        "products": {
            "total": products_stats.total_products or 0,
            "active": products_stats.active_products or 0,
            "approved": products_stats.approved_products or 0,
            "pending": products_stats.pending_products or 0
        },
        "engagement": {
            "total_views": views_downloads.total_views or 0,
            "total_downloads": views_downloads.total_downloads or 0,
            "average_rating": round(views_downloads.average_rating or 0, 2),
            "conversion_rate": round(
                ((views_downloads.total_downloads or 0) / (views_downloads.total_views or 1)) * 100,
                2
            )
        },
        "top_products": [
            {
                "id": p.id,
                "sku": p.sku,
                "title": p.title.get('en') if isinstance(p.title, dict) else p.title,
                "sales": p.sales_count,
                "revenue": p.revenue
            }
            for p in top_products
        ],
        "daily_chart": [
            {
                "date": sale.date.isoformat(),
                "sales": sale.sales,
                "revenue": sale.revenue
            }
            for sale in daily_sales
        ]
    }


# ====== ВИВЕДЕННЯ КОШТІВ ======

@router.get("/withdrawals")
async def get_withdrawals(
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Отримати історію виведення коштів

    Returns:
        Історія та поточний баланс
    """
    # Тут буде інтеграція з Cryptomus для виведення
    # Поки що повертаємо заглушку

    return {
        "available_balance": creator.creator_balance or 0,
        "pending_withdrawal": 0,
        "total_withdrawn": creator.creator_withdrawn or 0,
        "withdrawals": [],
        "minimum_withdrawal": 1000,  # $10.00
        "commission": 0.02  # 2% комісія за виведення
    }


@router.post("/withdrawals")
async def request_withdrawal(
    amount: int = Form(..., ge=1000, description="Amount in cents (min $10)"),
    wallet_address: str = Form(..., description="Crypto wallet address"),
    currency: str = Form(..., description="USDT, BTC, ETH"),
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Запит на виведення коштів

    Args:
        amount: Сума в центах
        wallet_address: Адреса гаманця
        currency: Валюта

    Returns:
        Інформація про запит
    """
    # Перевіряємо баланс
    if amount > (creator.creator_balance or 0):
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance"
        )

    # Тут буде інтеграція з Cryptomus API

    return {
        "success": True,
        "message": "Withdrawal request created",
        "request_id": "WD_" + generate_unique_code(),
        "amount": amount,
        "commission": int(amount * 0.02),
        "net_amount": int(amount * 0.98),
        "status": "pending",
        "estimated_time": "24-48 hours"
    }


# ====== ПІДТРИМКА ======

@router.post("/support")
async def contact_support(
    subject: str = Form(...),
    message: str = Form(...),
    creator: User = Depends(get_creator_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Відправити повідомлення в підтримку

    Returns:
        Результат відправки
    """
    # Тут буде інтеграція з системою тікетів

    return {
        "success": True,
        "message": "Support ticket created",
        "ticket_id": "TKT_" + generate_unique_code(),
        "estimated_response": "24 hours"
    }