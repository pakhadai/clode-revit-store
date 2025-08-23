# 🏛️ OhMyRevit Marketplace

![Revit Logo](https://img.shields.io/badge/Autodesk-Revit-blue?style=for-the-badge&logo=autodesk) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

**OhMyRevit** — це сучасний маркетплейс для продажу та купівлі архівів Revit, глибоко інтегрований з **Telegram Web App**. Платформа надає користувачам зручний доступ до унікального контенту, систему бонусів, підписок та можливості для авторів монетизувати свою роботу.

---

## 📋 Зміст

- [✨ Ключові можливості](#-ключові-можливості)
- [🛠️ Технічний стек](#️-технічний-стек)
- [🏗️ Архітектура проєкту](#️-архітектура-проєкту)
- [🚀 Як почати](#-як-почати)
- [🗺️ План розробки (Roadmap)](#️-план-розробки-roadmap)
- [📝 Основні API Ендпоінти](#-основні-api-ендпоінти)

---

## ✨ Ключові можливості

### 👨‍💻 Для користувачів:
- **🏠 Головна сторінка**: Інформаційна панель з доступом до підписок, новинок, популярних товарів та щоденних бонусів.
- **🛍️ Маркетплейс**: Широкий каталог архівів з потужними фільтрами (ціна, тип, теги, рейтинг) та сортуванням.
- **🎁 Щоденні бонуси та Міні-ігри**: Унікальна стрік-система для отримання щоденних бонусів та інтерактивне "Колесо Фортуни" з можливістю виграти призи.
- **🛒 Кошик**: Зручне управління покупками з можливістю оплати криптовалютою або бонусами.
- **👤 Профіль користувача**: Доступ до завантажень, обраних товарів, історії покупок, а також унікальна реферальна програма та VIP-система.
- **🌍 Мультимовність та теми**: Підтримка мов `EN`/`UA`/`RU` та світлої/темної теми інтерфейсу.

### 🎨 Для творців:
- **🚀 Кабінет творця**: Повноцінний інструмент для завантаження та управління своїми архівами.
- **📊 Статистика**: Детальні графіки продажів, заробітку та популярності товарів.
- **💸 Виведення коштів**: Прозора система для управління фінансами та історією транзакцій.

### ⚙️ Для адміністраторів:
- **👑 Адмін-панель**: Всеохоплюючий контроль над платформою: управління користувачами, товарами, промокодами, а також доступ до детальної аналітики та системних налаштувань.

---

## 🛠️ Технічний стек

| Сфера | Технологія |
| :--- | :--- |
| **Backend** | `FastAPI`, `SQLAlchemy`, `Alembic`, `PostgreSQL` |
| **Frontend** | `Vanilla JavaScript`, `HTML`, `Tailwind CSS` |
| **Інфраструктура** | `Docker`, `Docker Compose`, `Nginx` |
| **Зберігання файлів** | `AWS S3` |
| **Платіжна система** | `Cryptomus API` |
| **PWA** | `Service Workers`, `manifest.json` |

---

## 🏗️ Архітектура проєкту

Проєкт має чітку трирівневу архітектуру, що відокремлює логіку бекенду, фронтенду та конфігурацію сервера.

```plaintext
revit-store/
├── docker-compose.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── database.py
│       ├── models/
│       ├── routers/
│       ├── services/
│       └── utils/
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── manifest.json
│   ├── css/
│   ├── js/
│   └── assets/
└── nginx/
    └── nginx.conf
```
- **`backend/`**: Містить всю логіку API на FastAPI.
- **`frontend/`**: Відповідає за клієнтську частину (UI/UX).
- **`nginx/`**: Налаштування Nginx як зворотного проксі-сервера.
- **`docker-compose.yml`**: Оркестрація всіх сервісів проєкту.

---

## 🚀 Як почати

Для запуску проєкту локально виконайте наступні кроки:

### 1. Передумови
- Встановлений [**Docker**](https://www.docker.com/products/docker-desktop/) та **Docker Compose**.
- Встановлений [**Git**](https://git-scm.com/).

### 2. Клонування репозиторію
```bash
git clone <URL-вашого-репозиторію>
cd revit-store
```

### 3. Налаштування середовища
Створіть файл `.env` в кореневій папці проєкту, скопіювавши `.env.example` (якщо він є) або використавши цей шаблон:

```dotenv
# PostgreSQL Settings
DB_USER=ohmyrevit_user
DB_PASSWORD=your_secure_password
DB_NAME=ohmyrevit_db
DB_HOST=postgres
DB_PORT=5432

# Redis Settings
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Settings
JWT_SECRET=your_super_secret_key_for_jwt

# Telegram Settings
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# AWS S3 Settings
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name

# Cryptomus API Settings
CRYPTOMUS_API_KEY=your_cryptomus_api_key
CRYPTOMUS_MERCHANT_ID=your_cryptomus_merchant_id

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost
```

### 4. Запуск проєкту
Виконайте команду в кореневій папці `revit-store`:

```bash
docker-compose up --build -d
```
- **Frontend** буде доступний за адресою: `http://localhost` (через Nginx)
- **Backend API** буде доступне за адресою: `http://localhost/api/`
- **Документація API (Swagger)**: `http://localhost/api/docs`

---

## 🗺️ План розробки (Roadmap)

Проєкт розробляється поетапно для забезпечення якості та послідовності:

- **Етап 1: Ініціалізація та інфраструктура**: Створення структури проєкту, налаштування Docker.
- **Етап 2: База даних та моделі**: Проєктування схеми БД, створення моделей SQLAlchemy та налаштування міграцій Alembic.
- **Етап 3: Бекенд - базовий функціонал**: Реалізація FastAPI, автентифікації через Telegram та базових CRUD-операцій.
- **Етап 4: Фронтенд - базовий інтерфейс**: Створення основного layout, налаштування Tailwind CSS та модульної архітектури JS.
- **Етап 5: Інтеграція функціоналу**: Реалізація підписок, бонусів, реферальної та VIP систем, інтеграція оплати.
- **Етап 6: Додатковий функціонал**: PWA, мультимовність, теми, обране та пошук.
- **Етап 7: Адмін-панель**: Розробка інструментів для управління платформою.
- **Етап 8: Тестування та деплой**: Написання тестів, налаштування CI/CD та розгортання на production.

---

## 📝 Основні API Ендпоінти

- `POST /api/auth/telegram`: Автентифікація користувача через дані Telegram Web App.
- `GET /api/products`: Отримання списку продуктів з фільтрацією та пагінацією.
- `GET /api/products/{id}`: Отримання детальної інформації про конкретний продукт.
- `POST /api/orders`: Створення нового замовлення.
- `GET /api/users/me`: Отримання даних профілю поточного авторизованого користувача.


## Repository
GitHub: [https://github.com/pakhadai/clode-revit-store.git]