// js/components/LoginModal.js
export class LoginModal {
    // ❗️ ВАЖЛИВО: замініть на точне ім'я вашого бота
    static botUsername = 'ohmyrevit_bot';

    static show() {
        console.log('LoginModal.show() called');

        // Видаляємо попереднє модальне вікно, якщо воно є
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
                    <div class="text-gray-400">Завантаження...</div>
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

        // Завантажуємо віджет після додавання модального вікна
        setTimeout(() => this.loadWidget(), 100);
    }

    static loadWidget() {
        console.log('Loading Telegram widget...');

        const container = document.getElementById('telegram-login-container');
        if (!container) {
            console.error('Container not found');
            return;
        }

        container.innerHTML = '';

        const existingScript = document.getElementById('telegram-login-script');
        if (existingScript) {
            existingScript.remove();
        }

        const script = document.createElement('script');
        script.id = 'telegram-login-script';
        script.async = true;
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', this.botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');

        script.onerror = () => {
            console.error('Failed to load Telegram widget');
            container.innerHTML = `
                <div class="text-red-500 text-sm">
                    Помилка завантаження віджета.<br>
                    Спробуйте оновити сторінку.
                </div>
            `;
        };

        container.appendChild(script);
        console.log('Widget script added');
    }

    static hide() {
        console.log('LoginModal.hide() called');
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Експортуємо глобально
window.LoginModal = LoginModal;
export default LoginModal;