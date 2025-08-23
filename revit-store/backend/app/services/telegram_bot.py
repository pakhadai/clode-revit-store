"""
Сервіс для роботи з Telegram Bot
Відправка повідомлень та розсилок
"""

import os
from typing import Optional, List, Dict
import httpx
from dotenv import load_dotenv

load_dotenv()


class TelegramBotService:
    """
    Сервіс для взаємодії з Telegram Bot API
    """

    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not self.bot_token or self.bot_token == "your_telegram_bot_token":
            print("⚠️ TELEGRAM_BOT_TOKEN не встановлений або має значення за замовчуванням. Сервіс буде працювати в режимі логування.")
            self.bot_token = None
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"

    async def _make_request(self, method: str, data: Dict) -> Optional[Dict]:
        """Універсальний метод для відправки запитів до Telegram API."""
        if not self.bot_token:
            print(f"📦 TELEGRAM API CALL (DRY RUN): Метод={method}, Дані={data}")
            return {"ok": True, "result": "Dry run success"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(f"{self.api_url}/{method}", json=data, timeout=10.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"❌ Помилка HTTP запиту до Telegram API: {e.response.status_code} - {e.response.text}")
            except httpx.RequestError as e:
                print(f"❌ Помилка запиту до Telegram API: {e}")
            except Exception as e:
                print(f"❌ Невідома помилка при роботі з Telegram API: {e}")
        return None

    async def send_message(
            self,
            telegram_id: int,
            message: str,
            parse_mode: str = "HTML",
            reply_markup: Optional[Dict] = None
    ) -> bool:
        """
        Відправити повідомлення користувачу.
        """
        payload = {
            "chat_id": telegram_id,
            "text": message,
            "parse_mode": parse_mode
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        response = await self._make_request("sendMessage", payload)
        return response and response.get("ok", False)

    async def send_photo(
            self,
            telegram_id: int,
            photo_url: str,
            caption: Optional[str] = None,
            parse_mode: str = "HTML"
    ) -> bool:
        """
        Відправити фото користувачу.
        """
        payload = {
            "chat_id": telegram_id,
            "photo": photo_url,
            "caption": caption,
            "parse_mode": parse_mode
        }
        response = await self._make_request("sendPhoto", payload)
        return response and response.get("ok", False)

    async def send_document(
            self,
            telegram_id: int,
            document_url: str,
            caption: Optional[str] = None,
            parse_mode: str = "HTML"
    ) -> bool:
        """
        Відправити документ користувачу.
        """
        payload = {
            "chat_id": telegram_id,
            "document": document_url,
            "caption": caption,
            "parse_mode": parse_mode
        }
        response = await self._make_request("sendDocument", payload)
        return response and response.get("ok", False)

    async def send_archive_message(
            self,
            telegram_id: int,
            product: "Product",  # Використовуємо модель продукту
            file_path: str,  # Абсолютний шлях до файлу на диску
            language: str = "uk"
    ) -> bool:
        """
        Відправляє повідомлення з архівом, фото та описом.
        """
        if not self.bot_token:
            print(
                f"📦 TELEGRAM BOT (DRY RUN): Відправка архіву '{product.get_title(language)}' користувачу {telegram_id}")
            return True

        # Формуємо підпис до повідомлення
        caption = (
            f"<b>{product.get_title(language)}</b>\n\n"
            f"<i>{product.get_description(language)}</i>\n\n"
            f"<b>Тип:</b> {product.product_type}\n"
            f"<b>Категорія:</b> {product.category}"
        )

        # Відкриваємо файл для відправки
        try:
            with open(file_path, "rb") as archive_file:
                files = {"document": (os.path.basename(file_path), archive_file)}

                params = {
                    "chat_id": telegram_id,
                    "caption": caption,
                    "parse_mode": "HTML"
                }

                # Якщо є прев'ю, додаємо його
                if product.preview_images:
                    params["photo"] = product.preview_images[0]
                    # Якщо є фото, відправляємо його окремо, а потім документ
                    await self.send_photo(telegram_id, product.preview_images[0], caption=caption)
                    await self.send_document(telegram_id, document_url=None,
                                             files={"document": (os.path.basename(file_path), archive_file)})
                    return True

                # Якщо фото немає, відправляємо тільки документ з підписом
                async with httpx.AsyncClient() as client:
                    response = await client.post(f"{self.api_url}/sendDocument", params=params, files=files,
                                                 timeout=60.0)

                response_data = response.json()
                return response_data.get("ok", False)
        except Exception as e:
            print(f"❌ Помилка відправки архіву через бота: {e}")
            return False


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
        Відправити інвойс для оплати через Telegram Payments.
        """
        payload_data = {
            "chat_id": telegram_id,
            "title": title,
            "description": description,
            "payload": payload,
            "provider_token": provider_token,
            "currency": currency,
            "prices": prices
        }
        response = await self._make_request("sendInvoice", payload_data)
        return response and response.get("ok", False)

    async def broadcast(
            self,
            telegram_ids: List[int],
            message: str,
            parse_mode: str = "HTML"
    ) -> Dict:
        """
        Масова розсилка повідомлень.
        """
        sent = 0
        failed = 0

        for telegram_id in telegram_ids:
            if await self.send_message(telegram_id, message, parse_mode):
                sent += 1
            else:
                failed += 1

        print(f"📊 Результат розсилки: Успішно - {sent}, Невдало - {failed}")
        return {
            "total": len(telegram_ids),
            "sent": sent,
            "failed": failed
        }

    async def set_webhook(self, webhook_url: str) -> bool:
        """
        Встановити webhook для бота.
        """
        payload = {"url": webhook_url}
        response = await self._make_request("setWebhook", payload)
        if response and response.get("ok"):
            print(f"✅ Webhook успішно встановлено на: {webhook_url}")
            return True
        print(f"❌ Не вдалося встановити webhook.")
        return False

    async def delete_webhook(self) -> bool:
        """
        Видалити webhook.
        """
        response = await self._make_request("deleteWebhook", {})
        if response and response.get("ok"):
            print("✅ Webhook успішно видалено.")
            return True
        print("❌ Не вдалося видалити webhook.")
        return False

    async def get_me(self) -> Optional[Dict]:
        """
        Отримати інформацію про бота.
        """
        response = await self._make_request("getMe", {})
        if response and response.get("ok"):
            return response.get("result")
        return None

# Створюємо глобальний екземпляр сервісу
bot_service = TelegramBotService()

# Експортуємо для зручності
__all__ = ['bot_service', 'TelegramBotService']