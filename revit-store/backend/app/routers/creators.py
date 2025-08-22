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

