// js/services/TelegramService.js
export class TelegramService {
    constructor() {
        this.tg = null;
    }

    init() {
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;

            this.tg.expand();
            this.tg.setHeaderColor('#1F2937');
            this.tg.setBackgroundColor('#F3F4F6');
            this.tg.ready();

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

            if (window.location.hostname === 'localhost') {
                this.setupMockData();
            }
        }

        return this.tg;
    }

    setupMockData() {
        console.log('Використовуємо мокові дані для тестування');

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

        return this.tg;
    }

    getTelegramUser() {
        return this.tg?.initDataUnsafe?.user || null;
    }

    getTelegramTheme() {
        return this.tg?.colorScheme || 'light';
    }

    showConfirm(message, callback) {
        if (this.tg && this.tg.showConfirm) {
            this.tg.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            callback(result);
        }
    }

    showAlert(message) {
        if (this.tg && this.tg.showAlert) {
            this.tg.showAlert(message);
        } else {
            alert(message);
        }
    }

    openLink(url) {
        if (this.tg && this.tg.openLink) {
            this.tg.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

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

    showInviteFriend() {
        if (this.tg && this.tg.showInviteFriend) {
            this.tg.showInviteFriend();
        } else {
            Utils.showNotification('Ця функція доступна лише в Telegram', 'warning');
        }
    }

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