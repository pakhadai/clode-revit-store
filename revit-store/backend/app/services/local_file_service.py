# backend/app/services/local_file_service.py
import os
import shutil
import uuid
from fastapi import UploadFile, HTTPException
from datetime import datetime

MEDIA_ROOT = "/app/media"  # Папка для зберігання файлів всередині Docker контейнера

class LocalFileService:
    def __init__(self):
        self.folders = {
            'archives': 'archives/',
            'previews': 'previews/',
            'avatars': 'avatars/',
        }
        # Створюємо папки, якщо їх немає
        for folder in self.folders.values():
            os.makedirs(os.path.join(MEDIA_ROOT, folder), exist_ok=True)

    def _generate_unique_filename(self, original_filename: str) -> str:
        extension = os.path.splitext(original_filename)[1].lower()
        return f"{uuid.uuid4()}{extension}"

    async def upload_file(self, file: UploadFile, folder_type: str, **kwargs):
        folder_path = os.path.join(MEDIA_ROOT, self.folders.get(folder_type))
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=500, detail=f"Directory for {folder_type} does not exist.")

        filename = self._generate_unique_filename(file.filename)
        file_location = os.path.join(folder_path, filename)

        try:
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)

            file_size = os.path.getsize(file_location)
            # Повертаємо відносний шлях, який буде використовуватися для URL
            relative_path = os.path.join('/media', self.folders.get(folder_type), filename).replace("\\", "/")

            return {
                "success": True,
                "file_url": relative_path,  # Повертаємо URL-шлях
                "s3_key": relative_path,    # Використовуємо той самий шлях як ключ
                "file_size": file_size,
                "original_filename": file.filename,
                "uploaded_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not upload file: {e}")

    def generate_presigned_url(self, file_key: str, **kwargs):
        # Для локального сховища URL вже є публічним
        return file_key

    def delete_file(self, file_key: str):
        # file_key тепер - це відносний шлях, наприклад /media/archives/file.zip
        # Нам потрібно отримати повний шлях у файловій системі
        full_path = os.path.join("/app", file_key.lstrip('/'))
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

# Створюємо єдиний екземпляр
local_file_service = LocalFileService()