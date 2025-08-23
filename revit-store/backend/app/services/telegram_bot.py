"""
Сервіс для роботи з Telegram Bot
Відправка повідомлень та розсилок
"""

import os
import json
from typing import Optional, List, Dict
import httpx
from dotenv import load_dotenv

# Завантажуємо змінні оточення
load_dotenv()

class TelegramBotService:
    """
    Сервіс для взаємодії з Telegram Bot API
    """

    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not self.bot_token or self.bot_token == "your_telegram_bot_token":
            print("⚠️ TELEGRAM_BOT_TOKEN не встановлений. Сервіс буде працювати в режимі логування.")
            self.bot_token = None
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"

    async def _make_request(self, method: str, data: Dict, files: Optional[Dict] = None) -> Optional[Dict]:
        """
        Універсальний метод для відправки запитів до Telegram API.
        Підтримує відправку як JSON-даних, так і файлів.
        """
        if not self.bot_token:
            print(f"📦 TELEGRAM API CALL (DRY RUN): Метод={method}, Дані={data}, Файли={'Так' if files else 'Ні'}")
            return {"ok": True, "result": "Dry run success"}

        # Для запитів без файлів використовуємо json, для запитів з файлами - data.
        # Це дозволяє httpx автоматично встановлювати правильний Content-Type.
        is_multipart = files is not None
        request_kwargs = {
            "timeout": 60.0 if is_multipart else 15.0,
            "files": files,
            "data": data if is_multipart else None,
            "json": data if not is_multipart else None,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(f"{self.api_url}/{method}", **request_kwargs)
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
        Відправити текстове повідомлення користувачу.
        """
        payload = {
            "chat_id": telegram_id,
            "text": message,
            "parse_mode": parse_mode
        }
        if reply_markup:
            # Використовуємо json.dumps для коректної серіалізації клавіатури
            payload["reply_markup"] = json.dumps(reply_markup)

        response = await self._make_request("sendMessage", data=payload)
        return response and response.get("ok", False)

    async def send_photo(
            self,
            telegram_id: int,
            photo_path_or_url: str,
            caption: Optional[str] = None,
            parse_mode: str = "HTML"
    ) -> bool:
        """
        Відправити фото користувачу з локального файлу або URL.
        """
        payload = {
            "chat_id": telegram_id,
            "caption": caption,
            "parse_mode": parse_mode
        }
        files = None

        if os.path.exists(photo_path_or_url):
            try:
                photo_file = open(photo_path_or_url, 'rb')
                files = {'photo': photo_file}
                response = await self._make_request("sendPhoto", data=payload, files=files)
                photo_file.close()
                return response and response.get("ok", False)
            except IOError as e:
                print(f"❌ Не вдалося відкрити файл фото: {e}")
                return False
        else:
            payload['photo'] = photo_path_or_url
            response = await self._make_request("sendPhoto", data=payload)
            return response and response.get("ok", False)

    async def send_document(
        self,
        telegram_id: int,
        file_path: str,
        caption: Optional[str] = None,
        parse_mode: str = "HTML"
    ) -> bool:
        """
        Відправити документ користувачу з локального файлу.
        """
        payload = {
            "chat_id": telegram_id,
            "caption": caption,
            "parse_mode": parse_mode
        }

        try:
            with open(file_path, "rb") as doc_file:
                files_to_send = {"document": (os.path.basename(file_path), doc_file)}
                response = await self._make_request("sendDocument", data=payload, files=files_to_send)
            return response and response.get("ok", False)
        except IOError as e:
            print(f"❌ Не вдалося відкрити файл документа: {e}")
            return False

    async def send_archive_message(
        self,
        telegram_id: int,
        product: "Product",
        file_path: str,
        language: str = "uk"
    ) -> bool:
        """
        Відправляє повідомлення з архівом, фото та описом.
        """
        caption = (
            f"<b>{product.get_title(language)}</b>\n\n"
            f"<i>{product.get_description(language)}</i>\n\n"
            f"<b>Тип:</b> {product.product_type}\n"
            f"<b>Категорія:</b> {product.category}"
        )

        try:
            if product.preview_images:
                preview_path = os.path.join("/app", product.preview_images[0].lstrip('/'))
                if os.path.exists(preview_path):
                    await self.send_photo(telegram_id, photo_path_or_url=preview_path)

            success = await self.send_document(
                telegram_id,
                file_path=file_path,
                caption=caption
            )
            return success
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
            # Використовуємо json.dumps для коректної серіалізації цін
            "prices": json.dumps(prices)
        }
        response = await self._make_request("sendInvoice", data=payload_data)
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
        return {"total": len(telegram_ids), "sent": sent, "failed": failed}

    async def set_webhook(self, webhook_url: str) -> bool:
        """
        Встановити webhook для бота.
        """
        payload = {"url": webhook_url}
        response = await self._make_request("setWebhook", data=payload)
        if response and response.get("ok"):
            print(f"✅ Webhook успішно встановлено на: {webhook_url}")
            return True
        print(f"❌ Не вдалося встановити webhook.")
        return False

    async def delete_webhook(self) -> bool:
        """
        Видалити webhook.
        """
        response = await self._make_request("deleteWebhook", data={})
        if response and response.get("ok"):
            print("✅ Webhook успішно видалено.")
            return True
        print("❌ Не вдалося видалити webhook.")
        return False

    async def get_me(self) -> Optional[Dict]:
        """
        Отримати інформацію про бота.
        """
        response = await self._make_request("getMe", data={})
        if response and response.get("ok"):
            return response.get("result")
        return None

# Створюємо глобальний екземпляр сервісу
bot_service = TelegramBotService()

# Експортуємо для зручності
__all__ = ['bot_service', 'TelegramBotService']
