"""
Сервіси для OhMyRevit
"""

from .telegram_auth import TelegramAuth

# Буде додано пізніше:
# from .payment_service import PaymentService
# from .s3_service import S3Service
# from .notification_service import NotificationService

__all__ = [
    "TelegramAuth"
]