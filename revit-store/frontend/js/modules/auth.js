/**
 * Модуль автентифікації через Telegram Web App
 */

class AuthModule {
    constructor() {
        this.user = null;
        this.tg = null;
        this.initTelegram();
    }

    /**
     * Отримати баланс користувача
     */
    getBalance() {
        return this.user?.balance || 0;
    }

    /**
     * Отримати VIP рівень
     */
    getVipLevel() {
        return this.user?.vip_level || 0;
    }

    /**
     * Чи є користувач творцем
     */
    isCreator() {
        return this.user?.is_creator || false;
    }

    /**
     * Чи є користувач адміном
     */
    isAdmin() {
        return this.user?.is_admin || false;
    }

    /**
     * Показати підтвердження
     */
    showConfirm(message, callback) {
        if (this.tg && this.tg.showConfirm) {
            this.tg.showConfirm(message, callback);
        } else {
            // Fallback для браузера
            const result = confirm(message);
            callback(result);
        }
    }

    /**
     * Показати попередження
     */
    showAlert(message) {
        if (this.tg && this.tg.showAlert) {
            this.tg.showAlert(message);
        } else {
            alert(message);
        }
    }

    /**
     * Відкрити посилання
     */
    openLink(url) {
        if (this.tg && this.tg.openLink) {
            this.tg.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    /**
     * Отримати дані користувача Telegram
     */
    getTelegramUser() {
        return this.tg?.initDataUnsafe?.user || null;
    }

    /**
     * Отримати тему Telegram
     */
    getTelegramTheme() {
        return this.tg?.colorScheme || 'light';
    }

    /**
     * Вібрація (haptic feedback)
     */
    hapticFeedback(type = 'impact', style = 'light') {
        if (this.tg && this.tg.HapticFeedback) {
            if (type === 'impact') {
                this.tg.HapticFeedback.impactOccurred(style);
            } else if (type === 'notification') {
                this.tg.HapticFeedback.notificationOccurred(style);
            } else if (type === 'selection') {
                this.tg.HapticFeedback.selectionChanged();
            }
        }
    }

    /**
     * Ініціалізація Telegram Web App
     */
    initTelegram() {
        // Перевіряємо чи доступний Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;

            // Розширюємо вікно на весь екран
            this.tg.expand();

            // Встановлюємо колір header
            this.tg.setHeaderColor('#1F2937'); // Темно-сірий

            // Встановлюємо колір фону
            this.tg.setBackgroundColor('#F3F4F6'); // Світло-сірий

            // Готовність додатка
            this.tg.ready();

            // Показуємо кнопку "Назад" якщо потрібно
            if (this.tg.isVersionAtLeast('6.1')) {
                this.tg.BackButton.onClick(() => {
                    window.history.back();
                });
            }

            console.log('Telegram Web App initialized');
            console.log('Init Data:', this.tg.initData);
            console.log('User:', this.tg.initDataUnsafe?.user);

        } else {
            console.warn('Telegram Web App не доступний');

            // Для тестування в браузері - використовуємо моковані дані
            if (window.location.hostname === 'localhost') {
                this.setupMockData();
            }
        }
    }

    /**
     * Мокові дані для тестування (тільки для localhost)
     */
    setupMockData() {
        console.log('Використовуємо мокові дані для тестування');

        // Створюємо мокований об'єкт Telegram WebApp
        this.tg = {
            initData: 'query_id=test&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22uk%22%7D&auth_date=1234567890&hash=test_hash',
            initDataUnsafe: {
                user: {
                    id: 123456789,
                    first_name: 'Test',
                    last_name: 'User',
                    username: 'testuser',
                    language_code: 'uk'
                },
                auth_date: 1234567890
            },
            ready: () => console.log('Mock: ready'),
            expand: () => console.log('Mock: expand'),
            close: () => console.log('Mock: close'),
            setHeaderColor: (color) => console.log('Mock: setHeaderColor', color),
            setBackgroundColor: (color) => console.log('Mock: setBackgroundColor', color),
            MainButton: {
                text: '',
                color: '#3B82F6',
                textColor: '#FFFFFF',
                isVisible: false,
                isActive: true,
                show: () => console.log('Mock: MainButton.show'),
                hide: () => console.log('Mock: MainButton.hide'),
                onClick: (callback) => console.log('Mock: MainButton.onClick')
            },
            BackButton: {
                isVisible: false,
                show: () => console.log('Mock: BackButton.show'),
                hide: () => console.log('Mock: BackButton.hide'),
                onClick: (callback) => console.log('Mock: BackButton.onClick')
            },
            themeParams: {
                bg_color: '#FFFFFF',
                text_color: '#000000',
                hint_color: '#999999',
                link_color: '#3B82F6',
                button_color: '#3B82F6',
                button_text_color: '#FFFFFF'
            },
            colorScheme: 'light',
            isVersionAtLeast: (version) => true
        };
    }

    /**
     * Автентифікація користувача
     */
    async authenticate() {
        try {
            Utils.showLoader(true);

            // Отримуємо initData від Telegram
            if (!this.tg || !this.tg.initData) {
                throw new Error(window.app.t('errors.telegramDataNotAvailable'));
            }

            // Відправляємо на backend для верифікації
            const response = await api.loginWithTelegram(this.tg.initData);

            if (response.access_token && response.user) {
                this.user = response.user;

                // Зберігаємо дані користувача
                Utils.storage.set('user', this.user);

                // Встановлюємо мову з Telegram або з профілю
                const language = this.user.language || this.tg.initDataUnsafe?.user?.language_code || 'ua';
                Utils.setLanguage(language);

                // Встановлюємо тему
                const theme = this.user.theme || this.tg.colorScheme || 'light';
                Utils.setTheme(theme);

                // Викликаємо подію успішної автентифікації
                window.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));

                Utils.showNotification(`${window.app.t('auth.welcome')}, ${this.user.first_name}!`, 'success');

                return true;
            }

            throw new Error(window.app.t('errors.failedToGetToken'));

        } catch (error) {
            console.error('Authentication error:', error);
            Utils.showNotification(`${window.app.t('notifications.authError')}: ` + error.message, 'error');

            // Викликаємо подію помилки
            window.dispatchEvent(new CustomEvent('auth:error', { detail: error }));

            return false;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Отримати поточного користувача
     */
    async getCurrentUser() {
        // Спочатку перевіряємо кеш
        const cachedUser = Utils.storage.get('user');
        if (cachedUser) {
            this.user = cachedUser;
            return cachedUser;
        }

        // Якщо є токен - запитуємо з API
        if (api.isAuthenticated()) {
            try {
                const user = await api.getCurrentUser();
                this.user = user;
                Utils.storage.set('user', user);
                return user;
            } catch (error) {
                console.error('Failed to get user:', error);
                return null;
            }
        }

        return null;
    }

    /**
     * Перевірка чи користувач авторизований
     */
    isAuthenticated() {
        return api.isAuthenticated() && this.user !== null;
    }

    /**
     * Вийти з системи
     */
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Очищаємо локальні дані
        this.user = null;
        Utils.storage.remove('user');
        Utils.storage.remove('access_token');

        // Викликаємо подію виходу
        window.dispatchEvent(new CustomEvent('auth:logout'));

        // Закриваємо Telegram Web App якщо можливо
        if (this.tg && this.tg.close) {
            this.tg.close();
        } else {
            // Перенаправляємо на головну
            window.location.href = '/';
        }
    }

