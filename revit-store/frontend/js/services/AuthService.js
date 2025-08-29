// js/services/AuthService.js
import { UserStore } from '../store/UserStore.js';
import { TelegramService } from './TelegramService.js';
import { LoginModal } from '../components/LoginModal.js';

export class AuthService {
    constructor() {
        this.userStore = new UserStore();
        this.telegramService = new TelegramService();
        this.user = null;
        this.tg = null;
        this.isWebApp = false;

        // Робимо callback-функцію віджета глобальною
        window.onTelegramAuth = this.handleWidgetAuth.bind(this);
    }

    /**
     * Ініціалізація сервісу: визначає середовище та намагається авторизуватись.
     */
    async init() {
        console.log('🔐 AuthService init...');
        
        // Ініціалізуємо Telegram Service
        this.tg = this.telegramService.init();
        
        // Визначаємо чи це Telegram Web App
        this.isWebApp = this.isTelegramWebApp();
        console.log('Environment check:', {
            isWebApp: this.isWebApp,
            hasTelegram: !!window.Telegram,
            hasWebApp: !!(window.Telegram && window.Telegram.WebApp),
            hasInitData: !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData),
            initDataLength: window.Telegram?.WebApp?.initData?.length || 0
        });

        // Завантажуємо збереженого користувача
        const cachedUser = this.userStore.getUser();
        const cachedToken = localStorage.getItem('access_token');

        if (cachedUser && cachedToken) {
            console.log('Found cached user:', cachedUser.first_name);
            this.user = cachedUser;
            api.setToken(cachedToken);
            return true;
        }

        // Якщо це Telegram Web App і є initData - автоматично логінимось
        if (this.isWebApp && this.tg && this.tg.initData) {
            console.log('Auto-login in Telegram Web App...');
            return await this.authenticateWithWebApp(this.tg.initData);
        }

        console.log('No automatic authentication available');
        return false;
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

    /**
     * Перевірка авторизації
     */
    isAuthenticated() {
        return api.isAuthenticated() && this.user !== null;
    }

    /**
     * Метод для ручної авторизації (для кнопки "Увійти")
     * УВАГА: Цей метод більше не використовується - замість нього використовуйте LoginModal.show()
     */
    async authenticate() {
        console.log('⚠️ authenticate() called - redirecting to LoginModal.show()');

        // Перенаправляємо на правильний метод
        if (window.LoginModal) {
            window.LoginModal.show();
        } else {
            console.error('LoginModal not loaded!');
            Utils.showNotification('Помилка завантаження модуля входу', 'error');
        }

        return false;
    }

    /**
     * Авторизація через Web App (автоматична).
     */
    async authenticateWithWebApp(initData) {
        if (!initData) {
            console.error('No initData available');
            return false;
        }

        try {
            Utils.showLoader(true);
            console.log('Authenticating with initData...');
            
            const response = await api.loginWithTelegram(initData);
            
            if (response.access_token && response.user) {
                console.log('Authentication successful:', response.user);
                
                this.user = response.user;
                this.userStore.saveUser(this.user);
                localStorage.setItem('access_token', response.access_token);
                api.setToken(response.access_token);
                
                // Встановлюємо мову та тему
                const language = this.user.language || this.telegramService.getTelegramUser()?.language_code || 'uk';
                Utils.setLanguage(language);
                
                const theme = this.user.theme || this.telegramService.getTelegramTheme() || 'light';
                Utils.setTheme(theme);
                
                window.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
                
                // Оновлюємо UI
                if (window.app) {
                    window.app.updateUI();
                }
                
                return true;
            }
            
            throw new Error('Не вдалося отримати токен');
        } catch (error) {
            console.error('Web App Authentication error:', error);
            Utils.showNotification(`Помилка авторизації: ${error.message}`, 'error');
            return false;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Метод, який викликається ВІДЖЕТОМ на сайті після входу.
     */
    async handleWidgetAuth(user) {
        console.log('Widget authentication received:', user);
        
        try {
            Utils.showLoader(true);
            
            // Закриваємо модальне вікно
            LoginModal.hide();
            
            // Відправляємо дані на сервер
            const response = await api.post('/auth/telegram-widget', user);
            
            if (response.user && response.access_token) {
                console.log('Widget authentication successful:', response.user);
                
                this.user = response.user;
                this.userStore.saveUser(this.user);
                localStorage.setItem('access_token', response.access_token);
                api.setToken(response.access_token);
                
                Utils.showNotification(`Ласкаво просимо, ${this.user.first_name}!`, 'success');
                
                // Оновлюємо UI
                if (window.app) {
                    window.app.updateUI();
                    // Якщо ми на сторінці профілю - перерендеримо її
                    if (window.app.currentPage === 'profile') {
                        window.app.render();
                    }
                }
                
                window.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
            } else {
                throw new Error('Неповна відповідь від сервера');
            }
        } catch (error) {
            console.error("Widget authentication error:", error);
            Utils.showNotification('Помилка входу через Telegram', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Перевірка авторизації з показом діалогу при потребі
     */
    async requireAuthentication() {
        if (this.isAuthenticated()) {
            return true;
        }

        // Для Web App спробуємо автоматичну авторизацію
        if (this.isWebApp) {
            const success = await this.authenticate();
            if (success) return true;
        }

        // Показуємо діалог входу
        Utils.showNotification('Необхідна авторизація', 'warning');
        LoginModal.show();
        return false;
    }

    /**
     * Вихід з системи
     */
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.user = null;
        this.userStore.clearUser();
        localStorage.removeItem('access_token');
        api.setToken(null);
        
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        if (this.isWebApp && this.tg && this.tg.close) {
            this.tg.close();
        } else {
            window.location.reload();
        }
    }

    /**
     * Перевірка ролей
     */
    isAdmin() {
        return this.user?.is_admin || false;
    }

    isCreator() {
        return this.user?.is_creator || false;
    }

    // Делегування методів до сервісу Telegram
    getTelegramUser() { 
        return this.telegramService.getTelegramUser(); 
    }
    
    getTelegramTheme() { 
        return this.telegramService.getTelegramTheme(); 
    }

    hapticFeedback(type, style) {
        return this.telegramService.hapticFeedback(type, style);
    }

    showConfirm(message, callback) {
        return this.telegramService.showConfirm(message, callback);
    }
}

export default AuthService;