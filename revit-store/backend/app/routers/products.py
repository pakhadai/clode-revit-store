"""
Роутер для роботи з продуктами (архівами Revit)
"""
import os
from fastapi.responses import FileResponse
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from typing import List, Optional, Dict
from datetime import datetime

from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.models.collection import Collection
from app.routers.auth import get_current_user_from_token
from app.services.telegram_bot import bot_service

# Створюємо роутер
router = APIRouter(
    prefix="/api/products",
    tags=["Products"]
)


# ====== ЕНДПОІНТИ ======

@router.get("/", response_model=Dict)
async def get_products(
        # Параметри пагінації
        page: int = Query(1, ge=1, description="Номер сторінки"),
        limit: int = Query(20, ge=1, le=100, description="Кількість товарів на сторінці"),

        # Фільтри
        category: Optional[str] = Query(None, description="Категорія: free, premium, creator"),
        product_type: Optional[str] = Query(None, description="Тип: furniture, textures, components"),
        min_price: Optional[int] = Query(None, ge=0, description="Мінімальна ціна в центах"),
        max_price: Optional[int] = Query(None, ge=0, description="Максимальна ціна в центах"),
        is_free: Optional[bool] = Query(None, description="Тільки безкоштовні"),
        is_featured: Optional[bool] = Query(None, description="Тільки популярні"),
        is_new: Optional[bool] = Query(None, description="Тільки новинки"),
        has_discount: Optional[bool] = Query(None, description="Тільки зі знижкою"),

        # Пошук
        search: Optional[str] = Query(None, description="Пошук по назві та опису"),
        tags: Optional[str] = Query(None, description="Теги через кому: modern,classic"),

        # Сортування
        sort_by: str = Query("created_at", description="Поле сортування: price, rating, downloads, created_at"),
        sort_order: str = Query("desc", description="Порядок: asc або desc"),

        # Мова
        language: str = Query("en", description="Мова для назв: en, uk, ru"),

        db: Session = Depends(get_db),

        current_user: Optional[User] = Depends(get_current_user_from_token)
):

    """
    Отримати список продуктів з фільтрацією та пагінацією

    Фільтри:
    - category: free, premium, creator
    - product_type: furniture, textures, components
    - min_price/max_price: ціновий діапазон
    - is_free: тільки безкоштовні
    - is_featured: популярні товари
    - is_new: новинки
    - has_discount: товари зі знижкою

    Сортування:
    - price: за ціною
    - rating: за рейтингом
    - downloads: за кількістю завантажень
    - created_at: за датою додавання
    """

    # Базовий запит
    query = db.query(Product).filter(Product.is_active == True)

    # === ФІЛЬТРИ ===

    # Категорія
    if category:
        query = query.filter(Product.category == category)

    # Тип продукту
    if product_type:
        query = query.filter(Product.product_type == product_type)

    # Ціновий діапазон
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    # Безкоштовні
    if is_free is not None:
        if is_free:
            query = query.filter(Product.price == 0)
        else:
            query = query.filter(Product.price > 0)

    # Популярні
    if is_featured is not None:
        query = query.filter(Product.is_featured == is_featured)

    # Новинки
    if is_new is not None:
        query = query.filter(Product.is_new == is_new)

    # Зі знижкою
    if has_discount:
        query = query.filter(
            and_(
                Product.discount_percent > 0,
                Product.discount_ends_at > datetime.utcnow()
            )
        )

    # Пошук по назві та опису
    if search:
        search_term = f"%{search.lower()}%"
        # Шукаємо в JSON полях
        query = query.filter(
            or_(
                Product.title.cast(db.String).ilike(search_term),
                Product.description.cast(db.String).ilike(search_term),
                Product.sku.ilike(search_term)
            )
        )

    # Фільтр по тегах
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        for tag in tag_list:
            query = query.filter(Product.tags.cast(db.String).contains(tag))

    # === СОРТУВАННЯ ===

    order_column = {
        'price': Product.price,
        'rating': Product.rating,
        'downloads': Product.downloads_count,
        'created_at': Product.created_at
    }.get(sort_by, Product.created_at)

    if sort_order == 'asc':
        query = query.order_by(asc(order_column))
    else:
        query = query.order_by(desc(order_column))

    # === ПАГІНАЦІЯ ===

    # Підрахунок загальної кількості
    total = query.count()

    # Обчислення offset
    offset = (page - 1) * limit

    # Отримання товарів для поточної сторінки
    products = query.offset(offset).limit(limit).all()

    # === ФОРМУВАННЯ ВІДПОВІДІ ===

    user_collections_products = {}
    if current_user:
        # Один раз отримуємо всі ID товарів, які є в колекціях користувача
        user_collections = db.query(Collection).filter(Collection.user_id == current_user.id).all()
        for coll in user_collections:
            for prod in coll.products:
                if prod.id not in user_collections_products:
                    user_collections_products[prod.id] = coll.icon

    products_data = []
    for product in products:
        # Отримуємо поточну ціну з урахуванням знижки
        current_price = product.get_current_price()

        # Формуємо дані продукту
        product_data = {
            "id": product.id,
            "sku": product.sku,
            "title": product.get_title(language),
            "description": product.get_description(language),
            "category": product.category,
            "product_type": product.product_type,
            "price": product.price,
            "current_price": current_price,
            "discount_percent": product.discount_percent if product.discount_ends_at and product.discount_ends_at > datetime.utcnow() else 0,
            "is_free": product.is_free(),
            "is_featured": product.is_featured,
            "is_new": product.is_new,
            "preview_images": product.preview_images or [],
            "rating": product.rating,
            "ratings_count": product.ratings_count,
            "downloads_count": product.downloads_count,
            "tags": product.tags or [],
            "requires_subscription": product.requires_subscription,
            "file_size": product.file_size,
            "created_at": product.created_at.isoformat(),
            # --- ВИПРАВЛЕННЯ: Додаємо іконку, якщо товар є в одній з колекцій ---
            "collection_icon": user_collections_products.get(product.id, "🤍")
        }

        products_data.append(product_data)

    # Метадані для пагінації
    total_pages = (total + limit - 1) // limit

    return {
        "products": products_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        },
        "filters_applied": {
            "category": category,
            "product_type": product_type,
            "search": search,
            "tags": tags
        }
    }


