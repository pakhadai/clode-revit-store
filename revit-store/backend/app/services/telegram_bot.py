"""
Сервіс для роботи з Telegram Bot
Відправка повідомлень та розсилок
"""

import os
from typing import Optional, List, Dict
from dotenv import load_dotenv

load_dotenv()


class TelegramBotService:
    """
    Сервіс для взаємодії з Telegram Bot API
    """

    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")

        if not self.bot_token:
            print("⚠️ TELEGRAM_BOT_TOKEN не встановлений - розсилки не працюватимуть")

    async def send_message(
            self,
            telegram_id: int,
            message: str,
            parse_mode: str = "HTML"
    ) -> bool:
        """
        Відправити повідомлення користувачу

        Args:
            telegram_id: Telegram ID користувача
            message: Текст повідомлення
            parse_mode: Режим парсингу (HTML, Markdown)

        Returns:
            True якщо успішно відправлено
        """
        # TODO: Реалізувати через aiogram або httpx
        # Поки що просто логуємо
        print(f"📨 Telegram message to {telegram_id}:")
        print(f"   {message}")

        # В реальній реалізації тут буде:
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"https://api.telegram.org/bot{self.bot_token}/sendMessage",
        #         json={
        #             "chat_id": telegram_id,
        #             "text": message,
        #             "parse_mode": parse_mode
        #         }
        #     )
        #     return response.status_code == 200

        return True

    async def send_photo(
            self,
            telegram_id: int,
            photo_url: str,
            caption: Optional[str] = None
    ) -> bool:
        """
        Відправити фото користувачу

        Args:
            telegram_id: Telegram ID користувача
            photo_url: URL фото
            caption: Підпис до фото

        Returns:
            True якщо успішно відправлено
        """
        print(f"📸 Telegram photo to {telegram_id}: {photo_url}")
        if caption:
            print(f"   Caption: {caption}")

        return True

    async def send_document(
            self,
            telegram_id: int,
            document_url: str,
            caption: Optional[str] = None
    ) -> bool:
        """
        Відправити документ користувачу

        Args:
            telegram_id: Telegram ID користувача
            document_url: URL документа
            caption: Підпис до документа

        Returns:
            True якщо успішно відправлено
        """
        print(f"📄 Telegram document to {telegram_id}: {document_url}")
        if caption:
            print(f"   Caption: {caption}")

        return True

    async def send_invoice(
            self,
            telegram_id: int,
            title: str,
            description: str,
            payload: str,
            provider_token: str,
            currency: str,
            prices: List[Dict]
    ) -> bool:
        """
        Відправити інвойс для оплати

        Args:
            telegram_id: Telegram ID користувача
            title: Назва товару
            description: Опис
            payload: Payload для ідентифікації
            provider_token: Токен платіжного провайдера
            currency: Валюта
            prices: Список цін

        Returns:
            True якщо успішно відправлено
        """
        print(f"💳 Telegram invoice to {telegram_id}: {title}")
        print(f"   Amount: {sum(p.get('amount', 0) for p in prices)} {currency}")

        return True

    async def broadcast(
            self,
            telegram_ids: List[int],
            message: str,
            parse_mode: str = "HTML"
    ) -> Dict:
        """
        Масова розсилка повідомлень

        Args:
            telegram_ids: Список Telegram ID
            message: Текст повідомлення
            parse_mode: Режим парсингу

        Returns:
            Статистика розсилки
        """
        sent = 0
        failed = 0

        for telegram_id in telegram_ids:
            try:
                success = await self.send_message(telegram_id, message, parse_mode)
                if success:
                    sent += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ Failed to send to {telegram_id}: {e}")
                failed += 1

        return {
            "total": len(telegram_ids),
            "sent": sent,
            "failed": failed
        }

    async def set_webhook(self, webhook_url: str) -> bool:
        """
        Встановити webhook для бота

        Args:
            webhook_url: URL для webhook

        Returns:
            True якщо успішно встановлено
        """
        print(f"🔗 Setting webhook: {webhook_url}")

        # TODO: Реалізувати через API
        # response = await client.post(
        #     f"https://api.telegram.org/bot{self.bot_token}/setWebhook",
        #     json={"url": webhook_url}
        # )

        return True

    async def delete_webhook(self) -> bool:
        """
        Видалити webhook

        Returns:
            True якщо успішно видалено
        """
        print("🔗 Deleting webhook")

        return True

    async def get_me(self) -> Optional[Dict]:
        """
        Отримати інформацію про бота

        Returns:
            Інформація про бота
        """
        # TODO: Реалізувати через API
        return {
            "id": 123456789,
            "is_bot": True,
            "first_name": "OhMyRevit Bot",
            "username": "ohmyrevit_bot"
        }


# Створюємо глобальний екземпляр сервісу
bot_service = TelegramBotService()

# Експортуємо для зручності
__all__ = ['bot_service', 'TelegramBotService']