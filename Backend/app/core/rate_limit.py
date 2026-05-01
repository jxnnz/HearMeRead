"""
Shared rate limiter instance.

Separated from main.py to avoid circular imports
(routes import the limiter, main.py imports the routes).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
