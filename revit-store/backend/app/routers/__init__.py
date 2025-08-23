"""
Роутери для OhMyRevit API
"""

# Імпортуємо всі роутери для зручності
from . import auth
from . import admin
from . import referrals
from . import creators
from . import bonuses
from . import orders
from . import products
from . import subscriptions


# Буде додано пізніше:
# from . import users

__all__ = [
    "auth",
    "products",
    "bonuses",
    "orders",
    "subscriptions",
    "admin",
    "referrals",
    "creators"
    # "users"  # Додати коли буде готово
]