@router.get("/{product_id}")
async def get_product(
        product_id: int,
        language: str = Query("en", description="Мова: en, ua, ru"),
        db: Session = Depends(get_db)
):
    """
    Отримати детальну інформацію про продукт
    """
    # Шукаємо продукт
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Продукт не знайдено"
        )

    # Збільшуємо лічильник переглядів
    product.views_count += 1
    db.commit()

    # Тимчасово без перевірки користувача
    can_download = product.is_free()
    is_purchased = False

    # Інформація про творця
    creator_info = None
    if product.creator:
        creator_info = {
            "id": product.creator.id,
            "username": product.creator.username,
            "first_name": product.creator.first_name,
            "verified": product.creator.creator_verified
        }

    # Формуємо відповідь
    return {
        "id": product.id,
        "sku": product.sku,
        "title": product.get_title(language),
        "description": product.get_description(language),
        "category": product.category,
        "product_type": product.product_type,
        "price": product.price,
        "current_price": product.get_current_price(),
        "discount_percent": product.discount_percent if product.discount_ends_at and product.discount_ends_at > datetime.utcnow() else 0,
        "discount_ends_at": product.discount_ends_at.isoformat() if product.discount_ends_at else None,
        "is_free": product.is_free(),
        "is_featured": product.is_featured,
        "is_new": product.is_new,
        "preview_images": product.preview_images or [],
        "rating": product.rating,
        "ratings_count": product.ratings_count,
        "downloads_count": product.downloads_count,
        "views_count": product.views_count,
        "tags": product.tags or [],
        "requires_subscription": product.requires_subscription,
        "file_size": product.file_size,
        "creator": creator_info,
        "can_download": can_download,
        "is_purchased": is_purchased,
        "created_at": product.created_at.isoformat(),
        "released_at": product.released_at.isoformat()
    }


@router.get("/featured/home", response_model=Dict)
async def get_home_products(
        language: str = Query("en"),
        db: Session = Depends(get_db)
):
    """
    Отримати продукти для головної сторінки
    - Новинки
    - Популярні
    - Товар тижня (з найбільшою знижкою)
    """

    # Новинки (останні 8)
    new_products = db.query(Product).filter(
        Product.is_active == True,
        Product.is_new == True
    ).order_by(desc(Product.created_at)).limit(8).all()

    # Популярні (топ 8 по завантаженнях)
    featured_products = db.query(Product).filter(
        Product.is_active == True,
        Product.is_featured == True
    ).order_by(desc(Product.downloads_count)).limit(8).all()

    # Товар тижня (найбільша знижка)
    product_of_week = db.query(Product).filter(
        Product.is_active == True,
        Product.discount_percent > 0,
        Product.discount_ends_at > datetime.utcnow()
    ).order_by(desc(Product.discount_percent)).first()

    # Форматуємо дані
    def format_product_short(p):
        return {
            "id": p.id,
            "sku": p.sku,
            "title": p.get_title(language),
            "price": p.price,
            "current_price": p.get_current_price(),
            "discount_percent": p.discount_percent if p.discount_ends_at and p.discount_ends_at > datetime.utcnow() else 0,
            "preview_images": p.preview_images or [],
            "rating": p.rating,
            "is_free": p.is_free()
        }

    return {
        "new_products": [format_product_short(p) for p in new_products],
        "featured_products": [format_product_short(p) for p in featured_products],
        "product_of_week": format_product_short(product_of_week) if product_of_week else None
    }


