// js/services/AuthService.js
import { UserStore } from '../store/UserStore.js';
import { TelegramService } from './TelegramService.js';

export class AuthService {
    constructor() {
        this.userStore = new UserStore();
        this.telegramService = new TelegramService();
        this.user = null;
        this.tg = this.telegramService.init();

        // Робимо колбек віджету доступним глобально
        window.onTelegramAuth = this.handleWidgetAuth.bind(this);
    }

    /**
     * Перевіряє, чи запущений додаток всередині Telegram Web App.
     * @returns {boolean}
     */
    isTelegramWebApp() {
        return !!(this.tg && this.tg.initData);
    }

    /**
     * Головний метод для отримання поточного користувача.
     * Він сам визначає середовище і вибирає потрібний спосіб авторизації.
     * @returns {Promise<object|null>}
     */
    async getUser() {
        // Якщо користувач вже завантажений, повертаємо його
        if (this.user) {
            return this.user;
        }

        // Спочатку перевіряємо кеш
        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
            return this.user;
        }

        try {
            if (this.isTelegramWebApp()) {
                // --- Сценарій: Telegram Web App ---
                const response = await api.post('/auth/telegram-webapp', { init_data: this.tg.initData });
                if (response.user && response.access_token) {
                    this.setAuth(response.user, response.access_token);
                    return this.user;
                }
            } else {
                // --- Сценарій: Звичайний сайт ---
                const token = localStorage.getItem('access_token');
                if (!token) return null; // Користувач не залогінений

                // Перевіряємо токен на бекенді
                const user = await api.getCurrentUser();
                this.user = user;
                this.userStore.saveUser(user);
                return this.user;
            }
        } catch (error) {
            console.error("Помилка отримання користувача:", error);
            this.logout(); // Якщо токен невалідний, чистимо дані
            return null;
        }
        return null;
    }

    /**
     * Обробляє дані, отримані від Telegram Login Widget на сайті.
     */
    async handleWidgetAuth(user) {
        try {
            Utils.showLoader(true);
            const response = await api.post('/auth/telegram-widget', user);
            if (response.user && response.access_token) {
                this.setAuth(response.user, response.access_token);
                window.location.reload(); // Перезавантажуємо сторінку, щоб оновити стан
            }
        } catch (error) {
            console.error("Помилка авторизації через віджет:", error);
            Utils.showNotification('Помилка входу', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Зберігає дані користувача та токен.
     */
    setAuth(user, token) {
        this.user = user;
        this.userStore.saveUser(user);
        api.setToken(token);
    }

    /**
     * Вихід з системи.
     */
    logout() {
        this.user = null;
        this.userStore.clearUser();
        api.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    isAuthenticated() {
        return !!this.user;
    }
}