"""
Роутери для OhMyRevit API
"""

# Імпортуємо всі роутери для зручності
from . import auth
from . import products
from . import bonuses

# Буде додано пізніше:
# from . import orders
# from . import subscriptions
# from . import users
# from . import admin

__all__ = [
    "auth",
    "products",
    "bonuses"
]