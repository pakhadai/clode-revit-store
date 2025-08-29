// js/services/AuthService.js
import { UserStore } from '../store/UserStore.js';
import { TelegramService } from './TelegramService.js';
import { LoginModal } from '../components/LoginModal.js';

export class AuthService {
    constructor() {
        this.userStore = new UserStore();
        this.telegramService = new TelegramService();
        this.loginModal = new LoginModal(); // Створюємо екземпляр модального вікна
        this.user = null;
        this.tg = null;

        window.onTelegramAuth = this.handleWidgetAuth.bind(this);
    }

    /**
     * Метод, який викликається віджетом Telegram Login Widget
     * після успішного входу користувача на сайті.
     */
    async handleWidgetAuth(user) {
        try {
            Utils.showLoader(true);
            const response = await api.post('/auth/telegram-widget', user);
            if (response.user && response.access_token) {
                this.user = response.user;
                this.userStore.saveUser(this.user);
                api.setToken(response.access_token);
                window.location.reload(); // оновлюємо сторінку
            }
        } catch (error) {
            console.error("Помилка авторизації через віджет:", error);
            Utils.showNotification('Помилка входу', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Нова централізована функція для перевірки доступу до захищених сторінок.
     */
    requireAuthentication() {
        if (this.isAuthenticated()) {
            return true; // Користувач вже залогінений, все добре
        }

        // Перевіряємо, чи ми на сайті, а не в Telegram Web App
        const isWebView = window.Telegram && window.Telegram.WebApp.initData;
        if (!isWebView) {
            // Якщо ми на сайті і користувач не залогінений - показуємо модальне вікно
            this.loginModal.show();
        } else {
            // Якщо ми в Web App і досі не залогінені - це помилка
            Utils.showNotification('Помилка автентифікації. Спробуйте перезапустити додаток.', 'error');
        }
        return false; // Повідомляємо, що доступу поки немає
    }

    /**
     * Ініціалізація сервісу.
     */
    async init() {
        this.tg = this.telegramService.init();
        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
        }

        // Автоматичний вхід, якщо запущено всередині Telegram
        if (this.tg && this.tg.initData) {
            return this.authenticate(this.tg.initData);
        }
    }

    /**
     * Основна функція автентифікації (зараз викликається лише з даними).
     */
    async authenticate(initData) {
        try {
            Utils.showLoader(true);
            if (!initData) {
                throw new Error(window.app.t('errors.telegramDataNotAvailable'));
            }
            const response = await api.loginWithTelegram(initData);
            if (response.access_token && response.user) {
                this.user = response.user;
                this.userStore.saveUser(this.user);
                let language = this.user.language || this.telegramService.getTelegramUser()?.language_code || 'uk';
                Utils.setLanguage(language);
                const theme = this.user.theme || this.telegramService.getTelegramTheme() || 'light';
                Utils.setTheme(theme);
                window.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
                Utils.showNotification(`${window.app.t('auth.welcome')}, ${this.user.first_name}!`, 'success');
                window.app.navigateTo('home'); // Перенаправляємо на головну
                return true;
            }
            throw new Error(window.app.t('errors.failedToGetToken'));
        } catch (error) {
            console.error('Authentication error:', error);
            Utils.showNotification(`${window.app.t('notifications.authError')}: ` + error.message, 'error');
            window.dispatchEvent(new CustomEvent('auth:error', { detail: error }));
            return false;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Отримати дані поточного користувача.
     */
    async getCurrentUser() {
        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
            return cachedUser;
        }
        if (api.isAuthenticated()) {
            try {
                const user = await api.getCurrentUser();
                this.user = user;
                this.userStore.saveUser(user);
                return user;
            } catch (error) {
                console.error('Failed to get user:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Перевірити, чи користувач авторизований.
     */
    isAuthenticated() {
        return api.isAuthenticated() && this.user !== null;
    }

    /**
     * Вийти з системи.
     */
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.user = null;
        this.userStore.clearUser();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        if (this.tg && this.tg.close) {
            this.tg.close();
        } else {
            window.location.reload();
        }
    }

    /**
     * Оновити профіль користувача.
     */
    async updateProfile(data) {
        try {
            const response = await api.put('/auth/me', data);
            this.user = response;
            this.userStore.saveUser(this.user);
            if (data.theme) { Utils.setTheme(data.theme); }
            if (data.language) { Utils.setLanguage(data.language); }
            Utils.showNotification(window.app.t('notifications.profileUpdated'), 'success');
            return this.user;
        } catch (error) {
            console.error('Update profile error:', error);
            Utils.showNotification(window.app.t('notifications.profileUpdateError'), 'error');
            throw error;
        }
    }

    // Методи-гетери для доступу до даних користувача
    getBalance() { return this.user?.balance || 0; }
    getVipLevel() { return this.user?.vip_level || 0; }
    isCreator() { return this.user?.is_creator || false; }
    isAdmin() { return this.user?.is_admin || false; }

    // Делегування методів до сервісу Telegram
    getTelegramUser() { return this.telegramService.getTelegramUser(); }
    getTelegramTheme() { return this.telegramService.getTelegramTheme(); }
    showConfirm(message, callback) { return this.telegramService.showConfirm(message, callback); }
    showAlert(message) { return this.telegramService.showAlert(message); }
    openLink(url) { return this.telegramService.openLink(url); }
    hapticFeedback(type, style) { return this.telegramService.hapticFeedback(type, style); }
    showInviteFriend() { return this.telegramService.showInviteFriend(); }
    setMainButton(text, callback, show) { return this.telegramService.setMainButton(text, callback, show); }
    setBackButton(callback, show) { return this.telegramService.setBackButton(callback, show); }

    // === Додані методи з другого коду ===

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
        if (this.user) {
            return this.user;
        }

        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
            return this.user;
        }

        try {
            if (this.isTelegramWebApp()) {
                const response = await api.post('/auth/telegram-webapp', { init_data: this.tg.initData });
                if (response.user && response.access_token) {
                    this.user = response.user;
                    this.userStore.saveUser(this.user);
                    api.setToken(response.access_token);
                    return this.user;
                }
            } else {
                const token = localStorage.getItem('access_token');
                if (!token) return null;

                const user = await api.getCurrentUser();
                this.user = user;
                this.userStore.saveUser(user);
                return this.user;
            }
        } catch (error) {
            console.error("Помилка отримання користувача:", error);
            this.logout();
            return null;
        }
        return null;
    }
}
