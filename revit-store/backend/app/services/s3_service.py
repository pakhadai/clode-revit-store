"""
Сервіс для роботи з AWS S3
Управління файлами архівів та зображень
"""

import os
import boto3
import hashlib
import mimetypes
from typing import Optional, Dict, List, BinaryIO
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()


class S3Service:
    """
    Сервіс для роботи з Amazon S3
    """

    def __init__(self):
        """Ініціалізація S3 клієнта"""
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("AWS_S3_BUCKET", "ohmyrevit-storage")
        self.region = os.getenv("AWS_REGION", "eu-central-1")

        if not self.aws_access_key or not self.aws_secret_key:
            raise ValueError("AWS credentials not found in environment variables")

        # Ініціалізуємо S3 клієнт
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=self.region
        )

        # Структура папок в S3
        self.folders = {
            'archives': 'archives/',  # Архіви Revit
            'previews': 'previews/',  # Превʼю зображення
            'avatars': 'avatars/',  # Аватарки користувачів
            'temp': 'temp/',  # Тимчасові файли
            'backups': 'backups/'  # Резервні копії
        }

    def _generate_unique_filename(self, original_filename: str, folder: str) -> str:
        """
        Генерує унікальне ім'я файлу

        Args:
            original_filename: Оригінальне ім'я файлу
            folder: Папка для збереження

        Returns:
            Унікальне ім'я з шляхом
        """
        # Отримуємо розширення
        extension = os.path.splitext(original_filename)[1].lower()

        # Генеруємо унікальний ідентифікатор
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        random_hash = hashlib.md5(f"{original_filename}{timestamp}".encode()).hexdigest()[:8]

        # Формуємо нове ім'я
        new_filename = f"{timestamp}_{random_hash}{extension}"

        # Повертаємо повний шлях
        return f"{folder}{new_filename}"

    async def upload_file(
            self,
            file: UploadFile,
            folder_type: str = 'archives',
            public: bool = False,
            metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Завантажує файл на S3

        Args:
            file: Файл для завантаження
            folder_type: Тип папки (archives, previews, avatars)
            public: Чи робити файл публічним
            metadata: Додаткові метадані

        Returns:
            Інформація про завантажений файл
        """
        try:
            # Перевіряємо тип папки
            if folder_type not in self.folders:
                raise ValueError(f"Invalid folder type: {folder_type}")

            # Валідація файлу
            if folder_type == 'archives':
                # Перевіряємо розширення архіву
                allowed_extensions = ['.zip', '.rar', '.7z', '.rvt']
                if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
                    )

                # Обмеження розміру - 500MB
                max_size = 500 * 1024 * 1024

            elif folder_type == 'previews' or folder_type == 'avatars':
                # Перевіряємо розширення зображення
                allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
                if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid image type. Allowed: {', '.join(allowed_extensions)}"
                    )

                # Обмеження розміру - 10MB
                max_size = 10 * 1024 * 1024
            else:
                max_size = 100 * 1024 * 1024  # 100MB за замовчуванням

            # Читаємо файл
            file_content = await file.read()
            file_size = len(file_content)

            # Перевіряємо розмір
            if file_size > max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size: {max_size // (1024 * 1024)}MB"
                )

            # Генеруємо унікальне ім'я
            s3_key = self._generate_unique_filename(
                file.filename,
                self.folders[folder_type]
            )

            # Визначаємо MIME тип
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'

            # Підготовка метаданих
            s3_metadata = {
                'original-filename': file.filename,
                'upload-date': datetime.utcnow().isoformat(),
                'file-size': str(file_size)
            }

            if metadata:
                s3_metadata.update({k: str(v) for k, v in metadata.items()})

            # Налаштування доступу
            acl = 'public-read' if public else 'private'

            # Завантажуємо на S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ACL=acl,
                Metadata=s3_metadata
            )

            # Формуємо URL
            if public:
                file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            else:
                # Генеруємо тимчасовий підписаний URL (діє 7 днів)
                file_url = self.generate_presigned_url(s3_key, expires_in=7 * 24 * 3600)

            return {
                "success": True,
                "file_url": file_url,
                "s3_key": s3_key,
                "file_size": file_size,
                "content_type": content_type,
                "original_filename": file.filename,
                "uploaded_at": datetime.utcnow().isoformat()
            }

        except ClientError as e:
            print(f"AWS S3 Error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload file: {str(e)}"
            )
        except Exception as e:
            print(f"Upload error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Upload failed: {str(e)}"
            )

    def generate_presigned_url(
            self,
            s3_key: str,
            expires_in: int = 3600,
            download_name: Optional[str] = None
    ) -> str:
        """
        Генерує тимчасовий підписаний URL для завантаження

        Args:
            s3_key: Ключ файлу в S3
            expires_in: Час дії посилання в секундах
            download_name: Ім'я файлу при завантаженні

        Returns:
            Підписаний URL
        """
        try:
            params = {
                'Bucket': self.bucket_name,
                'Key': s3_key
            }

            # Додаємо ім'я для завантаження якщо вказано
            if download_name:
                params['ResponseContentDisposition'] = f'attachment; filename="{download_name}"'

            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )

            return url

        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None

    def delete_file(self, s3_key: str) -> bool:
        """
        Видаляє файл з S3

        Args:
            s3_key: Ключ файлу в S3

        Returns:
            True якщо успішно видалено
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True

        except ClientError as e:
            print(f"Error deleting file: {e}")
            return False

    def delete_multiple_files(self, s3_keys: List[str]) -> Dict:
        """
        Видаляє кілька файлів з S3

        Args:
            s3_keys: Список ключів файлів

        Returns:
            Результат видалення
        """
        try:
            # Формуємо об'єкти для видалення
            objects = [{'Key': key} for key in s3_keys]

            response = self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete={
                    'Objects': objects,
                    'Quiet': False
                }
            )

            deleted = response.get('Deleted', [])
            errors = response.get('Errors', [])

            return {
                "success": len(errors) == 0,
                "deleted_count": len(deleted),
                "deleted_keys": [obj['Key'] for obj in deleted],
                "errors": errors
            }

        except ClientError as e:
            print(f"Error deleting multiple files: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def copy_file(self, source_key: str, dest_key: str) -> bool:
        """
        Копіює файл в S3

        Args:
            source_key: Вихідний ключ
            dest_key: Цільовий ключ

        Returns:
            True якщо успішно скопійовано
        """
        try:
            copy_source = {'Bucket': self.bucket_name, 'Key': source_key}

            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key
            )

            return True

        except ClientError as e:
            print(f"Error copying file: {e}")
            return False

    def get_file_info(self, s3_key: str) -> Optional[Dict]:
        """
        Отримує інформацію про файл

        Args:
            s3_key: Ключ файлу в S3

        Returns:
            Інформація про файл або None
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )

            return {
                "key": s3_key,
                "size": response['ContentLength'],
                "content_type": response.get('ContentType'),
                "last_modified": response['LastModified'].isoformat(),
                "metadata": response.get('Metadata', {}),
                "etag": response.get('ETag', '').strip('"')
            }

        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            print(f"Error getting file info: {e}")
            return None

    def list_files(self, prefix: str = '', max_keys: int = 100) -> List[Dict]:
        """
        Список файлів в папці

        Args:
            prefix: Префікс (папка)
            max_keys: Максимальна кількість

        Returns:
            Список файлів
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )

            files = []
            for obj in response.get('Contents', []):
                files.append({
                    "key": obj['Key'],
                    "size": obj['Size'],
                    "last_modified": obj['LastModified'].isoformat(),
                    "etag": obj.get('ETag', '').strip('"')
                })

            return files

        except ClientError as e:
            print(f"Error listing files: {e}")
            return []

    def create_backup(self, data: str, backup_name: str) -> Optional[str]:
        """
        Створює резервну копію даних

        Args:
            data: Дані для бекапу (JSON string)
            backup_name: Назва бекапу

        Returns:
            S3 ключ бекапу або None
        """
        try:
            # Генеруємо ім'я файлу
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            s3_key = f"{self.folders['backups']}{backup_name}_{timestamp}.json"

            # Завантажуємо на S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=data.encode('utf-8'),
                ContentType='application/json',
                ACL='private',
                Metadata={
                    'backup-name': backup_name,
                    'created-at': datetime.utcnow().isoformat()
                }
            )

            return s3_key

        except ClientError as e:
            print(f"Error creating backup: {e}")
            return None


# Створюємо глобальний екземпляр сервісу
s3_service = S3Service()