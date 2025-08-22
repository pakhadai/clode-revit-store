# Заглушка для Telegram Bot сервісу
class BotService:
    async def send_message(self, telegram_id, message):
        # TODO: Реалізувати через aiogram
        print(f"Send to {telegram_id}: {message}")

bot_service = BotService()