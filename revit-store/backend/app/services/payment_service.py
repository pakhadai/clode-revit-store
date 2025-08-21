"""
Сервіс для роботи з платіжною системою Cryptomus
"""

import hashlib
import hmac
import json
import os
import uuid
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()


class PaymentService:
    """
    Сервіс для інтеграції з Cryptomus API

    Документація: https://doc.cryptomus.com/
    """

    def __init__(self):
        self.api_key = os.getenv("CRYPTOMUS_API_KEY")
        self.merchant_id = os.getenv("CRYPTOMUS_MERCHANT_ID")
        self.secret_key = os.getenv("CRYPTOMUS_SECRET_KEY")
        self.base_url = "https://api.cryptomus.com/v1"
        self.webhook_url = os.getenv("WEBHOOK_URL", "https://your-domain.com/api/subscriptions/webhook/cryptomus")

        if not all([self.api_key, self.merchant_id, self.secret_key]):
            print("⚠️ Cryptomus credentials not configured!")

    def create_payment(
        self,
        amount: float,
        currency: str = "USDT",
        order_id: str = None,
        description: str = "OhMyRevit Purchase",
        user_id: int = None,
        subscription_id: int = None
    ) -> Dict:
        """
        Створити платіж в Cryptomus

        Args:
            amount: Сума в USD
            currency: Криптовалюта (BTC, ETH, USDT, etc.)
            order_id: Унікальний ID замовлення
            description: Опис платежу
            user_id: ID користувача
            subscription_id: ID підписки (якщо є)

        Returns:
            Дані платежу з payment_url
        """
        if not order_id:
            order_id = str(uuid.uuid4())

        # Підготовка даних
        payload = {
            "amount": str(amount),
            "currency": "USD",
            "network": self._get_network(currency),
            "order_id": order_id,
            "url_return": f"{self.webhook_url}/success",
            "url_callback": self.webhook_url,
            "is_payment_multiple": False,
            "lifetime": 3600,  # 1 година
            "to_currency": currency,
            "additional_data": json.dumps({
                "user_id": user_id,
                "subscription_id": subscription_id,
                "description": description
            })
        }

        # Генеруємо підпис
        sign = self._generate_signature(payload)

        headers = {
            "merchant": self.merchant_id,
            "sign": sign,
            "Content-Type": "application/json"
        }

        try:
            # Робимо запит до API
            with httpx.Client() as client:
                response = client.post(
                    f"{self.base_url}/payment",
                    json=payload,
                    headers=headers
                )

            if response.status_code == 200:
                data = response.json()

                if data.get("state") == 0:  # Успішно
                    return {
                        "success": True,
                        "payment_id": data["result"]["uuid"],
                        "payment_url": data["result"]["url"],
                        "address": data["result"]["address"],
                        "amount_crypto": data["result"]["amount"],
                        "network": data["result"]["network"],
                        "expires_at": data["result"]["expired_at"]
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("message", "Payment creation failed")
                    }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }

        except Exception as e:
            print(f"Cryptomus payment error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def check_payment_status(self, payment_id: str) -> str:
        """
        Перевірити статус платежу

        Args:
            payment_id: ID платежу в Cryptomus

        Returns:
            Статус: pending, paid, failed, etc.
        """
        payload = {
            "uuid": payment_id
        }

        sign = self._generate_signature(payload)

        headers = {
            "merchant": self.merchant_id,
            "sign": sign,
            "Content-Type": "application/json"
        }

        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{self.base_url}/payment/info",
                    json=payload,
                    headers=headers
                )

            if response.status_code == 200:
                data = response.json()
                if data.get("state") == 0:
                    return data["result"]["payment_status"]

            return "unknown"

        except Exception as e:
            print(f"Check payment status error: {e}")
            return "error"

    def verify_webhook_signature(self, request_data: Dict) -> bool:
        """
        Перевірити підпис webhook від Cryptomus

        Args:
            request_data: Дані з webhook

        Returns:
            True якщо підпис валідний
        """
        received_sign = request_data.get("sign")
        if not received_sign:
            return False

        # Видаляємо sign з даних для перевірки
        data_to_verify = {k: v for k, v in request_data.items() if k != "sign"}

        # Генеруємо очікуваний підпис
        expected_sign = self._generate_signature(data_to_verify)

        return hmac.compare_digest(received_sign, expected_sign)

    def _generate_signature(self, data: Dict) -> str:
        """
        Генерувати підпис для запиту

        Args:
            data: Дані для підпису

        Returns:
            MD5 хеш підпису
        """
        # Сортуємо ключі та створюємо JSON
        sorted_data = json.dumps(data, sort_keys=True, separators=(',', ':'))

        # Кодуємо в base64
        import base64
        encoded = base64.b64encode(sorted_data.encode()).decode()

        # Генеруємо MD5 хеш
        sign_string = encoded + self.secret_key
        return hashlib.md5(sign_string.encode()).hexdigest()

    def _get_network(self, currency: str) -> str:
        """
        Отримати мережу для криптовалюти

        Args:
            currency: Код валюти

        Returns:
            Назва мережі
        """
        networks = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "USDT": "tron",  # або ethereum - залежить від вибору
            "TRX": "tron",
            "LTC": "litecoin",
            "BNB": "bsc",
            "USDC": "ethereum"
        }
        return networks.get(currency.upper(), "ethereum")

    def create_withdrawal(
        self,
        amount: float,
        address: str,
        currency: str = "USDT",
        network: str = None
    ) -> Dict:
        """
        Створити запит на виведення коштів (для творців)

        Args:
            amount: Сума для виведення
            address: Адреса гаманця
            currency: Криптовалюта
            network: Мережа (якщо не вказано - автоматично)

        Returns:
            Результат запиту
        """
        if not network:
            network = self._get_network(currency)

        payload = {
            "amount": str(amount),
            "currency": currency,
            "network": network,
            "address": address,
            "order_id": str(uuid.uuid4()),
            "is_subtract": True  # Комісія з суми
        }

        sign = self._generate_signature(payload)

        headers = {
            "merchant": self.merchant_id,
            "sign": sign,
            "Content-Type": "application/json"
        }

        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{self.base_url}/payout",
                    json=payload,
                    headers=headers
                )

            if response.status_code == 200:
                data = response.json()

                if data.get("state") == 0:
                    return {
                        "success": True,
                        "withdrawal_id": data["result"]["uuid"],
                        "amount": data["result"]["amount"],
                        "commission": data["result"]["commission"],
                        "status": data["result"]["status"]
                    }
                else:
                    return {
                        "success": False,
                        "error": data.get("message", "Withdrawal failed")
                    }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }

        except Exception as e:
            print(f"Withdrawal error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def get_exchange_rates(self) -> Dict:
        """
        Отримати поточні курси криптовалют

        Returns:
            Курси валют відносно USD
        """
        try:
            with httpx.Client() as client:
                response = client.get(f"{self.base_url}/exchange-rate/list")

            if response.status_code == 200:
                data = response.json()
                if data.get("state") == 0:
                    rates = {}
                    for item in data["result"]:
                        if item["to"] == "USD":
                            rates[item["from"]] = float(item["rate"])
                    return rates

            return {}

        except Exception as e:
            print(f"Get exchange rates error: {e}")
            return {}


class PromoCodeService:
    """
    Сервіс для роботи з промокодами
    """

    @staticmethod
    def validate_promo_code(code: str, db) -> Optional[Dict]:
        """
        Перевірити промокод

        Args:
            code: Промокод
            db: Сесія БД

        Returns:
            Інформація про промокод або None
        """
        from app.models.order import PromoCode

        promo = db.query(PromoCode).filter(
            PromoCode.code == code.upper()
        ).first()

        if not promo or not promo.is_valid():
            return None

        return {
            "id": promo.id,
            "code": promo.code,
            "discount_type": promo.discount_type,
            "discount_value": promo.discount_value,
            "min_order_amount": promo.min_order_amount
        }

    @staticmethod
    def apply_promo_code(promo_id: int, db) -> bool:
        """
        Застосувати промокод (збільшити лічильник використань)

        Args:
            promo_id: ID промокода
            db: Сесія БД

        Returns:
            True якщо успішно
        """
        from app.models.order import PromoCode

        promo = db.query(PromoCode).filter(
            PromoCode.id == promo_id
        ).first()
        
        if promo:
            promo.uses_count += 1
            db.commit()
            return True

        return False