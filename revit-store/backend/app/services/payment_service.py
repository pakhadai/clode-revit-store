"""
Сервіс для роботи з платіжною системою Cryptomus
"""

import hashlib
import hmac
import json
import uuid
from datetime import datetime
from typing import Dict, Optional
import httpx
from decimal import Decimal
import os
from dotenv import load_dotenv

load_dotenv()

# Конфігурація Cryptomus
CRYPTOMUS_API_KEY = os.getenv("CRYPTOMUS_API_KEY", "")
CRYPTOMUS_MERCHANT_ID = os.getenv("CRYPTOMUS_MERCHANT_ID", "")
CRYPTOMUS_API_URL = "https://api.cryptomus.com/v1"


class PaymentService:
    """
    Сервіс для роботи з Cryptomus API
    Документація: https://doc.cryptomus.com/
    """

    def __init__(self):
        self.api_key = CRYPTOMUS_API_KEY
        self.merchant_id = CRYPTOMUS_MERCHANT_ID

        if not self.api_key or not self.merchant_id:
            raise ValueError("Cryptomus API credentials not configured in .env")

    def _generate_signature(self, data: Dict) -> str:
        """
        Генерація підпису для запиту

        Args:
            data: Дані для підпису

        Returns:
            MD5 хеш підпису
        """
        # Сортуємо ключі та формуємо рядок
        sorted_data = dict(sorted(data.items()))
        sign_string = json.dumps(sorted_data, separators=(',', ':'))

        # Створюємо підпис
        sign = hashlib.md5(
            f"{sign_string}{self.api_key}".encode()
        ).hexdigest()

        return sign

    def _make_request(self, endpoint: str, data: Dict) -> Dict:
        """
        Виконати запит до Cryptomus API

        Args:
            endpoint: Ендпоінт API
            data: Дані запиту

        Returns:
            Відповідь від API
        """
        # Додаємо merchant_id
        data['merchant'] = self.merchant_id

        # Генеруємо підпис
        sign = self._generate_signature(data)

        # Заголовки
        headers = {
            'merchant': self.merchant_id,
            'sign': sign,
            'Content-Type': 'application/json'
        }

        try:
            # Робимо запит
            with httpx.Client() as client:
                response = client.post(
                    f"{CRYPTOMUS_API_URL}{endpoint}",
                    json=data,
                    headers=headers,
                    timeout=30
                )

                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as e:
            print(f"Cryptomus API error: {e}")
            raise Exception(f"Payment service error: {str(e)}")

    def create_payment(
            self,
            amount: float,
            currency: str,
            order_id: str,
            user_id: int,
            description: str,
            plan_type: Optional[str] = None,
            success_url: Optional[str] = None,
            fail_url: Optional[str] = None,
            callback_url: Optional[str] = None
    ) -> Dict:
        """
        Створити платіж

        Args:
            amount: Сума платежу
            currency: Валюта (USD, EUR, RUB)
            order_id: ID замовлення
            user_id: ID користувача
            description: Опис платежу
            plan_type: Тип підписки (monthly/yearly)
            success_url: URL для редіректу після успішної оплати
            fail_url: URL для редіректу після невдалої оплати
            callback_url: URL для webhook

        Returns:
            Дані платежу з посиланням для оплати
        """
        # Формуємо дані платежу
        payment_data = {
            'amount': str(amount),
            'currency': currency,
            'order_id': order_id,
            'url_return': success_url or f"https://t.me/{os.getenv('TELEGRAM_BOT_USERNAME', 'ohmyrevit_bot')}",
            'url_callback': callback_url or f"{os.getenv('BACKEND_URL', 'https://api.ohmyrevit.com')}/api/payments/webhook",
            'is_payment_multiple': False,
            'lifetime': 3600,  # 1 година на оплату
            'additional_data': json.dumps({
                'user_id': user_id,
                'plan_type': plan_type,
                'description': description
            })
        }

        # Додаємо URL для невдалої оплати якщо є
        if fail_url:
            payment_data['url_fail'] = fail_url

        # Робимо запит
        response = self._make_request('/payment', payment_data)

        if response.get('state') == 0:
            return {
                'success': True,
                'payment_id': response['result']['uuid'],
                'payment_url': response['result']['url'],
                'amount': amount,
                'currency': currency,
                'expires_at': response['result'].get('expired_at')
            }
        else:
            raise Exception(f"Failed to create payment: {response.get('message', 'Unknown error')}")

    def check_payment_status(self, payment_id: str) -> Dict:
        """
        Перевірити статус платежу

        Args:
            payment_id: ID платежу в Cryptomus

        Returns:
            Статус платежу
        """
        data = {
            'uuid': payment_id
        }

        response = self._make_request('/payment/info', data)

        if response.get('state') == 0:
            result = response['result']

            # Мапимо статуси Cryptomus на наші
            status_map = {
                'paid': 'completed',
                'paid_over': 'completed',
                'confirm_check': 'processing',
                'wrong_amount': 'failed',
                'fail': 'failed',
                'cancel': 'cancelled',
                'system_fail': 'failed',
                'refund_process': 'refunding',
                'refund_fail': 'failed',
                'refund_paid': 'refunded'
            }

            return {
                'payment_id': result['uuid'],
                'status': status_map.get(result['status'], 'pending'),
                'cryptomus_status': result['status'],
                'amount': float(result['amount']),
                'currency': result['currency'],
                'crypto_amount': result.get('payer_amount'),
                'crypto_currency': result.get('payer_currency'),
                'txid': result.get('txid'),
                'is_final': result.get('is_final', False)
            }
        else:
            raise Exception(f"Failed to check payment: {response.get('message', 'Unknown error')}")

    def verify_webhook(self, data: Dict, sign: str) -> bool:
        """
        Перевірити підпис webhook від Cryptomus

        Args:
            data: Дані webhook
            sign: Підпис від Cryptomus

        Returns:
            True якщо підпис валідний
        """
        # Генеруємо наш підпис
        expected_sign = self._generate_signature(data)

        # Порівнюємо
        return hmac.compare_digest(sign, expected_sign)

    def process_webhook(self, data: Dict) -> Dict:
        """
        Обробити webhook від Cryptomus

        Args:
            data: Дані webhook

        Returns:
            Оброблені дані платежу
        """
        # Витягуємо основні дані
        payment_id = data.get('uuid')
        status = data.get('status')
        order_id = data.get('order_id')

        # Додаткові дані
        additional_data = {}
        if data.get('additional_data'):
            try:
                additional_data = json.loads(data['additional_data'])
            except:
                pass

        # Мапимо статуси
        status_map = {
            'paid': 'completed',
            'paid_over': 'completed',
            'confirm_check': 'processing',
            'wrong_amount': 'failed',
            'fail': 'failed',
            'cancel': 'cancelled',
            'system_fail': 'failed'
        }

        return {
            'payment_id': payment_id,
            'order_id': order_id,
            'status': status_map.get(status, 'pending'),
            'cryptomus_status': status,
            'amount': float(data.get('amount', 0)),
            'currency': data.get('currency'),
            'crypto_amount': data.get('payer_amount'),
            'crypto_currency': data.get('payer_currency'),
            'txid': data.get('txid'),
            'user_id': additional_data.get('user_id'),
            'plan_type': additional_data.get('plan_type'),
            'is_final': data.get('is_final', False)
        }

    def create_subscription_payment(
            self,
            user_id: int,
            plan_type: str,
            language: str = 'en'
    ) -> Dict:
        """
        Створити платіж для підписки

        Args:
            user_id: ID користувача
            plan_type: Тип підписки (monthly/yearly)
            language: Мова для опису

        Returns:
            Дані платежу
        """
        # Плани підписок
        plans = {
            'monthly': {
                'price_usd': 5.00,
                'days': 30,
                'description': {
                    'en': 'OhMyRevit Premium - Monthly Subscription',
                    'ua': 'OhMyRevit Premium - Місячна підписка',
                    'ru': 'OhMyRevit Premium - Месячная подписка'
                }
            },
            'yearly': {
                'price_usd': 50.00,
                'days': 365,
                'description': {
                    'en': 'OhMyRevit Premium - Yearly Subscription (Save 2 months!)',
                    'ua': 'OhMyRevit Premium - Річна підписка (Економія 2 місяці!)',
                    'ru': 'OhMyRevit Premium - Годовая подписка (Экономия 2 месяца!)'
                }
            }
        }

        if plan_type not in plans:
            raise ValueError(f"Invalid plan type: {plan_type}")

        plan = plans[plan_type]

        # Генеруємо унікальний order_id
        order_id = f"SUB_{user_id}_{plan_type}_{uuid.uuid4().hex[:8]}"

        # Створюємо платіж
        return self.create_payment(
            amount=plan['price_usd'],
            currency='USD',
            order_id=order_id,
            user_id=user_id,
            description=plan['description'].get(language, plan['description']['en']),
            plan_type=plan_type
        )

    def create_order_payment(
            self,
            order_id: str,
            user_id: int,
            amount: float,
            currency: str = 'USD',
            description: str = None,
            language: str = 'en'
    ) -> Dict:
        """
        Створити платіж для замовлення

        Args:
            order_id: ID замовлення
            user_id: ID користувача
            amount: Сума платежу
            currency: Валюта
            description: Опис
            language: Мова

        Returns:
            Дані платежу
        """
        # Описи за замовчуванням
        default_descriptions = {
            'en': f'OhMyRevit Order #{order_id}',
            'ua': f'OhMyRevit Замовлення #{order_id}',
            'ru': f'OhMyRevit Заказ #{order_id}'
        }

        if not description:
            description = default_descriptions.get(language, default_descriptions['en'])

        return self.create_payment(
            amount=amount,
            currency=currency,
            order_id=order_id,
            user_id=user_id,
            description=description
        )

    @staticmethod
    def calculate_crypto_amount(usd_amount: float, crypto_currency: str) -> Dict:
        """
        Розрахувати приблизну суму в криптовалюті

        Args:
            usd_amount: Сума в USD
            crypto_currency: Криптовалюта (BTC, ETH, USDT, etc)

        Returns:
            Приблизна сума в крипті
        """
        # Приблизні курси (в реальності потрібно отримувати з API)
        approximate_rates = {
            'BTC': 115000,
            'ETH': 4000,
            'USDT': 1,
            'USDC': 1,
            'TRX': 0.250,
            'LTC': 100,
            'BNB': 800
        }

        rate = approximate_rates.get(crypto_currency, 1)
        crypto_amount = usd_amount / rate

        return {
            'amount': round(crypto_amount, 8),
            'currency': crypto_currency,
            'rate': rate,
            'usd_amount': usd_amount
        }