@router.post("/{product_id}/favorite")
async def toggle_favorite(
        product_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_token)
):
    """
    Додати/видалити з обраного
    """
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Продукт не знайдено")

    # Перевіряємо чи вже в обраному
    if product in current_user.favorites:
        # Видаляємо з обраного
        current_user.favorites.remove(product)
        db.commit()
        return {"message": "Видалено з обраного", "is_favorite": False}
    else:
        # Додаємо в обране
        current_user.favorites.append(product)
        db.commit()
        return {"message": "Додано в обране", "is_favorite": True}


@router.get("/user/favorites", response_model=List)
async def get_user_favorites(
        language: str = Query("en"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user_from_token)
):
    """
    Отримати список обраних товарів користувача
    """
    favorites = []
    for product in current_user.favorites:
        if product.is_active:
            favorites.append({
                "id": product.id,
                "sku": product.sku,
                "title": product.get_title(language),
                "price": product.price,
                "current_price": product.get_current_price(),
                "preview_image": product.preview_images[0] if product.preview_images else None,
                "rating": product.rating
            })

    return favorites


@router.get("/user/downloads")
async def get_user_downloads(
        language: str = Query("uk"),
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
):
    """
    Отримати всі товари, доступні користувачу для завантаження.
    """
    downloads = {
        "free": [],
        "purchased": [],
        "subscription": []
    }

    # 1. Знаходимо всі безкоштовні товари
    free_products = db.query(Product).filter(Product.is_active == True, Product.price == 0).all()
    for p in free_products:
        downloads["free"].append({
            "id": p.id,
            "title": p.get_title(language),
            "description": p.get_description(language),
            "preview_image": p.preview_images[0] if p.preview_images else None
        })

    # 2. TODO: Знаходимо всі куплені товари
    # Тут буде логіка пошуку товарів в успішних замовленнях користувача
    # purchased_items = db.query(OrderItem).join(Order).filter(Order.user_id == current_user.id, Order.status == 'completed').all()
    # for item in purchased_items: ...

    # 3. TODO: Знаходимо товари, доступні по підписці
    # active_subscription = current_user.get_active_subscription(db)
    # if active_subscription:
    #     subscription_products = db.query(Product).filter(Product.requires_subscription == True, Product.released_at >= active_subscription.started_at).all()
    #     for p in subscription_products: ...

    return downloads


@router.get("/{product_id}/download")
async def download_product_archive(
    product_id: int,
    via_bot: bool = False, # Новий параметр для вибору методу
    language: str = Query("uk"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Надає файл архіву для завантаження або відправляє його через бота.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не знайдено")

    # TODO: Додайте тут логіку перевірки, чи користувач купив цей товар

    file_path = os.path.join("/app", product.file_url.lstrip('/'))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл архіву не знайдено на сервері")

    # Якщо фронтенд повідомив, що пряме завантаження не вдалося,
    # відправляємо архів через бота як запасний варіант.
    if via_bot:
        success = await bot_service.send_archive_message(
            telegram_id=current_user.telegram_id,
            product=product,
            file_path=file_path,
            language=language
        )
        if success:
            product.downloads_count += 1
            db.commit()
            return {"success": True, "message": f"Архів '{product.get_title(language)}' було відправлено вам в особисті повідомлення."}
        else:
            raise HTTPException(status_code=500, detail="Не вдалося відправити архів. Можливо, ви не запустили бота або заблокували його.")

    # Стандартна логіка для прямого завантаження,
    # яка спрацює для більшості браузерів.
    product.downloads_count += 1
    db.commit()
    filename = os.path.basename(file_path)
    headers = {"Content-Disposition": f"attachment; filename=\"{filename}\""}
    return FileResponse(path=file_path, media_type='application/octet-stream', headers=headers)
