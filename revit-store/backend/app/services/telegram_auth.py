"""
Сервіс для автентифікації через Telegram Web App
Перевіряє дані від Telegram Mini App
"""

import hashlib
import hmac
import json
import time
from typing import Dict, Optional
from urllib.parse import parse_qs
import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Token - ВАЖЛИВО!
# Отримайте від @BotFather в Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


class TelegramAuth:
    """
    Клас для роботи з Telegram Web App автентифікацією
    """

    def __init__(self, bot_token: str = TELEGRAM_BOT_TOKEN):
        """
        Ініціалізація з токеном бота

        Args:
            bot_token: Токен вашого Telegram бота
        """
        self.bot_token = bot_token
        if not self.bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN не встановлений в .env файлі!")

    def validate_init_data(self, init_data: str) -> bool:
        """
        Перевіряє підпис даних від Telegram Web App

        Args:
            init_data: Рядок initData від Telegram (query string)

        Returns:
            True якщо дані валідні та від Telegram

        Документація: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
        """
        try:
            # Парсимо параметри
            parsed = parse_qs(init_data)

            # Отримуємо hash з параметрів
            received_hash = parsed.get('hash', [''])[0]
            if not received_hash:
                return False

            # Видаляємо hash з параметрів для перевірки
            data_check_string = self._create_data_check_string(init_data)

            # Створюємо секретний ключ
            secret_key = hmac.new(
                b"WebAppData",
                self.bot_token.encode(),
                hashlib.sha256
            ).digest()

            # Обчислюємо очікуваний hash
            expected_hash = hmac.new(
                secret_key,
                data_check_string.encode(),
                hashlib.sha256
            ).hexdigest()

            # Порівнюємо хеші
            return hmac.compare_digest(received_hash, expected_hash)

        except Exception as e:
            print(f"Помилка валідації Telegram даних: {e}")
            return False

    def _create_data_check_string(self, init_data: str) -> str:
        """
        Створює рядок для перевірки підпису

        Args:
            init_data: Рядок initData від Telegram

        Returns:
            Відсортований рядок параметрів без hash
        """
        # Парсимо параметри
        parsed = parse_qs(init_data)

        # Створюємо список пар ключ=значення
        data_pairs = []
        for key, values in parsed.items():
            if key != 'hash':  # Пропускаємо hash
                # Беремо перше значення (в query string може бути кілька)
                value = values[0] if values else ''
                data_pairs.append(f"{key}={value}")

        # Сортуємо алфавітно та об'єднуємо через \n
        data_pairs.sort()
        return '\n'.join(data_pairs)

    def parse_user_data(self, init_data: str) -> Optional[Dict]:
        """
        Витягує дані користувача з initData

        Args:
            init_data: Рядок initData від Telegram

        Returns:
            Словник з даними користувача або None

        Приклад повернення:
        {
            'id': 123456789,
            'first_name': 'Іван',
            'last_name': 'Петренко',
            'username': 'ivan_petrenko',
            'language_code': 'uk',
            'photo_url': 'https://t.me/...'
        }
        """
        try:
            # Парсимо параметри
            parsed = parse_qs(init_data)

            # Отримуємо user JSON
            user_json = parsed.get('user', [''])[0]
            if not user_json:
                return None

            # Декодуємо JSON
            user_data = json.loads(user_json)

            # Додаємо додаткові параметри
            user_data['auth_date'] = parsed.get('auth_date', [''])[0]
            user_data['query_id'] = parsed.get('query_id', [''])[0]
            user_data['start_param'] = parsed.get('start_param', [''])[0]  # Реферальний код

            return user_data

        except Exception as e:
            print(f"Помилка парсингу даних користувача: {e}")
            return None

    def check_auth_date(self, auth_date: str, max_age_seconds: int = 86400) -> bool:
        """
        Перевіряє чи не застарілі дані автентифікації

        Args:
            auth_date: Unix timestamp автентифікації
            max_age_seconds: Максимальний вік даних (за замовчуванням 24 години)

        Returns:
            True якщо дані не застарілі
        """
        try:
            auth_timestamp = int(auth_date)
            current_timestamp = int(time.time())

            # Перевіряємо чи не старіші дані за max_age_seconds
            return (current_timestamp - auth_timestamp) <= max_age_seconds

        except (ValueError, TypeError):
            return False


# Приклад використання в роутері:
"""
from app.services.telegram_auth import TelegramAuth

telegram_auth = TelegramAuth()

@app.post("/api/auth/telegram")
async def telegram_login(init_data: str):
    # Перевіряємо підпис
    if not telegram_auth.validate_init_data(init_data):
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    # Отримуємо дані користувача
    user_data = telegram_auth.parse_user_data(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Cannot parse user data")

    # Перевіряємо дату
    if not telegram_auth.check_auth_date(user_data.get('auth_date')):
        raise HTTPException(status_code=401, detail="Auth data expired")

    # Далі створюємо/оновлюємо користувача в БД...
"""