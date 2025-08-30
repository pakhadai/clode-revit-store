FROM python:3.11-slim

# Встановлюємо робочу директорію
WORKDIR /app

RUN mkdir -p /app/media/archives /app/media/previews /app/media/avatars
# Встановлюємо системні залежності
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо файл залежностей
COPY requirements.txt .

# Встановлюємо Python залежності
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо весь код додатку
COPY . .

# Відкриваємо порт
EXPOSE 8000

# Команда для запуску додатку
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]