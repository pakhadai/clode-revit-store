// js/services/AuthService.js
import { UserStore } from '../store/UserStore.js';
import { TelegramService } from './TelegramService.js';

export class AuthService {
    constructor() {
        this.userStore = new UserStore();
        this.telegramService = new TelegramService();
        this.user = null;
        this.tg = null;
    }

    async init() {
        this.tg = this.telegramService.init();

        // Try to restore user from storage
        const cachedUser = this.userStore.getUser();
        if (cachedUser) {
            this.user = cachedUser;
        }

        return this.tg;
    }

    async authenticate() {
        try {
            Utils.showLoader(true);

            if (!this.tg || !this.tg.initData) {
                throw new Error(window.app.t('errors.telegramDataNotAvailable'));
            }

            const response = await api.loginWithTelegram(this.tg.initData);

            if (response.access_token && response.user) {
                this.user = response.user;
                this.userStore.saveUser(this.user);

                let language = this.user.language || this.tg.initDataUnsafe?.user?.language_code || 'uk';
                Utils.setLanguage(language);

                const theme = this.user.theme || this.tg.colorScheme || 'light';
                Utils.setTheme(theme);

                window.dispatchEvent(new CustomEvent('auth:success', { detail: this.user }));
                Utils.showNotification(`${window.app.t('auth.welcome')}, ${this.user.first_name}!`, 'success');

                setTimeout(() => {
                    if (window.onboarding) {
                        window.onboarding.start();
                    }
                }, 500);

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

    isAuthenticated() {
        return api.isAuthenticated() && this.user !== null;
    }

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
            window.location.href = '/';
        }
    }

    async updateProfile(data) {
        try {
            const response = await api.put('/auth/me', data);
            this.user = response;
            this.userStore.saveUser(this.user);

            if (data.theme) {
                Utils.setTheme(data.theme);
            }

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

    // User state getters
    getBalance() { return this.user?.balance || 0; }
    getVipLevel() { return this.user?.vip_level || 0; }
    isCreator() { return this.user?.is_creator || false; }
    isAdmin() { return this.user?.is_admin || false; }

    // Delegate to Telegram service
    getTelegramUser() { return this.telegramService.getTelegramUser(); }
    getTelegramTheme() { return this.telegramService.getTelegramTheme(); }
    showConfirm(message, callback) { return this.telegramService.showConfirm(message, callback); }
    showAlert(message) { return this.telegramService.showAlert(message); }
    openLink(url) { return this.telegramService.openLink(url); }
    hapticFeedback(type, style) { return this.telegramService.hapticFeedback(type, style); }
    showInviteFriend() { return this.telegramService.showInviteFriend(); }
    setMainButton(text, callback, show) { return this.telegramService.setMainButton(text, callback, show); }
    setBackButton(callback, show) { return this.telegramService.setBackButton(callback, show); }
}