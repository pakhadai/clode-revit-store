"""
Роутер для автентифікації користувачів через Telegram Web App
"""

from fastapi import APIRouter, HTTPException, Depends, Body, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.services.telegram_auth import TelegramAuth
from app.utils.security import (
    create_access_token,
    verify_access_token,
    generate_referral_code
)

# Створюємо роутер
router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

# Ініціалізуємо Telegram Auth
telegram_auth = TelegramAuth()

# Security схема для Bearer токенів
security = HTTPBearer(auto_error=False)


# ====== HELPER ФУНКЦІЇ (ВИПРАВЛЕНО) ======

async def get_optional_current_user(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Допоміжна функція для отримання користувача, ЯКЩО він авторизований.
    Якщо токен відсутній або невалідний, функція просто поверне None, не викликаючи помилку.
    Це дозволяє використовувати її для публічних сторінок (маркетплейс, сторінка товару),
    які мають додатковий функціонал для залогінених користувачів (наприклад, кнопка "в обране").
    """
    token = None
    # Спочатку пробуємо отримати токен зі стандартного заголовка Authorization
    if credentials:
        token = credentials.credentials
    # Якщо токена немає в заголовку, шукаємо його в параметрах URL (для завантаження файлів)
    if not token:
        token = request.query_params.get("token")

    # Якщо токен так і не знайдено, повертаємо None (користувач - анонім)
    if not token:
        return None

    # Перевіряємо та декодуємо токен
    payload = verify_access_token(token)
    if not payload:
        return None # Невалідний токен, вважаємо користувача анонімом

    # Отримуємо telegram_id з токена
    telegram_id = payload.get("sub")
    if not telegram_id:
        return None # Неправильний формат токена

    # Шукаємо користувача в базі даних
    user = db.query(User).filter(User.telegram_id == int(telegram_id)).first()

    # Якщо користувача не знайдено або він заблокований, вважаємо його анонімом
    if not user or user.is_blocked:
        return None

    return user

    # Оновлюємо час останнього входу
    user.last_login = datetime.utcnow()
    db.commit()


async def get_current_active_user(
    current_user: User = Depends(get_optional_current_user)
) -> User:
    """
    Допоміжна функція для ЗАХИЩЕНИХ ендпоінтів.
    Вона вимагає, щоб користувач був обов'язково авторизований.
    Якщо get_optional_current_user повернув None, ця функція викличе помилку 401 Unauthorized.
    Використовується для профілю, кошика, завантажень і т.д.
    """
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Необхідна авторизація для цієї дії"
        )
    return current_user


# ====== СХЕМИ ДАНИХ (Pydantic моделі) ======

class TelegramAuthRequest(BaseModel):
    """Запит на автентифікацію через Telegram"""
    init_data: str

class TelegramWidgetUser(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class AuthResponse:
    """Відповідь при успішній автентифікації"""
    access_token: str
    token_type: str = "bearer"
    user: Dict


class UserResponse:
    """Відповідь з даними користувача"""
    id: int
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    language: str
    theme: str
    balance: int
    vip_level: int
    is_creator: bool
    is_admin: bool
    daily_streak: int
    referral_code: str


# ====== ЕНДПОІНТИ ======

@router.post("/telegram", response_model=Dict)
async def telegram_login(
        request_body: TelegramAuthRequest,
        db: Session = Depends(get_db)
):
    """
    Автентифікація через Telegram Web App

    Приймає:
    - init_data: рядок з даними від Telegram

    Повертає:
    - access_token: JWT токен
    - user: дані користувача
    """
    init_data = request_body.init_data

    # Крок 1: Перевіряємо підпис від Telegram
    if not telegram_auth.validate_init_data(init_data):
        raise HTTPException(
            status_code=401,
            detail="Невалідні дані від Telegram. Перевірте підпис."
        )

    # Крок 2: Парсимо дані користувача
    user_data = telegram_auth.parse_user_data(init_data)
    if not user_data:
        raise HTTPException(
            status_code=400,
            detail="Не вдалося розпарсити дані користувача"
        )

    # Крок 3: Перевіряємо дату автентифікації (не старше 24 годин)
    if not telegram_auth.check_auth_date(user_data.get('auth_date', '')):
        raise HTTPException(
            status_code=401,
            detail="Дані автентифікації застаріли. Спробуйте ще раз."
        )

    # Крок 4: Отримуємо або створюємо користувача
    telegram_id = user_data.get('id')
    if not telegram_id:
        raise HTTPException(
            status_code=400,
            detail="Відсутній Telegram ID"
        )

    # Шукаємо користувача в БД
    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        # Новий користувач - створюємо
        user = User(
            telegram_id=telegram_id,
            username=user_data.get('username'),
            first_name=user_data.get('first_name'),
            last_name=user_data.get('last_name'),
            language=user_data.get('language_code', 'en')[:2],
            photo_url=user_data.get('photo_url'),
            referral_code=generate_referral_code(telegram_id),
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )

        # Перевіряємо реферальний код (start_param)
        referral_code = user_data.get('start_param', '')
        if referral_code:
            # Шукаємо хто запросив
            referrer = db.query(User).filter(
                User.referral_code == referral_code
            ).first()

            if referrer:
                # Встановлюємо хто запросив
                user.referred_by_id = referrer.id

                # Нараховуємо бонуси за реєстрацію
                user.balance = 30  # Новачку 30 бонусів
                referrer.balance += 30  # Тому хто запросив теж 30
                referrer.referral_earnings += 30

                db.add(referrer)

        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"✅ Створено нового користувача: {user.get_full_name()}")
    else:
        # Існуючий користувач - оновлюємо дані
        user.last_login = datetime.utcnow()

        # Оновлюємо дані якщо змінилися
        if user_data.get('username'):
            user.username = user_data.get('username')
        if user_data.get('first_name'):
            user.first_name = user_data.get('first_name')
        if user_data.get('last_name'):
            user.last_name = user_data.get('last_name')
        if user_data.get('photo_url'):
            user.photo_url = user_data.get('photo_url')

        db.commit()
        print(f"✅ Користувач увійшов: {user.get_full_name()}")

    # Крок 5: Створюємо JWT токен
    access_token = create_access_token(
        data={"sub": str(telegram_id)}
    )

    # Крок 6: Формуємо відповідь
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.get_full_name(),
            "language": user.language,
            "theme": user.theme,
            "balance": user.balance,
            "vip_level": user.vip_level,
            "vip_level_name": user.get_vip_level_name(),
            "is_creator": user.is_creator,
            "is_admin": user.is_admin,
            "daily_streak": user.daily_streak,
            "referral_code": user.referral_code,
            "has_subscription": user.has_active_subscription(db),
            "photo_url": user.photo_url
        }
    }


@router.post("/widget-login")
async def widget_login(
        user_data: Dict = Body(...),
        db: Session = Depends(get_db)
):
    """
    Авторизація через Telegram Login Widget (для веб-версії)
    """
    # Перевіряємо підпис від Telegram
    if not telegram_auth.validate_widget_data(user_data):
        raise HTTPException(status_code=401, detail="Invalid authentication data")

    # Отримуємо або створюємо користувача
    telegram_id = user_data.get("id")
    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            photo_url=user_data.get("photo_url"),
            referral_code=generate_referral_code()
        )
        db.add(user)
        db.commit()

    # Створюємо токен
    access_token = create_access_token(data={"sub": str(telegram_id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name
        }
    }


@router.post("/telegram-widget", response_model=Dict)
async def telegram_widget_login(
        widget_user: TelegramWidgetUser,
        db: Session = Depends(get_db)
):
    """
    Автентифікація через Telegram Login Widget на сайті
    """
    # Крок 1: Перевіряємо підпис від Telegram
    # Конвертуємо Pydantic модель в словник для валідації
    user_data_dict = widget_user.model_dump()

    if not telegram_auth.validate_widget_data(user_data_dict):
        raise HTTPException(
            status_code=401,
            detail="Невалідні дані від Telegram Widget."
        )

    # Крок 2: Отримуємо або створюємо користувача
    user = db.query(User).filter(User.telegram_id == widget_user.id).first()

    if not user:
        # Новий користувач - створюємо
        user = User(
            telegram_id=widget_user.id,
            username=widget_user.username,
            first_name=widget_user.first_name,
            last_name=widget_user.last_name,
            photo_url=widget_user.photo_url,
            referral_code=generate_referral_code(widget_user.id),
            last_login=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Існуючий користувач - оновлюємо дані
        user.last_login = datetime.utcnow()
        user.username = widget_user.username
        user.first_name = widget_user.first_name
        user.last_name = widget_user.last_name
        user.photo_url = widget_user.photo_url
        db.commit()

    # Крок 3: Створюємо JWT токен
    access_token = create_access_token(
        data={"sub": str(user.telegram_id)}
    )

    # Крок 4: Формуємо відповідь
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.get_full_name(),
            "language": user.language,
            "theme": user.theme,
            "balance": user.balance,
            "vip_level": user.vip_level,
            "vip_level_name": user.get_vip_level_name(),
            "is_creator": user.is_creator,
            "is_admin": user.is_admin,
            "daily_streak": user.daily_streak,
            "referral_code": user.referral_code,
            "has_subscription": user.has_active_subscription(db),
            "photo_url": user.photo_url
        }
    }


@router.get("/me")
async def get_current_user(
        user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    """
    Отримати дані поточного користувача

    Потрібен Bearer токен в заголовку Authorization
    """
    active_subscription = None
    for sub in user.subscriptions:
        if sub.is_valid():
            active_subscription = {
                "plan_type": sub.plan_type,
                "expires_at": sub.expires_at.isoformat(),
                "days_remaining": sub.days_remaining(),
                "auto_renew": sub.auto_renew
            }
            break

    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.get_full_name(),
        "language": user.language,
        "theme": user.theme,
        "balance": user.balance,
        "vip_level": user.vip_level,
        "vip_level_name": user.get_vip_level_name(),
        "cashback_percent": user.get_cashback_percent(),
        "is_creator": user.is_creator,
        "is_admin": user.is_admin,
        "is_blocked": user.is_blocked,
        "daily_streak": user.daily_streak,
        "free_spins_today": user.free_spins_today,
        "referral_code": user.referral_code,
        "referral_earnings": user.referral_earnings,
        "total_spent": user.total_spent,
        "subscription": active_subscription,
        "created_at": user.created_at.isoformat(),
        "photo_url": user.photo_url
    }


@router.put("/me")
async def update_current_user(
        update_data: Dict,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    """
    Оновити дані поточного користувача
    """
    if not current_user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    # Оновлюємо поля, які дозволено змінювати
    allowed_fields = ['language', 'theme', 'notifications_enabled']
    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(current_user, field, value)

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    # Повертаємо оновлені дані, аналогічно до get_current_user
    active_subscription = None
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
        "id": current_user.id,
        "telegram_id": current_user.telegram_id,
        "username": current_user.username,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "full_name": current_user.get_full_name(),
        "language": current_user.language,
        "theme": current_user.theme,
        "balance": current_user.balance,
        "vip_level": current_user.vip_level,
        "vip_level_name": current_user.get_vip_level_name(),
        "cashback_percent": current_user.get_cashback_percent(),
        "is_creator": current_user.is_creator,
        "is_admin": current_user.is_admin,
        "is_blocked": current_user.is_blocked,
        "daily_streak": current_user.daily_streak,
        "free_spins_today": current_user.free_spins_today,
        "referral_code": current_user.referral_code,
        "referral_earnings": current_user.referral_earnings,
        "total_spent": user.total_spent,
        "subscription": active_subscription,
        "created_at": user.created_at.isoformat(),
        "photo_url": user.photo_url
    }


@router.post("/logout")
async def logout():
    """
    Вихід з системи

    На фронтенді просто видаляємо токен з localStorage
    """
    return {"message": "Вихід виконано успішно"}