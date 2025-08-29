// js/components/LoginModal.js
export class LoginModal {
    static botUsername = 'ohmyrevit_bot';
    static widgetLoadTimeout = null;

    static show() {
        console.log('LoginModal.show() called');

        const existingModal = document.getElementById('login-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 text-center">
                <div class="text-6xl mb-4">🔒</div>
                <h1 class="text-2xl font-bold mb-2 dark:text-white">Вхід до OhMyRevit</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">
                    Увійдіть за допомогою вашого акаунту Telegram
                </p>

                <div id="telegram-login-container" class="flex justify-center min-h-[50px] mb-4">
                    <div class="text-gray-400">Завантаження віджета...</div>
                </div>

                <div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Натискаючи кнопку входу, ви погоджуєтесь<br>
                    з умовами використання сервісу
                </div>

                <button onclick="LoginModal.hide()"
                        class="w-full mt-4 bg-gray-200 dark:bg-gray-600 p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    Скасувати
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Запускаємо завантаження віджета з таймером
        this.loadWidget();
    }

    static loadWidget() {
        console.log('Loading Telegram widget...');
        const container = document.getElementById('telegram-login-container');
        if (!container) {
            console.error('Container not found');
            return;
        }

        container.innerHTML = '<div class="text-gray-400">Завантаження віджета...</div>'; // Скидаємо контейнер

        // Встановлюємо таймер, який спрацює, якщо віджет не завантажиться
        this.widgetLoadTimeout = setTimeout(() => {
            console.error('Telegram widget timed out.');
            if (container) {
                container.innerHTML = `
                    <div class="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p class="font-bold">Помилка завантаження</p>
                        <p class="mt-1">
                            Схоже, ваш провайдер блокує сервіси Telegram.
                            Будь ласка, **увімкніть VPN** та спробуйте оновити сторінку.
                        </p>
                    </div>
                `;
            }
        }, 7000); // Чекаємо 7 секунд

        const script = document.createElement('script');
        script.id = 'telegram-login-script';
        script.async = true;
        // Повертаємо локальний шлях, це все ще правильна практика
        script.src = "/js/vendor/telegram-widget.js";
        script.setAttribute('data-telegram-login', this.botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');

        // Якщо скрипт завантажиться, він замінить "Завантаження..." на кнопку,
        // і ми повинні скасувати наш таймер.
        script.onload = () => {
            console.log('Telegram widget script loaded successfully.');
            clearTimeout(this.widgetLoadTimeout);
        };

        script.onerror = () => {
            console.error('Failed to load Telegram widget script.');
            clearTimeout(this.widgetLoadTimeout);
             if (container) {
                container.innerHTML = `
                     <div class="text-red-500 text-sm">Помилка завантаження скрипту. Перевірте консоль.</div>
                `;
            }
        };

        container.appendChild(script);
    }

    static hide() {
        console.log('LoginModal.hide() called');
        clearTimeout(this.widgetLoadTimeout); // Очищуємо таймер при закритті
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Експортуємо глобально
window.LoginModal = LoginModal;
export default LoginModal;