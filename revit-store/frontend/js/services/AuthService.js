import { UserStore } from '../store/UserStore.js';
import { TelegramService } from './TelegramService.js';
import { LoginModal } from '../components/LoginModal.js';

export class AuthService {
    constructor() {
        this.userStore = new UserStore();
        this.telegramService = new TelegramService();
        this.user = null;
        this.tg = null;

        // Робимо callback-функцію віджета глобальною
        window.onTelegramAuth = this.handleWidgetAuth.bind(this);
    }

    /**
     * Ініціалізація сервісу: визначає середовище та намагається авторизуватись.
     */
    async init() {
        this.tg = this.telegramService.init();
        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
            api.setToken(localStorage.getItem('access_token'));
        }

        // Якщо є initData, це точно Telegram Web App - запускаємо авто-логін
        if (this.tg && this.tg.initData) {
            return this.authenticateWithWebApp(this.tg.initData);
        }
    }

    /**
     * Перевіряє, чи запущений додаток всередині Telegram Web App.
     */
    isTelegramWebApp() {
        // Найнадійніший спосіб - перевірка наявності initData
        return !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    }

    /**
     * Основний метод для отримання користувача.
     * Використовується по всьому додатку.
     */
    async getUser() {
        if (this.user) return this.user;
        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
            return this.user;
        }
        return null;
    }

    isAuthenticated() {
        return api.isAuthenticated() && this.user !== null;
    }

    /**
     * Авторизація через Web App (автоматична).
     */
    async authenticateWithWebApp(initData) {
        try {
            Utils.showLoader(true);
            const response = await api.loginWithTelegram(initData);
            if (response.access_token && response.user) {
                this.user = response.user;
                this.userStore.saveUser(this.user);
                
                // Встановлюємо мову та тему з профілю або з Telegram
                const language = this.user.language || this.telegramService.getTelegramUser()?.language_code || 'uk';
                Utils.setLanguage(language);
                const theme = this.user.theme || this.telegramService.getTelegramTheme() || 'light';
                Utils.setTheme(theme);
                
                window.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
                return true;
            }
            throw new Error(window.app.t('errors.failedToGetToken'));
        } catch (error) {
            console.error('Web App Authentication error:', error);
            Utils.showNotification(`${window.app.t('notifications.authError')}: ${error.message}`, 'error');
            return false;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Метод, який викликається ВІДЖЕТОМ на сайті після входу.
     */
    async handleWidgetAuth(user) {
        try {
            Utils.showLoader(true);
            LoginModal.hide();
            const response = await api.post('/auth/telegram-widget', user);
            if (response.user && response.access_token) {
                this.user = response.user;
                this.userStore.saveUser(this.user);
                api.setToken(response.access_token);
                Utils.showNotification(`${window.app.t('auth.welcome')}, ${this.user.first_name}!`, 'success');
                window.location.reload(); // Перезавантажуємо сторінку, щоб оновити стан
            }
        } catch (error) {
            console.error("Помилка авторизації через віджет:", error);
            Utils.showNotification('Помилка входу', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.user = null;
        this.userStore.clearUser();
        api.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        if (this.isTelegramWebApp() && this.tg.close) {
            this.tg.close();
        } else {
            window.location.reload();
        }
    }

    // Делегування методів до сервісу Telegram
    getTelegramUser() { return this.telegramService.getTelegramUser(); }
    getTelegramTheme() { return this.telegramService.getTelegramTheme(); }
}
