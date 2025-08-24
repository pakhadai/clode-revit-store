"""
Роутер для роботи з колекціями користувачів
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.collection import Collection
from app.routers.auth import get_current_user_from_token

router = APIRouter(
    prefix="/api/collections",
    tags=["Collections"]
)


@router.get("/")
async def get_user_collections(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Отримати всі колекції поточного користувача."""
    collections = db.query(Collection).filter(Collection.user_id == current_user.id).order_by(Collection.created_at.desc()).all()
    return [{
        "id": c.id,
        "name": c.name,
        "icon": c.icon, # Додаємо іконку
        "product_count": len(c.products),
        "previews": [p.preview_images[0] for p in c.products[:4] if p.preview_images]
    } for c in collections]


@router.post("/")
async def create_collection(
    data: Dict,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Створити нову колекцію."""
    name = data.get("name")
    icon = data.get("icon", "🤍") # Отримуємо іконку, або ставимо дефолтну
    if not name:
        raise HTTPException(status_code=400, detail="Назва колекції є обов'язковою")

    new_collection = Collection(user_id=current_user.id, name=name, icon=icon) # Додаємо іконку при створенні
    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)

    # Якщо передано product_id, одразу додаємо його до нової колекції
    product_id = data.get("product_id")
    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            new_collection.products.append(product)
            db.commit()

    return {"id": new_collection.id, "name": new_collection.name, "product_count": len(new_collection.products)}


@router.post("/products/toggle")
async def toggle_product_in_collection(
        data: Dict,
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
):
    """Додати або видалити продукт з колекції."""
    collection_id = data.get("collection_id")
    product_id = data.get("product_id")

    collection = db.query(Collection).filter(Collection.id == collection_id,
                                             Collection.user_id == current_user.id).first()
    product = db.query(Product).filter(Product.id == product_id).first()

    if not collection or not product:
        raise HTTPException(status_code=404, detail="Колекцію або продукт не знайдено")

    if product in collection.products:
        collection.products.remove(product)
        action = "removed"
    else:
        collection.products.append(product)
        action = "added"

    db.commit()
    return {"status": "success", "action": action}


@router.put("/{collection_id}")
async def update_collection(
        collection_id: int,
        data: Dict,
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
):
    """Оновити назву та іконку колекції."""
    collection = db.query(Collection).filter(Collection.id == collection_id,
                                             Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Колекцію не знайдено")

    if "name" in data:
        collection.name = data["name"]
    if "icon" in data:
        collection.icon = data["icon"]

    collection.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "message": "Колекцію оновлено"}


@router.delete("/{collection_id}")
async def delete_collection(
        collection_id: int,
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
):
    """Видалити колекцію."""
    collection = db.query(Collection).filter(Collection.id == collection_id,
                                             Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Колекцію не знайдено")

    db.delete(collection)
    db.commit()
    return {"status": "success", "message": "Колекцію видалено"}


@router.get("/product-status/{product_id}")
async def get_product_collection_status(
        product_id: int,
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
):
    """Перевірити, в яких колекціях знаходиться товар, і повернути іконку."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не знайдено")

    # Знаходимо першу колекцію користувача, в якій є цей товар
    collection = db.query(Collection).filter(
        Collection.user_id == current_user.id,
        Collection.products.any(id=product.id)
    ).first()

    if collection:
        return {"in_collection": True, "icon": collection.icon}
    else:
        return {"in_collection": False, "icon": "🤍"}


@router.get("/{collection_id}")
async def get_collection_details(
        collection_id: int,
        language: str = "en",
        current_user: User = Depends(get_current_user_from_token),
        db: Session = Depends(get_db)
):
    """Отримати детальний вміст колекції."""
    collection = db.query(Collection).filter(Collection.id == collection_id,
                                             Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Колекцію не знайдено")

    products = [{
        "id": p.id,
        "title": p.get_title(language),
        "preview_image": p.preview_images[0] if p.preview_images else None,
        "price": p.get_current_price()
    } for p in collection.products]

    return {"id": collection.id, "name": collection.name, "products": products}