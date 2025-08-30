"""
Сервіс для автентифікації через Telegram Web App
Перевіряє дані від Telegram Mini App
"""

import hashlib
import hmac
import json
import time
from typing import Dict, Optional
from urllib.parse import unquote
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
            # --- ВИПРАВЛЕНО ТУТ ---
            # Отримуємо hash з параметрів
            parsed_data = {}
            for item in init_data.split("&"):
                if "=" in item:
                    key, value = item.split("=", 1)
                    parsed_data[key] = value
            received_hash = parsed_data.pop("hash", None)

            if not received_hash:
                return False

            # Створюємо рядок для перевірки
            data_check_string = "\n".join(
                f"{key}={unquote(value)}" for key, value in sorted(parsed_data.items())
            )

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

    def validate_widget_data(self, user_data: Dict) -> bool:
        """
        Перевіряє підпис даних від Telegram Login Widget.
        """
        try:
            data_to_check = user_data.copy()
            received_hash = data_to_check.pop("hash", None)
            if not received_hash:
                return False

            data_check_list = [f"{key}={value}" for key, value in data_to_check.items()]
            data_check_list.sort()
            data_check_string = "\n".join(data_check_list)

            secret_key = hashlib.sha256(self.bot_token.encode()).digest()
            expected_hash = hmac.new(
                secret_key, data_check_string.encode(), hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(received_hash, expected_hash)
        except Exception as e:
            print(f"Помилка валідації даних Telegram Widget: {e}")
            return False

    def parse_user_data(self, init_data: str) -> Optional[Dict]:
        """
        Витягує дані користувача з initData

        Args:
            init_data: Рядок initData від Telegram

        Returns:
            Словник з даними користувача або None
        """
        try:
            # Парсимо параметри
            parsed = dict(item.split("=") for item in init_data.split("&"))

            # Отримуємо user JSON
            user_json_str = parsed.get('user')
            if not user_json_str:
                return None

            # Декодуємо JSON
            user_data = json.loads(unquote(user_json_str))

            # Додаємо додаткові параметри
            user_data['auth_date'] = parsed.get('auth_date')
            user_data['query_id'] = parsed.get('query_id')
            user_data['start_param'] = parsed.get('start_param')  # Реферальний код

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