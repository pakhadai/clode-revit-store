# ====== PostgreSQL Settings ======
DB_USER=ohmyrevit_user
DB_PASSWORD=your_secure_password_here
DB_NAME=ohmyrevit_db
DB_HOST=postgres
DB_PORT=5432

# Для локальної розробки без Docker:
# DB_HOST=localhost

# ====== Redis Settings ======
REDIS_HOST=redis
REDIS_PORT=6379

# ====== JWT Settings ======
# Згенеруйте секретний ключ командою:
# python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET=your_super_secret_jwt_key_here

# ====== Telegram Bot Settings ======
# Отримайте від @BotFather в Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=OhMyRevitBot

# ====== AWS S3 Settings ======
# Для зберігання файлів архівів
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=ohmyrevit-archives
AWS_REGION=eu-central-1

# ====== Cryptomus Payment Settings ======
# Реєстрація: https://cryptomus.com/
# Документація: https://doc.cryptomus.com/
CRYPTOMUS_API_KEY=your_cryptomus_api_key
CRYPTOMUS_MERCHANT_ID=your_merchant_id
CRYPTOMUS_SECRET_KEY=your_secret_key

# Webhook URL для callback від Cryptomus
# Замініть на ваш домен в production
WEBHOOK_URL=https://your-domain.com

# ====== CORS Settings ======
# Дозволені домени для CORS (через кому)
CORS_ORIGINS=http://localhost:3000,http://localhost,https://your-domain.com

# ====== Email Settings (опціонально) ======
# Для відправки email з деталями замовлень
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=OhMyRevit <noreply@ohmyrevit.com>

# ====== Application Settings ======
# Production або Development
ENVIRONMENT=development

# Секретний ключ для адмін-доступу
ADMIN_SECRET_KEY=your_admin_secret_key

# URL фронтенду
FRONTEND_URL=http://localhost:3000

# ====== Referral System Settings ======
# Бонуси за реферальну систему
REFERRAL_REGISTRATION_BONUS=30
REFERRAL_PURCHASE_PERCENT=5

# ====== VIP System Settings ======
# Суми для VIP рівнів (в доларах)
VIP_BRONZE_THRESHOLD=100
VIP_SILVER_THRESHOLD=500
VIP_GOLD_THRESHOLD=1000
VIP_DIAMOND_THRESHOLD=5000

# Кешбек для VIP рівнів (у відсотках)
VIP_BRONZE_CASHBACK=3
VIP_SILVER_CASHBACK=5
VIP_GOLD_CASHBACK=7
VIP_DIAMOND_CASHBACK=10