    /**
     * Оновити профіль користувача
     */
    async updateProfile(data) {
        try {
            const response = await api.put('/users/me', data);
            this.user = response;
            Utils.storage.set('user', this.user);

            // Оновлюємо тему якщо змінилась
            if (data.theme) {
                Utils.setTheme(data.theme);
            }

            // Оновлюємо мову якщо змінилась
            if (data.language) {
                Utils.setLanguage(data.language);
            }

            Utils.showNotification(window.app.t('notifications.profileUpdated'), 'success');
            return this.user;

        } catch (error) {
            console.error('Update profile error:', error);
            Utils.showNotification(window.app.t('notifications.profileUpdateError'), 'error');
            throw error;
        }
    }

    /**
     * Показати/приховати головну кнопку Telegram
     */
    setMainButton(text, callback, show = true) {
        if (!this.tg || !this.tg.MainButton) return;

        this.tg.MainButton.text = text;
        this.tg.MainButton.onClick(callback);

        if (show) {
            this.tg.MainButton.show();
        } else {
            this.tg.MainButton.hide();
        }
    }

    /**
     * Показати/приховати кнопку "Назад"
     */
    setBackButton(callback, show = true) {
        if (!this.tg || !this.tg.BackButton) return;

        this.tg.BackButton.onClick(callback);

        if (show) {
            this.tg.BackButton.show();
        } else {
            this.tg.BackButton.hide();
        }
    }
}


// Створюємо та експортуємо єдиний екземпляр
const auth = new AuthModule();

// Експортуємо для використання в інших модулях
window.auth = auth;

export default auth;