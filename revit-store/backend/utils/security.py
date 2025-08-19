"""
Модуль безпеки для OhMyRevit
Відповідає за JWT токени та хешування
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Завантажуємо змінні оточення
load_dotenv()

# Налаштування JWT
SECRET_KEY = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 днів

# Налаштування для хешування PIN-кодів
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Створює JWT токен для користувача

    Args:
        data: Дані для кодування в токен (звичайно telegram_id)
        expires_delta: Час життя токена

    Returns:
        JWT токен як рядок

    Приклад використання:
        token = create_access_token({"sub": str(telegram_id)})
    """
    to_encode = data.copy()

    # Встановлюємо час закінчення токена
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    # Кодуємо токен
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Перевіряє та декодує JWT токен

    Args:
        token: JWT токен для перевірки

    Returns:
        Декодовані дані з токена або None якщо невалідний

    Приклад:
        payload = verify_access_token(token)
        if payload:
            telegram_id = payload.get("sub")
    """
    try:
        # Декодуємо токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def hash_pin_code(pin_code: str) -> str:
    """
    Хешує PIN-код користувача

    Args:
        pin_code: PIN-код для хешування

    Returns:
        Захешований PIN-код

    Використовується для творців та адмінів
    """
    return pwd_context.hash(pin_code)


def verify_pin_code(plain_pin: str, hashed_pin: str) -> bool:
    """
    Перевіряє PIN-код

    Args:
        plain_pin: Введений PIN-код
        hashed_pin: Збережений хеш PIN-коду

    Returns:
        True якщо PIN-код правильний
    """
    return pwd_context.verify(plain_pin, hashed_pin)


def generate_referral_code(user_id: int) -> str:
    """
    Генерує унікальний реферальний код

    Args:
        user_id: ID користувача

    Returns:
        Реферальний код (наприклад: "REF_123_ABC")
    """
    random_part = secrets.token_urlsafe(4)[:4].upper()
    return f"REF_{user_id}_{random_part}"


def generate_order_number() -> str:
    """
    Генерує унікальний номер замовлення

    Returns:
        Номер замовлення (наприклад: "ORD_20240115_ABCD")
    """
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = secrets.token_urlsafe(4)[:4].upper()
    return f"ORD_{date_part}_{random_part}"


# Функція для генерації випадкового ключа при першому запуску
def generate_secret_key():
    """
    Генерує новий секретний ключ для JWT
    Використовуйте при першій установці:

    python -c "from app.utils.security import generate_secret_key; print(generate_secret_key())"

    І додайте в .env файл:
    JWT_SECRET=згенерований_ключ
    """
    return secrets.token_urlsafe(32)