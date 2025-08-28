// js/components/LoginModal.js
export class LoginModal {
    static botUsername = 'OhMyRevitBot'; // ❗️ Важливо: перевірте, чи це правильне ім'я вашого бота

    static show() {
        if (document.getElementById('login-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 text-center">
                <div class="text-6xl mb-4">🔒</div>
                <h1 class="text-2xl font-bold mb-2 dark:text-white">Необхідна авторизація</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">Щоб продовжити, увійдіть за допомогою вашого акаунту Telegram.</p>

                <div id="telegram-login-container" class="flex justify-center h-[50px] mb-4">
                    </div>

                <button onclick="LoginModal.hide()"
                        class="w-full mt-2 bg-gray-200 dark:bg-gray-600 p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                    Скасувати
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        this.loadWidget();
    }

    static loadWidget() {
        const container = document.getElementById('telegram-login-container');
        if (container && !document.getElementById('telegram-login-script')) {
            const script = document.createElement('script');
            script.id = 'telegram-login-script';
            script.async = true;
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute('data-telegram-login', this.botUsername);
            script.setAttribute('data-size', 'large');
            script.setAttribute('data-onauth', 'onTelegramAuth(user)');
            script.setAttribute('data-request-access', 'write');

            container.appendChild(script);
        }
    }

    static hide() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.remove();
        }
    }
}